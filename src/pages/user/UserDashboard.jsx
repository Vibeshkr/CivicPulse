
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiPlusCircle,
  FiArrowRight,
  FiMapPin,
  FiActivity,
  FiUser,
} from "react-icons/fi";

import { fetchIssues } from "../../features/issues/issuesSlice";
import "./UserDashboard.css";

function UserDashboard() {
  const dispatch = useDispatch();

  const {
    items = [],
    loading,
    error,
  } = useSelector((state) => state.issues);

  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchIssues());
  }, [dispatch]);

  // Display only reports created by the logged-in resident.
  const myReports = useMemo(() => {
    if (!user?.id) return [];

    return items.filter(
      (issue) => String(issue.userId) === String(user.id)
    );
  }, [items, user?.id]);

  const recentReports = useMemo(() => {
    return [...myReports].sort((a, b) => {
      const dateA = new Date(a.reportedAt || 0).getTime();
      const dateB = new Date(b.reportedAt || 0).getTime();

      return dateB - dateA;
    });
  }, [myReports]);

  const resolvedCount = myReports.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const closedStatuses = [
    "Resolved",
    "Rejected—False Report",
    "Rejected - False Report",
    "Duplicate",
  ];

  const pendingCount = myReports.filter(
    (issue) => !closedStatuses.includes(issue.status)
  ).length;

  const stats = [
    {
      label: "My Reports",
      value: myReports.length,
      icon: <FiAlertCircle />,
      color: "green",
    },
    {
      label: "In Progress / Pending",
      value: pendingCount,
      icon: <FiClock />,
      color: "orange",
    },
    {
      label: "Resolved",
      value: resolvedCount,
      icon: <FiCheckCircle />,
      color: "blue",
    },
  ];

  return (
    <main className="resident-dashboard">
      <section className="resident-welcome">
        <div>
          <span className="resident-eyebrow">
            RESIDENT PORTAL
          </span>

          <h1>
            {user?.name
              ? `Welcome, ${user.name}.`
              : "Your neighbourhood, your voice."}
          </h1>

          <p>
            Follow reported problems and help make your neighbourhood better.
          </p>
        </div>

        <Link to="/report" className="resident-primary-btn">
          <FiPlusCircle /> Report an Issue
        </Link>
      </section>

      <section className="resident-stat-grid">
        {stats.map((stat) => (
          <article className="resident-stat-card" key={stat.label}>
            <div className={`resident-stat-icon ${stat.color}`}>
              {stat.icon}
            </div>

            <div>
              <p>{stat.label}</p>
              <h2>{loading ? "—" : stat.value}</h2>
            </div>
          </article>
        ))}
      </section>

      <section className="resident-dashboard-section">
        <div className="resident-section-heading">
          <div>
            <h2>Recent Issues</h2>
            <p>
              Recently reported problems from your own submissions.
            </p>
          </div>

          <Link to="/my-reports" className="resident-view-link">
            View reports <FiArrowRight />
          </Link>
        </div>

        {loading ? (
          <p className="resident-feedback">
            Loading your reports...
          </p>
        ) : error ? (
          <p className="resident-feedback resident-error">
            Unable to load issues. Please try again later.
          </p>
        ) : myReports.length === 0 ? (
          <div className="resident-empty-state">
            <FiAlertCircle />
            <h3>No reports yet</h3>
            <p>
              Your submitted reports will appear here after you report a
              neighbourhood issue.
            </p>

            <Link to="/report" className="resident-primary-btn">
              Report an Issue
            </Link>
          </div>
        ) : (
          <div className="resident-report-list">
            {recentReports.slice(0, 4).map((issue) => (
              <article className="resident-report-card" key={issue.id}>
                <div className="resident-report-symbol">
                  <FiMapPin />
                </div>

                <div className="resident-report-content">
                  <h3>{issue.title || "Untitled issue"}</h3>

                  <p>
                    {issue.category || "General"} ·{" "}
                    {issue.location || "Location not provided"}
                  </p>

                  <span className="resident-report-date">
                    {issue.reportedAt
                      ? new Date(issue.reportedAt).toLocaleDateString(
                          "en-IN"
                        )
                      : "Date not available"}
                  </span>
                </div>

                <span className="resident-status">
                  {issue.status || "Under Review"}
                </span>

                <Link
                  to={`/issues/${issue.id}`}
                  className="resident-report-arrow"
                  aria-label={`View ${issue.title || "issue"}`}
                >
                  <FiArrowRight />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="resident-quick-links">
        <Link to="/explore" className="resident-quick-card">
          <span className="resident-quick-icon">
            <FiMapPin />
          </span>

          <span>
            <strong>Explore Issues</strong>
            <small>
              View problems reported in your neighbourhood.
            </small>
          </span>

          <FiArrowRight />
        </Link>

        <Link to="/my-reports" className="resident-quick-card">
          <span className="resident-quick-icon">
            <FiAlertCircle />
          </span>

          <span>
            <strong>My Reports</strong>
            <small>Review your submitted reports.</small>
          </span>

          <FiArrowRight />
        </Link>

        <Link to="/track-issues" className="resident-quick-card">
          <span className="resident-quick-icon">
            <FiActivity />
          </span>

          <span>
            <strong>Track Issue Progress</strong>
            <small>
              Follow verification, maintenance, and resolution progress.
            </small>
          </span>

          <FiArrowRight />
        </Link>

        <Link to="/profile" className="resident-quick-card">
          <span className="resident-quick-icon">
            <FiUser />
          </span>

          <span>
            <strong>My Profile</strong>
            <small>View your resident account information.</small>
          </span>

          <FiArrowRight />
        </Link>
      </section>
    </main>
  );
}

export default UserDashboard;
