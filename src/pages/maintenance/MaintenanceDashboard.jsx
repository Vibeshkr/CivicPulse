
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiTool,
  FiUsers,
} from "react-icons/fi";

import {
  getIssues,
  getMaintenanceTeams,
} from "../../services/civicPulseService";

import "./MaintenanceDashboard.css";

const isFinalStatus = (status) =>
  [
    "Resolved",
    "Rejected—False Report",
    "Rejected - False Report",
    "Duplicate",
  ].includes(status);

const formatDate = (dateValue) => {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN");
};

function MaintenanceDashboard() {
  // Identify the maintenance team from the logged-in account.
  const user = useSelector((state) => state.auth?.user);
  const teamId = user?.maintenanceTeamId;

  const [jobs, setJobs] = useState([]);
  const [team, setTeam] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (
        teamId === undefined ||
        teamId === null ||
        String(teamId).trim() === ""
      ) {
        setJobs([]);
        setTeam(null);
        return;
      }

      const [allIssues, allTeams] = await Promise.all([
        getIssues(),
        getMaintenanceTeams(),
      ]);

      if (!Array.isArray(allIssues) || !Array.isArray(allTeams)) {
        throw new Error("The backend returned invalid maintenance data.");
      }

      const matchedTeam = allTeams.find(
        (item) => String(item.id) === String(teamId)
      );

      if (!matchedTeam) {
        setJobs([]);
        setTeam(null);
        setError(
          "Your maintenance team could not be found. Please contact the admin."
        );
        return;
      }

      if (
        matchedTeam.active === false ||
        matchedTeam.active === "false"
      ) {
        setJobs([]);
        setTeam(matchedTeam);
        setError(
          "This maintenance team is inactive. Please contact the admin."
        );
        return;
      }

      setTeam(matchedTeam);

      // Show only issues assigned to this account's maintenance team.
      const assignedJobs = allIssues.filter(
        (issue) =>
          issue.assignedTeamId != null &&
          String(issue.assignedTeamId) === String(teamId)
      );

      setJobs(assignedJobs);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load assigned jobs. Check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const searchableValues = [
        job.title,
        job.category,
        job.location,
        job.priority,
        job.id,
      ];

      const matchesSearch =
        query === "" ||
        searchableValues
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesStatus =
        statusFilter === "All" || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: jobs.filter((job) => !isFinalStatus(job.status)).length,
      assigned: jobs.filter((job) => job.status === "Assigned").length,
      inProgress: jobs.filter(
        (job) =>
          job.status === "Accepted" || job.status === "In Progress"
      ).length,
      awaitingVerification: jobs.filter(
        (job) =>
          job.status === "Awaiting Resolution Verification" ||
          job.status === "Pending Resolution Verification"
      ).length,
      resolved: jobs.filter((job) => job.status === "Resolved").length,
    }),
    [jobs]
  );

  const statusClass = (status) =>
    String(status || "Assigned").toLowerCase().replaceAll(" ", "-");

  return (
    <main className="maintenance-dashboard-page">
      <div className="maintenance-dashboard-container">
        <header className="maintenance-dashboard-header">
          <div>
            <p className="maintenance-eyebrow">
              MAINTENANCE WORKSPACE
            </p>

            <h1>Maintenance Dashboard</h1>

            <p>
              Manage assigned repairs and keep residents informed.
            </p>

            <div className="md-dashboard-links">
              <Link
                to="/maintenance/history"
                className="md-history-link"
              >
                View Work History <FiArrowRight />
              </Link>

              <Link
                to="/maintenance/profile"
                className="md-history-link"
              >
                Team Profile <FiArrowRight />
              </Link>
            </div>
          </div>

          <div className="maintenance-header-actions">
            <button
              type="button"
              className="maintenance-refresh-button"
              onClick={loadJobs}
              disabled={loading}
            >
              <FiRefreshCw
                className={loading ? "md-spinning" : ""}
              />
              Refresh
            </button>

            <div className="maintenance-header-icon">
              <FiTool />
            </div>
          </div>
        </header>

        {error && (
          <div className="maintenance-alert error" role="alert">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {!teamId && (
          <div className="maintenance-alert" role="status">
            <FiAlertCircle />
            This login is not linked to a maintenance team. Please log
            in using the maintenance team's account or contact the admin.
          </div>
        )}

        {team && (
          <section className="maintenance-team-selector">
            <div>
              <label>
                <FiUsers /> Logged-in maintenance team
              </label>
              <p>
                <strong>{team.name}</strong>
                {" — "}
                {team.category || "General maintenance"}
              </p>
              <p>
                Jobs shown here are assigned to your team account.
              </p>
            </div>
          </section>
        )}

        <section className="maintenance-welcome">
          <div>
            <h2>Your repair work, in one place.</h2>
            <p>
              Review each assigned issue, update its progress, and submit
              completed work for admin verification.
            </p>
          </div>

          <FiActivity />
        </section>

        <section className="maintenance-stats">
          <article>
            <span>Unfinished assigned jobs</span>
            <strong>{stats.total}</strong>
          </article>

          <article>
            <span>Assigned</span>
            <strong>{stats.assigned}</strong>
          </article>

          <article>
            <span>In progress</span>
            <strong>{stats.inProgress}</strong>
          </article>

          <article>
            <span>Awaiting verification</span>
            <strong>{stats.awaitingVerification}</strong>
          </article>
        </section>

        <section className="maintenance-job-section">
          <div className="maintenance-job-heading">
            <div>
              <h2>Assigned Repair Jobs</h2>
              <p>
                Jobs assigned to your logged-in maintenance team.
              </p>
            </div>

            <span>{filteredJobs.length} jobs</span>
          </div>

          <div className="maintenance-job-toolbar">
            <div className="maintenance-search">
              <FiSearch />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search jobs or locations..."
                aria-label="Search jobs or locations"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter jobs by status"
            >
              <option value="All">All statuses</option>
              <option value="Assigned">Assigned</option>
              <option value="Accepted">Accepted</option>
              <option value="In Progress">In Progress</option>
              <option value="Awaiting Resolution Verification">
                Awaiting Verification
              </option>
              <option value="Pending Resolution Verification">
                Pending Verification
              </option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {loading ? (
            <div className="maintenance-empty">
              <FiRefreshCw className="md-spinning" />
              <p>Loading repair jobs...</p>
            </div>
          ) : error ? (
            <div className="maintenance-empty">
              <FiAlertCircle />
              <h3>Could not load jobs</h3>
              <p>
                Check the team account and backend connection, then
                refresh the page.
              </p>
            </div>
          ) : !teamId || !team ? (
            <div className="maintenance-empty">
              <FiUsers />
              <h3>Maintenance team account required</h3>
              <p>
                Sign in using an account linked to a maintenance team.
              </p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="maintenance-empty">
              <FiTool />
              <h3>No assigned jobs to display</h3>
              <p>
                Jobs assigned to {team.name} will appear here after the
                administrator approves and assigns a neighbourhood issue.
              </p>

              <Link
                to="/explore"
                className="maintenance-explore-link"
              >
                Browse public issues <FiArrowRight />
              </Link>
            </div>
          ) : (
            <div className="maintenance-job-list">
              {filteredJobs.map((job) => (
                <article
                  className="maintenance-job-card"
                  key={job.id}
                >
                  <div className="maintenance-job-icon">
                    <FiTool />
                  </div>

                  <div className="maintenance-job-content">
                    <div className="maintenance-job-title-row">
                      <h3>{job.title || "Untitled issue"}</h3>

                      <span
                        className={`maintenance-status ${statusClass(
                          job.status
                        )}`}
                      >
                        {job.status || "Assigned"}
                      </span>
                    </div>

                    <p className="maintenance-job-category">
                      {job.category || "General maintenance"}
                    </p>

                    <p className="maintenance-job-location">
                      <FiMapPin />
                      {job.location || "Location not provided"}
                    </p>

                    <div className="maintenance-job-meta">
                      <span>
                        <FiAlertCircle />
                        Priority: {job.priority || "Normal"}
                      </span>

                      <span>
                        <FiClock />
                        Reported:{" "}
                        {formatDate(job.reportedAt || job.createdAt)}
                      </span>
                    </div>

                    {job.description && (
                      <p className="maintenance-job-description">
                        {job.description}
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/maintenance/jobs/${job.id}`}
                    className="maintenance-job-open"
                  >
                    Open Job <FiArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="maintenance-guidance">
          <FiCheckCircle />

          <div>
            <h3>Repair workflow</h3>
            <p>
              Accept the assigned job, record progress, add completion
              notes and evidence, then submit it for admin verification.
              Only the admin can confirm final resolution.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default MaintenanceDashboard;
