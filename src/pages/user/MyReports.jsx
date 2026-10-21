
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiSearch,
  FiMapPin,
  FiArrowRight,
  FiFileText,
  FiMessageSquare,
  FiUpload,
  FiRotateCcw,
  FiInfo,
  FiX,
} from "react-icons/fi";

import { fetchIssues } from "../../features/issues/issuesSlice";
import { updateIssue } from "../../services/civicPulseService";
import "./MyReports.css";


function MyReports() {
  const dispatch = useDispatch();

  const { items, loading, error } = useSelector(
    (state) => state.issues
  );

  const user = useSelector((state) => state.auth.user);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeAction, setActiveAction] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    dispatch(fetchIssues());
  }, [dispatch]);

  const myReports = useMemo(() => {
    if (!user?.id) return [];

    return items.filter(
      (issue) => String(issue.userId) === String(user.id)
    );
  }, [items, user?.id]);

  const statuses = [
    "All",
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

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return myReports.filter((issue) => {
      const matchesSearch =
        (issue.title || "").toLowerCase().includes(query) ||
        (issue.location || "").toLowerCase().includes(query) ||
        (issue.category || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || issue.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myReports, search, statusFilter]);

  const openAction = (issue, action) => {
    setActiveAction({ issue, action });
    setResponseText("");
    setActionError("");
    setActionMessage("");
  };

  const closeAction = () => {
    if (saving) return;

    setActiveAction(null);
    setResponseText("");
    setActionError("");
  };

  const saveResidentResponse = async (event) => {
    event.preventDefault();

    if (!activeAction || saving) return;

    const { issue, action } = activeAction;
    const response = responseText.trim();

    if (!response) {
      setActionError("Please enter your message before submitting.");
      return;
    }

    try {
      setSaving(true);
      setActionError("");

      const now = new Date().toISOString();

      const updates = {
        residentResponse: response,
        residentResponseType: action,
        residentResponseAt: now,
        residentResponseBy: user.id,
      };

      if (action === "request-review") {
        updates.reviewRequested = true;
        updates.reviewRequestedAt = now;
        updates.previousReviewStatus = issue.status;
        updates.status = "Under Review";
      }

      if (action === "submit-details") {
        updates.additionalInformationSubmittedAt = now;
        updates.status = "Under Review";
      }

      await updateIssue(issue.id, updates);
      await dispatch(fetchIssues()).unwrap();

      setActiveAction(null);
      setResponseText("");
      setActionMessage(
        action === "request-review"
          ? "Your review request has been submitted."
          : "Your additional information has been submitted."
      );
    } catch (err) {
      setActionError(
        err.message || "Unable to submit your response. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const getActionContent = () => {
    if (!activeAction) return null;

    const { issue, action } = activeAction;

    if (action === "admin-message") {
      return {
        title: "Admin Message",
        description:
          issue.reviewReason || "The admin has not added a review message.",
        readOnly: true,
      };
    }

    if (action === "external-guidance") {
      return {
        title: "Review Reason & External Guidance",
        description:
          issue.reviewReason ||
          "The admin has not provided external guidance yet.",
        readOnly: true,
      };
    }

    if (action === "duplicate-message") {
      return {
        title: "Duplicate Report",
        description:
          issue.reviewReason ||
          "A similar problem has already been reported.",
        readOnly: true,
      };
    }

    if (action === "submit-details") {
      return {
        title: "Submit Additional Details",
        description:
          "Read the admin's message above and provide the requested information or clarification.",
        placeholder: "Enter the additional information...",
        submitLabel: "Submit Details",
      };
    }

    return {
      title: "Request Review",
      description:
        "Explain why you believe this decision should be reconsidered. The administration can review your request.",
      placeholder: "Explain why you are requesting a review...",
      submitLabel: "Send Review Request",
    };
  };

  const actionContent = getActionContent();

  return (
    <main className="my-reports-page">
      <section className="my-reports-header">
        <div>
          <span className="my-reports-eyebrow">RESIDENT PORTAL</span>
          <h1>My Reports</h1>
          <p>Track neighbourhood issues and follow their progress.</p>
        </div>

        <Link to="/report" className="my-reports-primary-btn">
          + Report an Issue
        </Link>
      </section>

      {actionMessage && (
        <p className="my-reports-action-success" role="status">
          {actionMessage}
        </p>
      )}

      <section className="my-reports-summary">
        <div>
          <span>Total reports</span>
          <strong>{myReports.length}</strong>
        </div>
        <div>
          <span>Showing results</span>
          <strong>{filteredReports.length}</strong>
        </div>
      </section>

      <section className="my-reports-filters">
        <div className="my-reports-search">
          <FiSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, category or location"
            aria-label="Search reports"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter reports by status"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All statuses" : status}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <p className="my-reports-message">Loading reports...</p>
      ) : error ? (
        <p className="my-reports-message my-reports-error">
          Unable to load reports. Please try again later.
        </p>
      ) : filteredReports.length === 0 ? (
        <section className="my-reports-empty">
          <FiFileText />
          <h2>No reports found</h2>
          <p>
            {!user?.id
              ? "Please sign in to view your reports."
              : myReports.length === 0
                ? "You have not submitted any reports yet."
                : "Try changing your search or status filter."}
          </p>

          {user?.id && myReports.length === 0 && (
            <Link to="/report" className="my-reports-primary-btn">
              Report an Issue
            </Link>
          )}
        </section>
      ) : (
        <section className="my-reports-list">
          {filteredReports.map((issue) => {
            const status = issue.status || "Under Review";

            return (
              <article className="my-report-card" key={issue.id}>
                <div className="my-report-icon">
                  <FiMapPin />
                </div>

                <div className="my-report-content">
                  <div className="my-report-title-row">
                    <h2>{issue.title || "Untitled issue"}</h2>
                    <span className="my-report-status">{status}</span>
                  </div>

                  <p className="my-report-description">
                    {issue.description || "No description provided."}
                  </p>

                  <div className="my-report-meta">
                    <span>{issue.category || "General"}</span>
                    <span>{issue.location || "Location not provided"}</span>
                    <span>
                      {issue.reportedAt
                        ? new Date(issue.reportedAt).toLocaleDateString("en-IN")
                        : "Date not available"}
                    </span>
                  </div>

                  {issue.reviewReason && (
                    <div className="my-report-review-message">
                      <strong>
                        <FiMessageSquare /> Admin Message
                      </strong>
                      <p>{issue.reviewReason}</p>
                    </div>
                  )}

                  {status === "Needs More Information" && (
                    <div className="my-report-actions">
                      <button
                        type="button"
                        onClick={() => openAction(issue, "admin-message")}
                      >
                        <FiMessageSquare /> View Admin Message
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction(issue, "submit-details")}
                      >
                        <FiUpload /> Submit Details
                      </button>
                    </div>
                  )}

                  {status === "Rejected—False Report" && (
                    <div className="my-report-actions">
                      <button
                        type="button"
                        onClick={() => openAction(issue, "request-review")}
                      >
                        <FiRotateCcw /> Request Review
                      </button>
                    </div>
                  )}

                  {status === "Outside Service Area" && (
                    <div className="my-report-actions">
                      <button
                        type="button"
                        onClick={() => openAction(issue, "external-guidance")}
                      >
                        <FiInfo /> View Reason &amp; External Guidance
                      </button>
                    </div>
                  )}

                  {status === "Duplicate" && (
                    <div className="my-report-actions">
                      <button
                        type="button"
                        onClick={() => openAction(issue, "duplicate-message")}
                      >
                        <FiInfo /> View Duplicate Reason
                      </button>

                      {(issue.originalIssueId || issue.duplicateOf) && (
                        <Link
                          to={`/issues/${issue.originalIssueId || issue.duplicateOf}`}
                        >
                          View Original Report <FiArrowRight />
                        </Link>
                      )}
                    </div>
                  )}

                  {issue.residentResponse && (
                    <p className="my-report-response-note">
                      Your latest response was submitted on{" "}
                      {new Date(
                        issue.residentResponseAt
                      ).toLocaleDateString("en-IN")}.
                    </p>
                  )}
                </div>

                <Link
                  to={`/issues/${issue.id}`}
                  className="my-report-details-link"
                  aria-label={`View ${issue.title || "issue"} details`}
                >
                  <FiArrowRight />
                </Link>
              </article>
            );
          })}
        </section>
      )}

      {activeAction && actionContent && (
        <div className="my-reports-action-backdrop">
          <section
            className="my-reports-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="my-reports-action-title"
          >
            <header>
              <h2 id="my-reports-action-title">
                {actionContent.title}
              </h2>
              <button
                type="button"
                onClick={closeAction}
                disabled={saving}
                aria-label="Close dialog"
              >
                <FiX />
              </button>
            </header>

            <p>{actionContent.description}</p>

            {actionContent.readOnly ? (
              <button
                type="button"
                className="my-reports-primary-btn"
                onClick={closeAction}
              >
                Close
              </button>
            ) : (
              <form onSubmit={saveResidentResponse}>
                <label htmlFor="resident-response">
                  Your message
                </label>
                <textarea
                  id="resident-response"
                  rows={5}
                  value={responseText}
                  onChange={(event) => setResponseText(event.target.value)}
                  placeholder={actionContent.placeholder}
                  required
                />

                {actionError && (
                  <p className="my-reports-error" role="alert">
                    {actionError}
                  </p>
                )}

                <div className="my-reports-modal-actions">
                  <button
                    type="button"
                    onClick={closeAction}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}>
                    {saving ? "Submitting..." : actionContent.submitLabel}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

export default MyReports;
