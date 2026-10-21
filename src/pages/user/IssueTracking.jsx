
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiSearch,
  FiTool,
  FiAlertCircle,
  FiExternalLink,
} from "react-icons/fi";

import api from "../../services/api";
import "./IssueTracking.css";

const trackingSteps = [
  {
    label: "Submitted",
    description: "Your report has been received.",
  },
  {
    label: "Admin Review",
    description: "The admin is checking your report.",
  },
  {
    label: "Action",
    description: "A maintenance team or external organization is handling the issue.",
  },
  {
    label: "Resolution Verification",
    description: "The admin is checking the submitted completion evidence.",
  },
  {
    label: "Resolved",
    description: "The admin has verified the completed work.",
  },
];

const reviewStatuses = [
  "Under Review",
  "Needs More Information",
  "Outside Service Area",
  "Suspicious—Verification Required",
  "Approved for Assignment",
];

const repairStatuses = [
  "Assigned",
  "Accepted",
  "In Progress",
  "External Follow-up",
];

const verificationStatuses = [
  "Awaiting Resolution Verification",
  "Pending Resolution Verification",
];

const closedStatuses = [
  "Rejected—False Report",
  "Rejected - False Report",
  "Duplicate",
];

function getProgress(status) {
  if (status === "Resolved") return 5;

  if (verificationStatuses.includes(status)) return 4;

  if (repairStatuses.includes(status)) return 3;

  if (reviewStatuses.includes(status)) return 2;

  if (status === "Submitted") return 1;

  return 1;
}

function formatDate(value) {
  if (!value) return "Date not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not available";
  }

  return date.toLocaleDateString("en-IN");
}

function getExternalDetails(issue) {
  const followUp = issue.externalFollowUp || {};

  return {
    organization:
      followUp.organizationName ||
      followUp.organization ||
      issue.externalOrganizationName ||
      issue.organizationName ||
      "",
    status:
      followUp.status ||
      issue.externalFollowUpStatus ||
      "",
    reference:
      followUp.referenceNumber ||
      issue.externalReferenceNumber ||
      "",
    nextDate:
      followUp.nextFollowUpDate ||
      issue.nextFollowUpDate ||
      "",
    notes:
      followUp.notes ||
      issue.externalFollowUpNotes ||
      "",
  };
}

function IssueTracking() {
  const user = useSelector((state) => state.auth.user);

  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadIssues = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/issues");

        if (!Array.isArray(response.data)) {
          throw new Error("Invalid issue list.");
        }

        if (isActive) {
          const ownIssues = response.data.filter(
            (issue) =>
              user?.id != null &&
              String(issue.userId) === String(user.id)
          );

          setIssues(ownIssues);
        }
      } catch {
        if (isActive) {
          setError(
            "Unable to load your issue tracking information. Please try again later."
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    if (user?.id != null) {
      loadIssues();
    } else {
      setIssues([]);
      setLoading(false);
    }

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const statuses = useMemo(
    () => [
      "All",
      ...new Set(
        issues.map((issue) => issue.status || "Under Review")
      ),
    ],
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const term = search.trim().toLowerCase();

    return issues.filter((issue) => {
      const matchesSearch =
        !term ||
        [
          issue.title,
          issue.category,
          issue.location,
          issue.id,
          issue.assignedTeamName,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(term)
          );

      const matchesStatus =
        selectedStatus === "All" ||
        (issue.status || "Under Review") === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [issues, search, selectedStatus]);

  const underReviewCount = issues.filter((issue) =>
    [
      "Submitted",
      "Under Review",
      "Needs More Information",
      "Outside Service Area",
      "Suspicious—Verification Required",
    ].includes(issue.status)
  ).length;

  const repairCount = issues.filter((issue) =>
    [
      "Assigned",
      "Accepted",
      "In Progress",
      "External Follow-up",
    ].includes(issue.status)
  ).length;

  const verificationCount = issues.filter((issue) =>
    verificationStatuses.includes(issue.status)
  ).length;

  const resolvedCount = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  return (
    <main className="issue-tracking-page">
      <header className="it-header">
        <div>
          <p className="it-eyebrow">RESIDENT WORKSPACE</p>
          <h1>Track Your Issues</h1>
          <p>
            Follow your reports from admin review through repair and
            final resolution verification.
          </p>

          <Link to="/dashboard" className="it-back-link">
            <FiArrowLeft /> Back to Dashboard
          </Link>
        </div>

        <div className="it-header-icon">
          <FiActivity />
        </div>
      </header>

      <section className="it-summary">
        <article>
          <span className="it-summary-icon">
            <FiAlertCircle />
          </span>
          <div>
            <p>My Reports</p>
            <h2>{loading ? "—" : issues.length}</h2>
          </div>
        </article>

        <article>
          <span className="it-summary-icon it-summary-orange">
            <FiClock />
          </span>
          <div>
            <p>Under Review</p>
            <h2>{loading ? "—" : underReviewCount}</h2>
          </div>
        </article>

        <article>
          <span className="it-summary-icon it-summary-blue">
            <FiTool />
          </span>
          <div>
            <p>Repair / Follow-up</p>
            <h2>{loading ? "—" : repairCount}</h2>
          </div>
        </article>

        <article>
          <span className="it-summary-icon it-summary-green">
            <FiCheckCircle />
          </span>
          <div>
            <p>Resolved</p>
            <h2>{loading ? "—" : resolvedCount}</h2>
          </div>
        </article>
      </section>

      {verificationCount > 0 && (
        <section className="it-notice">
          <FiClock />
          {verificationCount}{" "}
          {verificationCount === 1 ? "report is" : "reports are"} waiting
          for admin resolution verification. Work submitted by a
          maintenance team or external organization is not considered
          resolved until the admin verifies it.
        </section>
      )}

      <section className="it-list-section">
        <div className="it-section-heading">
          <div>
            <h2>Issue Progress</h2>
            <p>Search your reports and inspect their latest recorded status.</p>
          </div>

          <Link to="/explore" className="it-explore-link">
            Explore Issues <FiArrowRight />
          </Link>
        </div>

        <div className="it-filters">
          <label className="it-search">
            <FiSearch />
            <input
              type="search"
              placeholder="Search issue, category or location..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search your reports"
            />
          </label>

          <select
            aria-label="Filter by issue status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All statuses" : status}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="it-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="it-empty">Loading your issue progress...</div>
        ) : !user?.id ? (
          <div className="it-empty">
            <FiAlertCircle />
            <h3>Sign in to track your reports</h3>
            <p>Your personal issue progress is available after sign-in.</p>
            <Link to="/login">Sign in</Link>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="it-empty">
            <FiSearch />
            <h3>
              {issues.length === 0
                ? "No reports yet"
                : "No matching reports"}
            </h3>
            <p>
              {issues.length === 0
                ? "Reports you submit will appear here with their progress."
                : "Try another search or choose a different status filter."}
            </p>

            {issues.length === 0 && (
              <Link to="/report">Report an Issue</Link>
            )}
          </div>
        ) : (
          <div className="it-issue-list">
            {filteredIssues.map((issue) => {
              const status = issue.status || "Under Review";
              const progress = getProgress(status);
              const isResolved = status === "Resolved";
              const isClosed = closedStatuses.includes(status);
              const isReopened = Boolean(issue.reopenedAt);
              const percentage = isClosed
                ? 0
                : Math.round((progress / trackingSteps.length) * 100);
              const external = getExternalDetails(issue);
              const isExternal = status === "External Follow-up";

              return (
                <article className="it-issue-card" key={issue.id}>
                  <div className="it-card-top">
                    <div>
                      <span className="it-issue-category">
                        {issue.category || "Community issue"}
                      </span>

                      <h3>{issue.title || "Untitled issue"}</h3>

                      <p className="it-location">
                        <FiMapPin />
                        {issue.location || "Location not provided"}
                      </p>
                    </div>

                    <span
                      className={`it-status ${
                        isResolved
                          ? "it-status-resolved"
                          : isClosed
                            ? "it-status-closed"
                            : "it-status-active"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="it-progress-heading">
                    <span>
                      {isClosed
                        ? "Report closed"
                        : isResolved
                          ? "Resolution verified"
                          : "Workflow progress"}
                    </span>

                    <strong>
                      {isClosed ? "Closed" : `${percentage}%`}
                    </strong>
                  </div>

                  <div
                    className="it-progress-track"
                    role="progressbar"
                    aria-label={`Progress for ${issue.title || "issue"}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={isClosed ? 0 : percentage}
                  >
                    <span
                      className="it-progress-fill"
                      style={{
                        width: `${isClosed ? 0 : percentage}%`,
                      }}
                    />
                  </div>

                  <div className="it-timeline">
                    {trackingSteps.map((step, index) => {
                      const stepNumber = index + 1;

                      const completed = isResolved
                        ? true
                        : !isClosed && progress > stepNumber;

                      const current =
                        !isClosed &&
                        !isResolved &&
                        progress === stepNumber;

                      return (
                        <div
                          className={`it-timeline-step ${
                            completed ? "completed" : ""
                          } ${current ? "current" : ""}`}
                          key={step.label}
                        >
                          <span className="it-timeline-marker">
                            {completed ? (
                              <FiCheckCircle />
                            ) : (
                              stepNumber
                            )}
                          </span>

                          <div>
                            <strong>{step.label}</strong>
                            <p>
                              {stepNumber === 3 && isExternal
                                ? "An external organization is being followed up."
                                : stepNumber === 3 &&
                                    issue.assignedTeamName
                                  ? "Your assigned maintenance team is handling the repair."
                                  : stepNumber === 4 &&
                                      verificationStatuses.includes(status)
                                    ? "The submitted repair is awaiting admin verification."
                                    : stepNumber === 3 &&
                                        status === "Approved for Assignment"
                                      ? "The report is approved and awaiting assignment."
                                      : step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {issue.assignedTeamName && (
                    <div className="it-team-info">
                      <FiTool />
                      <span>
                        Assigned team:{" "}
                        <strong>{issue.assignedTeamName}</strong>
                      </span>
                    </div>
                  )}

                  {isExternal && (
                    <div className="it-notice">
                      <FiExternalLink />
                      <div>
                        <strong>External organization follow-up</strong>

                        {external.organization && (
                          <p>Organization: {external.organization}</p>
                        )}

                        {external.status && (
                          <p>Follow-up status: {external.status}</p>
                        )}

                        {external.reference && (
                          <p>Reference number: {external.reference}</p>
                        )}

                        {external.nextDate && (
                          <p>
                            Next follow-up: {formatDate(external.nextDate)}
                          </p>
                        )}

                        {external.notes && <p>{external.notes}</p>}

                        {!external.organization &&
                          !external.status &&
                          !external.notes && (
                            <p>
                              The issue is being handled outside the
                              neighbourhood maintenance team. Check the
                              issue details for the latest recorded update.
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {status === "Needs More Information" && (
                    <div className="it-notice">
                      <FiAlertCircle />
                      <span>
                        The admin needs additional information about this
                        report.
                        {issue.reviewReason && ` ${issue.reviewReason}`}
                      </span>
                    </div>
                  )}

                  {status === "Outside Service Area" && (
                    <div className="it-notice">
                      <FiAlertCircle />
                      <span>
                        This report is outside the supported service area.
                        {issue.reviewReason && ` ${issue.reviewReason}`}
                      </span>
                    </div>
                  )}

                  {status === "Suspicious—Verification Required" && (
                    <div className="it-notice">
                      <FiAlertCircle />
                      <span>
                        This report requires additional verification.
                        {issue.reviewReason && ` ${issue.reviewReason}`}
                      </span>
                    </div>
                  )}

                  {status === "Approved for Assignment" && (
                    <div className="it-notice">
                      Your report has passed admin review and is awaiting
                      maintenance assignment.
                    </div>
                  )}

                  {verificationStatuses.includes(status) && (
                    <div className="it-notice">
                      <FiClock />
                      <span>
                        Repair completion has been submitted. The issue will
                        only be marked resolved after admin verification.
                      </span>
                    </div>
                  )}

                  {issue.completionNotes && (
                    <div className="it-notice">
                      <strong>Completion notes:</strong>{" "}
                      {issue.completionNotes}
                    </div>
                  )}

                  {isReopened && (
                    <div className="it-notice">
                      <FiAlertCircle />
                      <span>
                        This issue was reopened for additional work.
                        {issue.reopenReason && ` Reason: ${issue.reopenReason}`}
                      </span>
                    </div>
                  )}

                  {isClosed && (
                    <div className="it-notice it-notice-closed">
                      <FiAlertCircle />
                      <span>
                        {status.includes("Rejected")
                          ? "This report was rejected during admin review."
                          : "This report was marked as a duplicate."}
                        {issue.reviewReason && ` ${issue.reviewReason}`}
                      </span>
                    </div>
                  )}

                  <div className="it-card-footer">
                    <span>
                      Reported {formatDate(issue.reportedAt)}
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
      </section>
    </main>
  );
}

export default IssueTracking;
