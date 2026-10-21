import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiArrowRight,
  FiMapPin,
  FiShield,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiActivity,
  FiRefreshCw,
} from "react-icons/fi";

import { getIssues } from "../../services/civicPulseService";
import api from "../../services/api";
import "./Home.css";

function Home() {
  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const [issues, setIssues] = useState([]);
  const [communityMembers, setCommunityMembers] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadHomepageData = async () => {
      setLoading(true);

      const [issuesResult, usersResult] = await Promise.allSettled([
        getIssues(),
        api.get("/users"),
      ]);

      if (!isMounted) return;

      if (issuesResult.status === "fulfilled") {
        setIssues(
          Array.isArray(issuesResult.value)
            ? issuesResult.value
            : []
        );
      } else {
        setIssues([]);
      }

      if (
        usersResult.status === "fulfilled" &&
        Array.isArray(usersResult.value.data)
      ) {
        const activeResidents = usersResult.value.data.filter(
          (account) =>
            account.role === "resident" &&
            account.isActive !== false &&
            account.isActive !== "false"
        );

        setCommunityMembers(activeResidents.length);
      } else {
        setCommunityMembers(null);
      }

      setLoading(false);
    };

    loadHomepageData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatus = (issue) =>
    String(issue.status || "").trim().toLowerCase();

  const statistics = useMemo(() => {
    const inProgressStatuses = ["accepted", "in progress"];

    return [
      {
        label: "Issues Reported",
        value: issues.length,
        icon: FiAlertCircle,
      },
      {
        label: "In Progress",
        value: issues.filter((issue) =>
          inProgressStatuses.includes(getStatus(issue))
        ).length,
        icon: FiClock,
      },
      {
        label: "Issues Resolved",
        value: issues.filter(
          (issue) => getStatus(issue) === "resolved"
        ).length,
        icon: FiCheckCircle,
      },
      {
        label: "Community Members",
        value: communityMembers ?? "—",
        icon: FiUsers,
      },
    ];
  }, [issues, communityMembers]);

  const recentIssues = useMemo(() => {
    return [...issues]
      .sort((a, b) => {
        const dateA = new Date(
          a.reportedAt || a.createdAt || a.submittedAt || 0
        ).getTime();

        const dateB = new Date(
          b.reportedAt || b.createdAt || b.submittedAt || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 3);
  }, [issues]);

  const formatDate = (issue) => {
    const dateValue =
      issue.reportedAt || issue.createdAt || issue.submittedAt;

    if (!dateValue) return "Date unavailable";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();

    if (normalized === "resolved") return "resolved";

    if (
      normalized === "in progress" ||
      normalized === "accepted"
    ) {
      return "in-progress";
    }

    if (
      normalized === "awaiting resolution verification"
    ) {
      return "awaiting-verification";
    }

    if (
      normalized === "assigned" ||
      normalized === "approved for assignment"
    ) {
      return "assigned";
    }

    if (
      normalized.includes("rejected") ||
      normalized === "duplicate" ||
      normalized === "outside service area"
    ) {
      return "rejected";
    }

    return "under-review";
  };

  const dashboardPath = {
    resident: "/dashboard",
    admin: "/admin",
    maintenance: "/maintenance",
    maintenanceTeam: "/maintenance",
  };

  const dashboardLink =
    dashboardPath[user?.role] || "/dashboard";

  const reportLink =
    isAuthenticated && user?.role === "resident"
      ? "/report"
      : "/login";

  return (
    <main className="home-page">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <FiActivity />
            <span>COMMUNITY PROBLEM INTELLIGENCE</span>
          </div>

          <h1>
            A Better Neighbourhood
            <br />
            Starts with <span>Your Voice.</span>
          </h1>

          <p>
            Report local problems, follow maintenance progress,
            and help make your residential neighbourhood safer,
            cleaner, and better maintained.
          </p>

          <div className="home-hero-actions">
            {isAuthenticated ? (
              <Link
                to={dashboardLink}
                className="home-primary-btn"
              >
                Go to Dashboard
                <FiArrowRight />
              </Link>
            ) : (
              <Link
                to="/register"
                className="home-primary-btn"
              >
                Join Your Community
                <FiArrowRight />
              </Link>
            )}

            <Link
              to="/explore"
              className="home-secondary-btn"
            >
              Explore Issues
            </Link>
          </div>

          <div className="home-hero-note">
            <FiShield />
            <span>
              Transparent reporting. Accountable maintenance.
              Stronger communities.
            </span>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-visual-card">
            <div className="home-visual-icon">
              <FiMapPin />
            </div>

            <div>
              <span className="home-visual-label">
                Community first
              </span>
              <h3>Every Issue Matters</h3>
              <p>
                From damaged roads to waste collection,
                every report helps identify what needs attention.
              </p>
            </div>

            <div className="home-visual-footer">
              <span className="home-visual-dot" />
              <span>Built for neighbourhoods</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Statistics */}
      <section className="home-stats">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">
              COMMUNITY OVERVIEW
            </span>
            <h2>Our Community at a Glance</h2>
            <p>
              Live figures from reports and registered residents
              in CivicPulse.
            </p>
          </div>
        </div>

        <div className="home-stats-grid">
          {statistics.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                className="home-stat-card"
                key={stat.label}
              >
                <div className="home-stat-icon">
                  <Icon />
                </div>

                <div className="home-stat-info">
                  <p>{stat.label}</p>
                  <h3>
                    {loading ? "—" : stat.value}
                  </h3>
                </div>
              </article>
            );
          })}
        </div>

        <p className="home-stats-footnote">
          Statistics are calculated from the current server data.
          Issues awaiting administrator verification are not
          counted as resolved.
        </p>
      </section>

      {/* How It Works */}
      <section className="home-how">
        <div className="home-section-heading">
          <div>
            <span className="home-eyebrow">
              SIMPLE AND TRANSPARENT
            </span>
            <h2>How CivicPulse Works</h2>
            <p>
              A clear process from reporting a problem to
              verifying its resolution.
            </p>
          </div>
        </div>

        <div className="home-how-grid">
          <article className="home-how-card">
            <div className="home-how-icon">
              <FiMapPin />
            </div>
            <span className="home-step-number">01</span>
            <h3>Report an Issue</h3>
            <p>
              Submit a neighbourhood problem with its location,
              description, priority, and optional photo or video.
            </p>
          </article>

          <article className="home-how-card">
            <div className="home-how-icon">
              <FiShield />
            </div>
            <span className="home-step-number">02</span>
            <h3>Review and Assign</h3>
            <p>
              An administrator reviews the report, checks
              responsibility, and assigns eligible work to a
              maintenance team or follows up with an external
              organisation.
            </p>
          </article>

          <article className="home-how-card">
            <div className="home-how-icon">
              <FiCheckCircle />
            </div>
            <span className="home-step-number">03</span>
            <h3>Track Resolution</h3>
            <p>
              Follow maintenance updates and evidence. The
              administrator verifies completed work before the
              issue is marked resolved.
            </p>
          </article>
        </div>
      </section>

      {/* About */}
      <section className="home-about">
        <div className="home-about-content">
          <span className="home-eyebrow">
            ABOUT CIVICPULSE
          </span>

          <h2>
            Turning Community Reports into Meaningful Action
          </h2>

          <p>
            CivicPulse helps residents, administrators, and
            maintenance teams work together through a structured
            issue-management process. Each report can be reviewed,
            assigned, tracked, and checked before its resolution
            is confirmed.
          </p>

          <p>
            By keeping progress and decisions visible, the
            platform supports better coordination and
            accountability across the neighbourhood.
          </p>

          <Link
            to="/explore"
            className="home-text-link"
          >
            Explore community issues
            <FiArrowRight />
          </Link>
        </div>

        <div className="home-about-points">
          <div className="home-about-point">
            <div className="home-about-point-icon">
              <FiUsers />
            </div>
            <div>
              <h3>Resident Participation</h3>
              <p>
                Give residents a straightforward way to report
                problems and follow their submissions.
              </p>
            </div>
          </div>

          <div className="home-about-point">
            <div className="home-about-point-icon">
              <FiShield />
            </div>
            <div>
              <h3>Accountable Decisions</h3>
              <p>
                Support review, responsibility checks, assignment,
                and final verification.
              </p>
            </div>
          </div>

          <div className="home-about-point">
            <div className="home-about-point-icon">
              <FiActivity />
            </div>
            <div>
              <h3>Visible Progress</h3>
              <p>
                Keep maintenance updates and resolution evidence
                connected to each report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Issues */}
      <section className="home-issues">
        <div className="home-section-heading home-issues-heading">
          <div>
            <span className="home-eyebrow">
              COMMUNITY ACTIVITY
            </span>
            <h2>Recently Reported Issues</h2>
            <p>
              The latest reports available in CivicPulse.
            </p>
          </div>

          <Link
            to="/explore"
            className="home-view-all"
          >
            View All Issues
            <FiArrowRight />
          </Link>
        </div>

        {loading ? (
          <div className="home-issues-message">
            <FiRefreshCw className="home-loading-icon" />
            <p>Loading recent issues...</p>
          </div>
        ) : recentIssues.length === 0 ? (
          <div className="home-issues-message">
            <FiAlertCircle />
            <h3>No issues reported yet</h3>
            <p>
              New community reports will appear here when
              they are submitted.
            </p>

            {isAuthenticated &&
              user?.role === "resident" && (
                <Link
                  to="/report"
                  className="home-primary-btn"
                >
                  Report an Issue
                  <FiArrowRight />
                </Link>
              )}
          </div>
        ) : (
          <div className="home-issues-grid">
            {recentIssues.map((issue) => (
              <article
                className="home-issue-card"
                key={issue.id}
              >
                <div className="home-issue-card-top">
                  <span className="home-issue-category">
                    {issue.category || "General"}
                  </span>

                  <span
                    className={`home-issue-status ${getStatusClass(
                      issue.status
                    )}`}
                  >
                    {issue.status || "Under Review"}
                  </span>
                </div>

                <h3>{issue.title || "Untitled Issue"}</h3>

                <p className="home-issue-description">
                  {issue.description ||
                    "No description provided."}
                </p>

                <div className="home-issue-meta">
                  <span>
                    <FiMapPin />
                    {issue.location || "Location not provided"}
                  </span>

                  <span>
                    <FiClock />
                    {formatDate(issue)}
                  </span>
                </div>

                <Link
                  to={
                    issue.id
                      ? `/issues/${issue.id}`
                      : "/explore"
                  }
                  className="home-issue-link"
                >
                  View Issue
                  <FiArrowRight />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Call to Action */}
      <section className="home-cta">
        <div className="home-cta-content">
          <span className="home-eyebrow">
            MAKE A DIFFERENCE
          </span>

          <h2>
            Help Make Your Neighbourhood Better
          </h2>

          <p>
            Report problems, stay informed about maintenance,
            and contribute to a cleaner, safer community.
          </p>
        </div>

        <div className="home-cta-actions">
          {isAuthenticated ? (
            <Link
              to={dashboardLink}
              className="home-primary-btn"
            >
              Open Dashboard
              <FiArrowRight />
            </Link>
          ) : (
            <Link
              to="/register"
              className="home-primary-btn"
            >
              Get Started
              <FiArrowRight />
            </Link>
          )}

          <Link
            to={reportLink}
            className="home-cta-secondary"
          >
            {isAuthenticated && user?.role === "resident"
              ? "Report an Issue"
              : isAuthenticated
                ? "Sign in as a Resident to Report"
                : "Sign In"}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;