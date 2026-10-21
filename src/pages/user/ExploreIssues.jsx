import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiMapPin,
  FiFilter,
  FiArrowRight,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
  FiX,
  FiShield,
} from "react-icons/fi";

import { fetchIssues } from "../../features/issues/issuesSlice";
import "./ExploreIssues.css";

const categories = [
  "All Categories",
  "Road Damage",
  "Street Lighting",
  "Waste Management",
  "Drainage",
  "Water Supply",
  "Electrical",
  "Other",
];

const statuses = [
  "All Statuses",
  "Under Review",
  "Needs More Information",
  "Outside Service Area",
  "Suspicious—Verification Required",
  "Approved for Assignment",
  "Assigned",
  "Accepted",
  "In Progress",
  "External Follow-up",
  "Awaiting Resolution Verification",
  "Resolved",
  "Rejected—False Report",
  "Duplicate",
];

function getStatusClass(status = "") {
  const value = status.toLowerCase();

  if (value === "resolved") return "resolved";

  if (
    value.includes("rejected") ||
    value.includes("duplicate")
  ) {
    return "rejected";
  }

  if (
    value.includes("progress") ||
    value.includes("assigned") ||
    value.includes("accepted") ||
    value.includes("verification")
  ) {
    return "progress";
  }

  if (
    value.includes("review") ||
    value.includes("submitted") ||
    value.includes("approved") ||
    value.includes("follow-up") ||
    value.includes("information") ||
    value.includes("outside service")
  ) {
    return "pending";
  }

  return "default";
}

function getStatusIcon(status = "") {
  const type = getStatusClass(status);

  if (type === "resolved") return <FiCheckCircle />;
  if (type === "progress") return <FiRefreshCw />;
  if (type === "rejected") return <FiAlertCircle />;

  return <FiClock />;
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ExploreIssues() {
  const dispatch = useDispatch();

  // Authentication and role
  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  // Guests and residents can report issues.
  const canReport =
    !isAuthenticated || user?.role === "resident";

  // Issue data
  const {
    items: issues = [],
    loading,
    error,
  } = useSelector((state) => state.issues);

  // Filter state
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [location, setLocation] = useState("");

  useEffect(() => {
    dispatch(fetchIssues());
  }, [dispatch]);

  // Search and filter issues
  const filteredIssues = useMemo(() => {
    const searchText = search.trim().toLowerCase();
    const locationText = location.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        !searchText ||
        [
          issue.title,
          issue.description,
          issue.category,
          issue.location,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchText)
        );

      const matchesCategory =
        category === "All Categories" ||
        issue.category === category;

      const matchesStatus =
        status === "All Statuses" ||
        (issue.status || "Under Review") === status;

      const matchesLocation =
        !locationText ||
        String(issue.location || "")
          .toLowerCase()
          .includes(locationText);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesLocation
      );
    });
  }, [issues, search, category, status, location]);

  // Summary statistics
  const resolvedCount = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  const closedStatuses = [
    "Resolved",
    "Rejected—False Report",
    "Rejected - False Report",
    "Duplicate",
  ];

  const activeCount = issues.filter(
    (issue) => !closedStatuses.includes(issue.status)
  ).length;

  // Clear filters
  function clearFilters() {
    setSearch("");
    setCategory("All Categories");
    setStatus("All Statuses");
    setLocation("");
  }

  const hasFilters =
    search.trim() !== "" ||
    location.trim() !== "" ||
    category !== "All Categories" ||
    status !== "All Statuses";

  return (
    <main className="explore-page">
      {/* Hero Section */}
      <section className="explore-hero">
        <div className="explore-container">
          <span className="explore-eyebrow">
            <FiMapPin /> COMMUNITY ISSUE DIRECTORY
          </span>

          <h1>Explore Community Issues</h1>

          <p>
            Discover reported neighbourhood problems, check their
            current status, and follow progress towards resolution.
          </p>

          <div className="explore-hero-actions">
            {canReport && (
              <Link
                to="/report"
                className="explore-primary-btn"
              >
                Report an Issue <FiArrowRight />
              </Link>
            )}

            {!isAuthenticated && (
              <span className="explore-public-note">
                Browse issues without logging in
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="explore-container explore-content">
        {/* Summary Statistics */}
        <div className="explore-summary">
          <div className="explore-summary-card">
            <div className="explore-summary-icon summary-total">
              <FiAlertCircle />
            </div>

            <div>
              <span>Total Issues</span>
              <h2>{loading ? "—" : issues.length}</h2>
            </div>
          </div>

          <div className="explore-summary-card">
            <div className="explore-summary-icon summary-active">
              <FiClock />
            </div>

            <div>
              <span>Active Issues</span>
              <h2>{loading ? "—" : activeCount}</h2>
            </div>
          </div>

          <div className="explore-summary-card">
            <div className="explore-summary-icon summary-resolved">
              <FiCheckCircle />
            </div>

            <div>
              <span>Resolved Issues</span>
              <h2>{loading ? "—" : resolvedCount}</h2>
            </div>
          </div>
        </div>

        {/* Issue Directory Heading */}
        <div className="explore-section-heading">
          <div>
            <span className="explore-section-label">
              ISSUE DIRECTORY
            </span>

            <h2>Find an issue</h2>

            <p>
              Search and filter reports from your community.
            </p>
          </div>

          {canReport && (
            <Link
              to="/report"
              className="explore-report-link"
            >
              + Report Issue
            </Link>
          )}
        </div>

        {/* Search and Filters */}
        <section className="explore-filter-panel">
          <div className="explore-search-box">
            <FiSearch />

            <input
              type="search"
              placeholder="Search by title, description or category..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Search community issues"
            />

            {search && (
              <button
                type="button"
                className="explore-clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="explore-filter-row">
            <label className="explore-filter-field">
              <span>
                <FiFilter /> Category
              </span>

              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="explore-filter-field">
              <span>
                <FiClock /> Status
              </span>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="explore-filter-field location-filter">
              <span>
                <FiMapPin /> Location
              </span>

              <input
                type="text"
                placeholder="Search neighbourhood..."
                value={location}
                onChange={(event) =>
                  setLocation(event.target.value)
                }
              />
            </label>

            {hasFilters && (
              <button
                type="button"
                className="explore-reset-btn"
                onClick={clearFilters}
              >
                <FiX /> Clear
              </button>
            )}
          </div>
        </section>

        {/* Results Heading */}
        <div className="explore-results-heading">
          <div>
            <h3>Community Reports</h3>

            <p>
              {loading
                ? "Loading reports..."
                : `${filteredIssues.length} ${
                    filteredIssues.length === 1
                      ? "issue"
                      : "issues"
                  } found`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="explore-message">
            <div className="explore-spinner" />

            <h3>Loading community issues</h3>

            <p>
              Please wait while we retrieve the reports.
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="explore-message explore-error">
            <FiAlertCircle />

            <h3>Unable to load issues</h3>

            <p>
              Check that the CivicPulse backend is running and try
              again.
            </p>

            <button
              type="button"
              className="explore-primary-btn"
              onClick={() => dispatch(fetchIssues())}
            >
              <FiRefreshCw /> Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredIssues.length === 0 && (
          <div className="explore-message">
            <div className="explore-empty-icon">
              <FiSearch />
            </div>

            <h3>No issues found</h3>

            <p>
              Try another search term or change your filters to see
              more community reports.
            </p>

            {hasFilters && (
              <button
                type="button"
                className="explore-primary-btn"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Issue Cards */}
        {!loading && !error && filteredIssues.length > 0 && (
          <div className="explore-issues-grid">
            {filteredIssues.map((issue) => {
              const statusClass = getStatusClass(issue.status);

              return (
                <article
                  className="explore-issue-card"
                  key={issue.id}
                >
                  <div className="explore-card-top">
                    <span className="explore-category-badge">
                      {issue.category || "Other"}
                    </span>

                    <span
                      className={`explore-status-badge status-${statusClass}`}
                    >
                      {getStatusIcon(issue.status)}
                      {issue.status || "Under Review"}
                    </span>
                  </div>

                  <h3>
                    {issue.title || "Untitled Issue"}
                  </h3>

                  <p className="explore-issue-description">
                    {issue.description ||
                      "No additional description provided."}
                  </p>

                  <div className="explore-issue-location">
                    <FiMapPin />

                    <span>
                      {issue.location || "Location not provided"}
                    </span>
                  </div>

                  <div className="explore-issue-date">
                    <FiClock />

                    <span>
                      Reported{" "}
                      {formatDate(
                        issue.reportedAt || issue.createdAt
                      )}
                    </span>
                  </div>

                  <div className="explore-card-footer">
                    <span className="explore-report-id">
                      Issue #{issue.id}
                    </span>

                    <Link to={`/issues/${issue.id}`}>
                      View Details <FiArrowRight />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Bottom Information */}
        <div className="explore-bottom-note">
          <FiShield />

          <p>
            Issue statuses are updated as reports are reviewed and
            work progresses. Demonstration records may appear during
            development.
          </p>
        </div>
      </section>
    </main>
  );
}

export default ExploreIssues;