
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiClock,
  FiRefreshCw,
  FiTool,
  FiMapPin,
  FiAlertTriangle,
} from "react-icons/fi";

import {
  getIssues,
  getMaintenanceTeams,
} from "../../services/civicPulseService";

import "./MaintenancePriorityJobs.css";

const isFinalStatus = (status) =>
  [
    "Resolved",
    "Rejected—False Report",
    "Rejected - False Report",
    "Duplicate",
  ].includes(String(status || "").trim());

const getPriority = (job) =>
  String(job.priority || job.suggestedPriority || "")
    .trim()
    .toLowerCase();

const isHighPriority = (job) =>
  ["high", "urgent", "critical", "emergency"].includes(getPriority(job));

const isReopened = (job) => {
  const status = String(job.status || "").toLowerCase();

  return (
    status.includes("reopen") ||
    Boolean(job.reopenReason) ||
    Boolean(job.reopenedAt)
  );
};

const getDueDate = (job) =>
  job.dueDate ||
  job.deadline ||
  job.dueAt ||
  job.expectedCompletionDate ||
  null;

const isOverdue = (job) => {
  if (isFinalStatus(job.status)) return false;

  const dueDate = getDueDate(job);
  if (!dueDate) return false;

  const parsedDate = new Date(dueDate);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getTime() < Date.now()
  );
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN");
};

const getReasons = (job) => {
  const reasons = [];

  if (isHighPriority(job)) {
    reasons.push("High-priority issue");
  }

  if (isReopened(job)) {
    reasons.push("Repair reopened by admin");
  }

  if (isOverdue(job)) {
    reasons.push("Past due date");
  }

  return reasons;
};

function MaintenancePriorityJobs() {
  const user = useSelector((state) => state.auth?.user);
  const teamId = user?.maintenanceTeamId;

  const [jobs, setJobs] = useState([]);
  const [team, setTeam] = useState(null);
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
        throw new Error("The backend returned invalid job data.");
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
          "Unable to load priority jobs. Check the backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const priorityJobs = useMemo(() => {
    return jobs
      .filter((job) => !isFinalStatus(job.status))
      .filter(
        (job) =>
          isHighPriority(job) ||
          isReopened(job) ||
          isOverdue(job)
      )
      .sort((a, b) => {
        const score = (job) => {
          let value = 0;

          if (isReopened(job)) value += 4;
          if (isOverdue(job)) value += 3;
          if (isHighPriority(job)) value += 2;

          return value;
        };

        return score(b) - score(a);
      });
  }, [jobs]);

  return (
    <main className="maintenance-priority-page">
      <div className="maintenance-priority-container">
        <Link
          to="/maintenance"
          className="maintenance-priority-back"
        >
          <FiArrowLeft /> Back to Maintenance Dashboard
        </Link>

        <header className="maintenance-priority-header">
          <div>
            <p className="maintenance-priority-eyebrow">
              MAINTENANCE WORKSPACE
            </p>

            <h1>
              <FiAlertTriangle />
              Priority Jobs
            </h1>

            <p>
              Focus on urgent issues, reopened repairs, and overdue work
              assigned to your team.
            </p>

            {team && (
              <p className="maintenance-priority-team">
                Team: <strong>{team.name}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            className="maintenance-priority-refresh"
            onClick={loadJobs}
            disabled={loading}
          >
            <FiRefreshCw
              className={loading ? "mp-spinning" : ""}
            />
            Refresh
          </button>
        </header>

        <section className="maintenance-priority-summary">
          <div>
            <span>Jobs requiring attention</span>
            <strong>{priorityJobs.length}</strong>
          </div>

          <p>
            Only unfinished jobs with a high priority, a reopened repair,
            or an overdue due date appear here.
          </p>
        </section>

        {error && (
          <div className="maintenance-priority-alert" role="alert">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {loading ? (
          <div className="maintenance-priority-empty">
            <FiRefreshCw className="mp-spinning" />
            <p>Loading your priority jobs...</p>
          </div>
        ) : error ? (
          <div className="maintenance-priority-empty">
            <FiAlertCircle />
            <h2>Unable to load priority jobs</h2>
            <p>Check the backend connection and try refreshing.</p>
          </div>
        ) : !teamId || !team ? (
          <div className="maintenance-priority-empty">
            <FiTool />
            <h2>Maintenance team account required</h2>
            <p>
              Sign in with an account linked to an active maintenance team.
            </p>
          </div>
        ) : priorityJobs.length === 0 ? (
          <div className="maintenance-priority-empty">
            <FiTool />
            <h2>No high-priority jobs right now</h2>
            <p>
              Your team has no unfinished jobs currently matching the
              priority rules. New matching jobs will appear here after
              you refresh.
            </p>

            <Link
              to="/maintenance"
              className="maintenance-priority-action"
            >
              View all assigned jobs <FiArrowRight />
            </Link>
          </div>
        ) : (
          <section className="maintenance-priority-list">
            {priorityJobs.map((job) => {
              const reasons = getReasons(job);

              return (
                <article
                  className="maintenance-priority-card"
                  key={job.id}
                >
                  <div className="maintenance-priority-icon">
                    <FiAlertTriangle />
                  </div>

                  <div className="maintenance-priority-content">
                    <div className="maintenance-priority-title-row">
                      <h2>{job.title || "Untitled issue"}</h2>

                      <span className="maintenance-priority-badge">
                        Action needed
                      </span>
                    </div>

                    <p className="maintenance-priority-category">
                      {job.category || "General maintenance"}
                    </p>

                    <div className="maintenance-priority-reasons">
                      {reasons.map((reason) => (
                        <span key={reason}>{reason}</span>
                      ))}
                    </div>

                    <p className="maintenance-priority-location">
                      <FiMapPin />
                      {job.location || "Location not provided"}
                    </p>

                    <div className="maintenance-priority-meta">
                      <span>
                        <FiTool />
                        Status: {job.status || "Assigned"}
                      </span>

                      <span>
                        <FiClock />
                        Due: {getDueDate(job)
                          ? formatDate(getDueDate(job))
                          : "Not specified"}
                      </span>
                    </div>

                    {job.description && (
                      <p className="maintenance-priority-description">
                        {job.description}
                      </p>
                    )}

                    {job.reopenReason && (
                      <p className="maintenance-priority-reopen-reason">
                        <strong>Admin feedback:</strong>{" "}
                        {job.reopenReason}
                      </p>
                    )}

                    <Link
                      to={`/maintenance/jobs/${job.id}`}
                      className="maintenance-priority-action"
                    >
                      Open Job <FiArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

export default MaintenancePriorityJobs;
