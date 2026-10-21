
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiSearch,
  FiTool,
  FiMapPin,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
} from "react-icons/fi";
import api from "../../services/api";
import "./MaintenanceHistory.css";

const HISTORY_STATUSES = [
  "Assigned",
  "Accepted",
  "In Progress",
  "Awaiting Resolution Verification",
  "Pending Resolution Verification",
  "Resolved",
  "Reopened",
];

const FINAL_STATUSES = ["Rejected—False Report", "Rejected - False Report", "Duplicate"];

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getLatestActivityDate(issue) {
  const dates = [
    issue.reopenedAt,
    issue.resolutionVerifiedAt,
    issue.resolvedAt,
    issue.submittedForVerificationAt,
    issue.completedAt,
    issue.lastProgressAt,
    issue.startedAt,
    issue.acceptedAt,
    issue.assignedAt,
    issue.createdAt,
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  return dates.length ? Math.max(...dates) : 0;
}

function getStatusClass(status) {
  if (status === "Resolved") return "mh-status-resolved";

  if (["In Progress", "Accepted", "Assigned"].includes(status)) {
    return "mh-status-active";
  }

  if (
    [
      "Awaiting Resolution Verification",
      "Pending Resolution Verification",
      "Reopened",
    ].includes(status)
  ) {
    return "mh-status-pending";
  }

  return "mh-status-default";
}

function MaintenanceHistory() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [teamId, setTeamId] = useState(() =>
    localStorage.getItem("civicPulseTeamId")
  );

  async function loadHistory(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/issues");

      setIssues(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError("Unable to load work history. Check the backend connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const syncTeam = () => {
      setTeamId(localStorage.getItem("civicPulseTeamId"));
    };

    window.addEventListener("storage", syncTeam);

    return () => window.removeEventListener("storage", syncTeam);
  }, []);

  const history = useMemo(() => {
    const query = search.trim().toLowerCase();

    return issues
      .filter((issue) => {
        const hasMaintenanceActivity =
          HISTORY_STATUSES.includes(issue.status) ||
          FINAL_STATUSES.includes(issue.status) ||
          Boolean(issue.assignedTeamId) ||
          Boolean(issue.acceptedAt) ||
          Boolean(issue.startedAt) ||
          Boolean(issue.submittedForVerificationAt) ||
          Boolean(issue.resolvedAt) ||
          Boolean(issue.resolutionVerifiedAt) ||
          Boolean(issue.reopenedAt);

        if (!hasMaintenanceActivity) return false;

        // In the demo, a selected team sees its own assigned records.
        // Without a selected team, the history remains available for preview.
        if (
          teamId &&
          String(issue.assignedTeamId) !== String(teamId)
        ) {
          return false;
        }

        const searchableText = [
          issue.id,
          issue.title,
          issue.location,
          issue.category,
          issue.assignedTeamName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !query || searchableText.includes(query);

        const matchesStatus =
          statusFilter === "All" || issue.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) => getLatestActivityDate(b) - getLatestActivityDate(a)
      );
  }, [issues, search, statusFilter, teamId]);

  const resolvedCount = history.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const activeCount = history.filter((issue) =>
    ["Accepted", "In Progress"].includes(issue.status)
  ).length;

  const pendingCount = history.filter((issue) =>
    [
      "Awaiting Resolution Verification",
      "Pending Resolution Verification",
    ].includes(issue.status)
  ).length;

  const getCompletedDate = (issue) =>
    issue.resolutionVerifiedAt ||
    issue.resolvedAt ||
    issue.completedAt ||
    issue.submittedForVerificationAt;

  return (
    <main className="mh-page">
      <div className="mh-container">
        <Link to="/maintenance" className="mh-back">
          <FiArrowLeft />
          Maintenance Dashboard
        </Link>

        <header className="mh-header">
          <div>
            <span className="mh-eyebrow">
              <FiTool />
              MAINTENANCE WORKSPACE
            </span>
            <h1>Work History</h1>
            <p>
              Review assigned repairs, track progress, and revisit completed
              work and jobs returned for further repairs.
            </p>
          </div>

          <button
            type="button"
            className="mh-refresh-button"
            onClick={() => loadHistory(true)}
            disabled={loading || refreshing}
          >
            <FiRefreshCw className={refreshing ? "mh-spinning" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <div className="mh-alert" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        <section className="mh-stats">
          <article className="mh-stat-card">
            <span className="mh-stat-icon mh-icon-total">
              <FiTool />
            </span>
            <div>
              <span>Total Records</span>
              <strong>{history.length}</strong>
            </div>
          </article>

          <article className="mh-stat-card">
            <span className="mh-stat-icon mh-icon-active">
              <FiClock />
            </span>
            <div>
              <span>Active Work</span>
              <strong>{activeCount}</strong>
            </div>
          </article>

          <article className="mh-stat-card">
            <span className="mh-stat-icon mh-icon-pending">
              <FiClock />
            </span>
            <div>
              <span>Awaiting Verification</span>
              <strong>{pendingCount}</strong>
            </div>
          </article>

          <article className="mh-stat-card">
            <span className="mh-stat-icon mh-icon-resolved">
              <FiCheckCircle />
            </span>
            <div>
              <span>Resolved</span>
              <strong>{resolvedCount}</strong>
            </div>
          </article>
        </section>

        <section className="mh-panel">
          <div className="mh-panel-heading">
            <div>
              <h2>Maintenance Records</h2>
              <p>Search jobs and filter them by their current status.</p>
            </div>

            <span className="mh-record-count">
              {history.length} {history.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="mh-filters">
            <div className="mh-search">
              <FiSearch />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, location, category or ID"
                aria-label="Search maintenance history"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter maintenance history by status"
            >
              <option value="All">All statuses</option>
              {HISTORY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
              <option value="Reopened">Reopened</option>
              <option value="Duplicate">Duplicate</option>
              <option value="Rejected—False Report">
                Rejected — False Report
              </option>
              <option value="Rejected - False Report">
                Rejected - False Report
              </option>
            </select>
          </div>

          {loading ? (
            <div className="mh-empty">
              Loading maintenance records...
            </div>
          ) : history.length === 0 ? (
            <div className="mh-empty">
              <span className="mh-empty-icon">
                <FiTool />
              </span>
              <h3>No maintenance records found</h3>
              <p>
                Records appear here when jobs are assigned or maintenance
                activity begins. Try changing your search or status filter.
              </p>
              <Link to="/maintenance" className="mh-primary-link">
                Return to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mh-record-list">
              {history.map((issue) => (
                <article className="mh-record" key={issue.id}>
                  <div className="mh-record-main">
                    <div className="mh-record-title-row">
                      <h3>{issue.title || "Untitled issue"}</h3>
                      <span
                        className={`mh-status ${getStatusClass(issue.status)}`}
                      >
                        {issue.status || "Unknown status"}
                      </span>
                    </div>

                    <p className="mh-record-description">
                      {issue.description || "No description provided."}
                    </p>

                    <div className="mh-record-meta">
                      <span>Issue #{issue.id}</span>
                      <span>{issue.category || "Uncategorized"}</span>
                      <span>
                        <FiMapPin />
                        {issue.location || "Location not provided"}
                      </span>
                    </div>

                    <div className="mh-record-dates">
                      <span>
                        <strong>Assigned:</strong>{" "}
                        {formatDate(issue.assignedAt)}
                      </span>
                      <span>
                        <strong>Accepted:</strong>{" "}
                        {formatDate(issue.acceptedAt)}
                      </span>
                      <span>
                        <strong>Started:</strong>{" "}
                        {formatDate(issue.startedAt)}
                      </span>
                      <span>
                        <strong>Submitted / completed:</strong>{" "}
                        {formatDate(getCompletedDate(issue))}
                      </span>
                      {issue.resolutionVerifiedAt && (
                        <span>
                          <strong>Verified:</strong>{" "}
                          {formatDate(issue.resolutionVerifiedAt)}
                        </span>
                      )}
                      {issue.reopenedAt && (
                        <span>
                          <strong>Reopened:</strong>{" "}
                          {formatDate(issue.reopenedAt)}
                        </span>
                      )}
                    </div>

                    {issue.completionNotes && (
                      <div className="mh-completion-notes">
                        <strong>Completion notes</strong>
                        <p>{issue.completionNotes}</p>
                      </div>
                    )}

                    {issue.reopenReason && (
                      <div className="mh-reopen-reason">
                        <strong>Reason for further work</strong>
                        <p>{issue.reopenReason}</p>
                      </div>
                    )}

                    {issue.assignedTeamName && (
                      <p className="mh-team-name">
                        <FiTool />
                        {issue.assignedTeamName}
                      </p>
                    )}
                  </div>

                  <div className="mh-record-action">
                    <Link
                      to={`/maintenance/jobs/${issue.id}`}
                      className="mh-view-link"
                    >
                      <FiEye />
                      View Job
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <Link to="/maintenance" className="mh-bottom-link">
          <FiArrowLeft />
          Back to Maintenance Dashboard
        </Link>
      </div>
    </main>
  );
}

export default MaintenanceHistory;
