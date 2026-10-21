
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiClipboard,
  FiArrowRight,
  FiMapPin,
  FiShield,
  FiTool,
} from "react-icons/fi";
import { fetchIssues } from "../../features/issues/issuesSlice";
import "./AdminDashboard.css";

const reviewStatuses = [
  "Submitted",
  "Under Review",
  "Needs More Information",
  "Outside Service Area",
  "Suspicious—Verification Required",
];

const activeStatuses = [
  "Assigned",
  "Accepted",
  "In Progress",
  "External Follow-up",
  "Awaiting Resolution Verification",
  "Pending Resolution Verification",
];

const rejectedStatuses = [
  "Rejected—False Report",
  "Rejected - False Report",
  "Duplicate",
];

function AdminDashboard() {
  const dispatch = useDispatch();

  const { items = [], loading, error } = useSelector(
    (state) => state.issues
  );

  useEffect(() => {
    dispatch(fetchIssues());
  }, [dispatch]);

  const pendingIssues = useMemo(
    () => items.filter((issue) => reviewStatuses.includes(issue.status)),
    [items]
  );

  const approvedIssues = useMemo(
    () =>
      items.filter(
        (issue) => issue.status === "Approved for Assignment"
      ),
    [items]
  );

  const activeIssues = useMemo(
    () => items.filter((issue) => activeStatuses.includes(issue.status)),
    [items]
  );

  const resolvedIssues = useMemo(
    () => items.filter((issue) => issue.status === "Resolved"),
    [items]
  );

  const recentIssues = useMemo(
    () =>
      [...items]
        .sort((a, b) => {
          const dateA = new Date(
            a.reportedAt || a.createdAt || 0
          ).getTime();

          const dateB = new Date(
            b.reportedAt || b.createdAt || 0
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5),
    [items]
  );

  const stats = [
    {
      title: "Total Issues",
      value: items.length,
      icon: <FiClipboard />,
      color: "blue",
      description: "All reported issues",
    },
    {
      title: "Pending Review",
      value: pendingIssues.length,
      icon: <FiClock />,
      color: "orange",
      description: "Awaiting admin review",
    },
    {
      title: "Active Jobs",
      value: activeIssues.length,
      icon: <FiActivity />,
      color: "purple",
      description: "Repairs and external follow-ups",
    },
    {
      title: "Resolved Issues",
      value: resolvedIssues.length,
      icon: <FiCheckCircle />,
      color: "green",
      description: "Verified by an administrator",
    },
  ];

  return (
    <main className="admin-dashboard">
      <div className="admin-dashboard-container">
        <section className="admin-welcome">
          <div className="admin-welcome-icon">
            <FiShield />
          </div>

          <div className="admin-welcome-content">
            <p className="admin-eyebrow">ADMINISTRATION</p>
            <h1>Admin Dashboard</h1>
            <p>
              Review community issues, coordinate maintenance,
              and monitor neighbourhood improvements.
            </p>
          </div>
        </section>

        <section className="admin-page-heading">
          <div>
            <h2>Overview</h2>
            <p>Monitor the current status of reported issues.</p>
          </div>

          <Link to="/admin/issues" className="admin-outline-button">
            Review Issues <FiArrowRight />
          </Link>
        </section>

        {error && (
          <div className="admin-message admin-error" role="alert">
            Unable to load issues. Please check the backend connection.
          </div>
        )}

        {loading && (
          <p className="admin-loading">
            Loading dashboard information...
          </p>
        )}

        <section className="admin-stats-grid">
          {stats.map((stat) => (
            <article className="admin-stat-card" key={stat.title}>
              <div className={`admin-stat-icon ${stat.color}`}>
                {stat.icon}
              </div>

              <div className="admin-stat-info">
                <p>{stat.title}</p>
                <h3>{loading ? "—" : stat.value}</h3>
                <span>{stat.description}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="admin-quick-actions">
          <div className="admin-section-heading">
            <div>
              <h2>Administration</h2>
              <p>Choose a task to continue.</p>
            </div>
          </div>

          <div className="admin-action-grid">
            <Link to="/admin/issues" className="admin-action-card">
              <span className="admin-action-icon orange">
                <FiAlertCircle />
              </span>
              <div>
                <h3>Issue Verification</h3>
                <p>Review new reports and check their validity.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link to="/admin/teams" className="admin-action-card">
              <span className="admin-action-icon blue">
                <FiActivity />
              </span>
              <div>
                <h3>Team Management</h3>
                <p>Manage maintenance teams and their details.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link to="/admin/assignments" className="admin-action-card">
              <span className="admin-action-icon green">
                <FiTool />
              </span>
              <div>
                <h3>Assign Maintenance Jobs</h3>
                <p>Assign approved issues to active maintenance teams.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link to="/admin/resolutions" className="admin-action-card">
              <span className="admin-action-icon green">
                <FiCheckCircle />
              </span>
              <div>
                <h3>Resolution Verification</h3>
                <p>Review submitted repairs before closing issues.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link
              to="/admin/external-followups"
              className="admin-action-card"
            >
              <span className="admin-action-icon purple">
                <FiMapPin />
              </span>
              <div>
                <h3>External Follow-ups</h3>
                <p>Track issues referred to outside organisations.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link
              to="/admin/organizations"
              className="admin-action-card"
            >
              <span className="admin-action-icon blue">
                <FiClipboard />
              </span>
              <div>
                <h3>Organisation Management</h3>
                <p>
                  Manage external organisations and contact information.
                </p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>

            <Link to="/admin/profile" className="admin-action-card">
              <span className="admin-action-icon green">
                <FiShield />
              </span>
              <div>
                <h3>Administrator Profile</h3>
                <p>View administrator information and shortcuts.</p>
              </div>
              <FiArrowRight className="admin-action-arrow" />
            </Link>
          </div>
        </section>

        <section className="admin-recent-section">
          <div className="admin-section-heading">
            <div>
              <h2>Recent Issues</h2>
              <p>Latest reports submitted by residents.</p>
            </div>

            <Link to="/explore" className="admin-text-link">
              View public issues <FiArrowRight />
            </Link>
          </div>

          {loading ? (
            <div className="admin-empty-state">
              Loading recent issues...
            </div>
          ) : error ? (
            <div className="admin-empty-state">
              Unable to load recent issues.
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="admin-empty-state">
              <FiClipboard />
              <h3>No issues reported yet</h3>
              <p>New community reports will appear here.</p>
            </div>
          ) : (
            <div className="admin-issues-list">
              {recentIssues.map((issue) => (
                <Link
                  to={`/issues/${issue.id}`}
                  className="admin-issue-row"
                  key={issue.id}
                >
                  <div className="admin-issue-symbol">
                    <FiAlertCircle />
                  </div>

                  <div className="admin-issue-details">
                    <h3>{issue.title || "Untitled issue"}</h3>
                    <p>
                      <FiMapPin />{" "}
                      {issue.location || "Location not provided"}
                    </p>
                  </div>

                  <span
                    className={`admin-status ${
                      issue.status === "Resolved"
                        ? "resolved"
                        : reviewStatuses.includes(issue.status)
                          ? "pending"
                          : "active"
                    }`}
                  >
                    {issue.status || "Under Review"}
                  </span>

                  <FiArrowRight className="admin-issue-arrow" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="admin-pending-summary">
          <div>
            <span className="admin-pending-icon">
              <FiClock />
            </span>

            <div>
              <h3>Issues awaiting verification</h3>
              <p>
                Review reports before assigning maintenance work.
              </p>
            </div>
          </div>

          <strong>{loading ? "—" : pendingIssues.length}</strong>
        </section>

        {approvedIssues.length > 0 && (
          <section className="admin-pending-summary">
            <div>
              <span className="admin-pending-icon">
                <FiTool />
              </span>

              <div>
                <h3>Approved issues awaiting assignment</h3>
                <p>
                  These reports have passed review and need a maintenance
                  team assigned.
                </p>
              </div>
            </div>

            <strong>{loading ? "—" : approvedIssues.length}</strong>
          </section>
        )}

        {rejectedStatuses.length > 0 && (
          <p className="admin-loading">
            Closed reports are included in the total issue count.
          </p>
        )}
      </div>
    </main>
  );
}

export default AdminDashboard;
