
import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClipboard,
  FiEye,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiX,
  FiImage,
  FiVideo,
  FiMessageSquare,
  FiRotateCcw,
  FiUser,
  FiClock,
} from "react-icons/fi";

import {
  getIssues,
  updateIssue,
  createNotification,
} from "../../services/civicPulseService";

import "./IssueVerification.css";

const REVIEW_STATUSES = [
  "Under Review",
  "Needs More Information",
  "Outside Service Area",
  "External Follow-up Required",
  "Suspicious—Verification Required",
  "Approved for Assignment",
  "Rejected—False Report",
  "Duplicate",
];

const FINAL_REVIEW_STATUSES = [
  "Approved for Assignment",
  "Rejected—False Report",
  "Duplicate",
];

function formatDate(value) {
  if (!value) return "Date not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not recorded";
  }

  return date.toLocaleString("en-IN");
}

function getMediaUrl(media) {
  if (typeof media === "string") return media;

  return media?.url || media?.secure_url || "";
}

function isVideoMedia(media, url = "") {
  const type = String(
    media?.type ||
      media?.resourceType ||
      media?.resource_type ||
      ""
  ).toLowerCase();

  return (
    type === "video" ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url)
  );
}

function getIssueMedia(issue) {
  const candidates = [
    issue?.media,
    issue?.imageUrl,
    issue?.videoUrl,
    issue?.image,
    issue?.photo,
  ];

  const seen = new Set();

  return candidates
    .map((media) => ({
      media,
      url: getMediaUrl(media),
    }))
    .filter(({ url }) => {
      if (!url || seen.has(url)) return false;

      seen.add(url);
      return true;
    })
    .map(({ media, url }) => ({
      url,
      isVideo: isVideoMedia(media, url),
    }));
}

function getReviewNotification(status, reason) {
  const note = String(reason || "").trim();

  switch (status) {
    case "Approved for Assignment":
      return {
        title: "Issue Approved",
        message:
          "Your reported issue has been approved for maintenance.",
      };

    case "Rejected—False Report":
      return {
        title: "Issue Rejected",
        message: note
          ? `Your reported issue has been rejected. Reason: ${note}`
          : "Your reported issue has been rejected.",
      };

    case "Needs More Information":
      return {
        title: "More Information Required",
        message: note
          ? `Please provide additional details about your reported issue. Admin notes: ${note}`
          : "Please provide additional details about your reported issue.",
      };

    case "Outside Service Area":
      return {
        title: "Issue Outside Service Area",
        message: note
          ? `Your reported issue is outside the supported service area. Admin notes: ${note}`
          : "Your reported issue is outside the supported service area.",
      };

    case "External Follow-up Required":
      return {
        title: "External Follow-up Required",
        message: note
          ? `Your issue requires follow-up with an external organisation. Admin notes: ${note}`
          : "Your issue requires follow-up with an external organisation. The administration will update you when a referral is recorded.",
      };

    default:
      return null;
  }
}

function IssueVerification() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [responseFilter, setResponseFilter] = useState("All");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("Under Review");
  const [reviewReason, setReviewReason] = useState("");

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getIssues();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid issue list.");
      }

      setIssues(data);

      setSelectedIssue((current) => {
        if (!current) return null;

        return data.find((item) => item.id === current.id) || current;
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load issue reports."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const reviewQueue = useMemo(
    () =>
      issues.filter((issue) =>
        REVIEW_STATUSES.includes(issue.status)
      ),
    [issues]
  );

  const hasResidentResponse = (issue) =>
    Boolean(
      String(issue.residentResponse || "").trim() ||
        issue.reviewRequested ||
        issue.additionalInformationSubmittedAt
    );

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviewQueue.filter((issue) => {
      const matchesSearch =
        !query ||
        [
          issue.title,
          issue.location,
          issue.category,
          issue.id,
          issue.residentResponse,
        ]
          .filter((value) => value != null)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      const matchesStatus =
        statusFilter === "All" || issue.status === statusFilter;

      const hasResponse = hasResidentResponse(issue);

      const matchesResponse =
        responseFilter === "All" ||
        (responseFilter === "Needs attention" && hasResponse) ||
        (responseFilter === "No response" && !hasResponse);

      return matchesSearch && matchesStatus && matchesResponse;
    });
  }, [reviewQueue, search, statusFilter, responseFilter]);

  const openReview = (issue) => {
    setSelectedIssue(issue);
    setReviewStatus(issue.status || "Under Review");
    setReviewReason(issue.reviewReason || "");
    setError("");
    setMessage("");
  };

  const closeReview = () => {
    if (saving) return;

    setSelectedIssue(null);
    setReviewReason("");
    setError("");
  };

  const saveReview = async (event) => {
    event.preventDefault();

    if (!selectedIssue || saving) return;

    const reason = reviewReason.trim();

    if (
      FINAL_REVIEW_STATUSES.includes(reviewStatus) &&
      !reason
    ) {
      setError(
        "Enter a review reason before approving, rejecting, or marking a report as a duplicate."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const issueBeingReviewed = selectedIssue;
      const statusChanged =
        issueBeingReviewed.status !== reviewStatus;

      const updates = {
        status: reviewStatus,
        reviewReason: reason,
        reviewedAt: new Date().toISOString(),
      };

      if (reviewStatus === "Approved for Assignment") {
        updates.responsibility = "";
        updates.assignedTeamId = null;
        updates.assignedTeamName = "";
      }

      if (reviewStatus === "External Follow-up Required") {
        updates.responsibility = "External Organization";
        updates.assignedTeamId = null;
        updates.assignedTeamName = "";
      }

      if (reviewStatus === "Outside Service Area") {
        updates.responsibility = "Outside Service Area";
        updates.assignedTeamId = null;
        updates.assignedTeamName = "";
      }

      await updateIssue(issueBeingReviewed.id, updates);

      let notificationFailed = false;

      const notification = statusChanged
        ? getReviewNotification(reviewStatus, reason)
        : null;

      // Support both older and newer resident issue records.
      const residentId =
        issueBeingReviewed.userId ??
        issueBeingReviewed.residentId;

      if (
        notification &&
        residentId !== undefined &&
        residentId !== null &&
        residentId !== ""
      ) {
        try {
          await createNotification({
            userId: residentId,
            issueId: issueBeingReviewed.id,
            title: notification.title,
            message: notification.message,
            type: "issue-review",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } catch {
          notificationFailed = true;
        }
      }

      setSelectedIssue(null);
      setReviewReason("");

      setMessage(
        notificationFailed
          ? `Report "${issueBeingReviewed.title || "Untitled issue"}" was reviewed, but its notification could not be created.`
          : `Report "${issueBeingReviewed.title || "Untitled issue"}" has been reviewed.`
      );

      await loadIssues();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the review decision."
      );
    } finally {
      setSaving(false);
    }
  };

  const countByStatus = (status) =>
    reviewQueue.filter((issue) => issue.status === status).length;

  const responseCount =
    reviewQueue.filter(hasResidentResponse).length;

  return (
    <main className="issue-verification-page">
      <header className="issue-verification-header">
        <div>
          <p className="issue-verification-eyebrow">
            ADMIN WORKSPACE
          </p>

          <h1>Issue Verification</h1>

          <p>
            Review incoming reports, read resident responses,
            and decide whether issues can proceed to maintenance
            or external follow-up.
          </p>
        </div>

        <button
          type="button"
          className="issue-verification-refresh"
          onClick={loadIssues}
          disabled={loading || saving}
        >
          <FiRefreshCw className={loading ? "iv-spinning" : ""} />
          Refresh
        </button>
      </header>

      {error && !selectedIssue && (
        <div className="issue-verification-message error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="issue-verification-message success" role="status">
          <FiCheckCircle />
          <span>{message}</span>
        </div>
      )}

      <section className="issue-verification-summary">
        <article>
          <FiClipboard />
          <div>
            <p>Total in Review Queue</p>
            <h2>{reviewQueue.length}</h2>
          </div>
        </article>

        <article>
          <FiAlertCircle />
          <div>
            <p>Awaiting Review</p>
            <h2>{countByStatus("Under Review")}</h2>
          </div>
        </article>

        <article>
          <FiMessageSquare />
          <div>
            <p>Resident Responses</p>
            <h2>{responseCount}</h2>
          </div>
        </article>
      </section>

      <section className="issue-verification-list-section">
        <div className="issue-verification-toolbar">
          <div className="issue-verification-search">
            <FiSearch />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, location, category, ID or response"
              aria-label="Search issue reports"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter reports by status"
          >
            <option value="All">All review statuses</option>

            {REVIEW_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={responseFilter}
            onChange={(event) => setResponseFilter(event.target.value)}
            aria-label="Filter reports by resident response"
          >
            <option value="All">All resident responses</option>
            <option value="Needs attention">Has resident response</option>
            <option value="No response">No resident response</option>
          </select>
        </div>

        {loading ? (
          <div className="issue-verification-empty">
            <FiRefreshCw className="iv-spinning" />
            <p>Loading reports...</p>
          </div>
        ) : error && issues.length === 0 ? (
          <div className="issue-verification-empty">
            <FiAlertCircle />
            <p>Unable to retrieve issue reports.</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="issue-verification-empty">
            <FiShield />
            <h3>No matching reports</h3>
            <p>Reports in the review workflow will appear here.</p>
          </div>
        ) : (
          <div className="issue-verification-grid">
            {filteredIssues.map((issue) => (
              <article className="issue-verification-card" key={issue.id}>
                <div className="issue-verification-card-top">
                  <span className="issue-verification-status">
                    {issue.status || "Under Review"}
                  </span>

                  <span>#{issue.id}</span>
                </div>

                <h3>{issue.title || "Untitled report"}</h3>

                <p className="issue-verification-location">
                  {issue.location || "Location not provided"}
                </p>

                <div className="issue-verification-details">
                  <div>
                    <span>Category</span>
                    <strong>{issue.category || "Unspecified"}</strong>
                  </div>

                  <div>
                    <span>Priority</span>
                    <strong>{issue.priority || "Normal"}</strong>
                  </div>

                  <div>
                    <span>Reported</span>
                    <strong>
                      {formatDate(issue.reportedAt || issue.createdAt)}
                    </strong>
                  </div>
                </div>

                {issue.reviewReason && (
                  <p className="issue-verification-reason">
                    <strong>Admin note:</strong> {issue.reviewReason}
                  </p>
                )}

                {hasResidentResponse(issue) && (
                  <div className="iv-resident-response-preview">
                    <strong>
                      <FiMessageSquare />
                      Resident response received
                    </strong>

                    {issue.residentResponse && (
                      <p>
                        {issue.residentResponse.length > 180
                          ? `${issue.residentResponse.slice(0, 180)}…`
                          : issue.residentResponse}
                      </p>
                    )}

                    {issue.reviewRequested && (
                      <span>
                        <FiRotateCcw /> Review requested
                      </span>
                    )}

                    {issue.additionalInformationSubmittedAt && (
                      <span>
                        <FiCheckCircle /> Additional information submitted
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="issue-verification-review-button"
                  onClick={() => openReview(issue)}
                >
                  <FiEye /> Review Report

                  {hasResidentResponse(issue) && (
                    <span className="iv-response-button-label">
                      Response
                    </span>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedIssue && (
        <div
          className="issue-verification-modal-backdrop"
          onClick={closeReview}
        >
          <section
            className="issue-verification-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-verification-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="issue-verification-modal-header">
              <div>
                <p>REPORT REVIEW</p>

                <h2 id="issue-verification-modal-title">
                  {selectedIssue.title || "Untitled report"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReview}
                aria-label="Close review dialog"
                disabled={saving}
              >
                <FiX />
              </button>
            </div>

            <div className="issue-verification-modal-details">
              <p>
                <strong>Report ID:</strong> #{selectedIssue.id}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {selectedIssue.location || "Not provided"}
              </p>

              <p>
                <strong>Category:</strong>{" "}
                {selectedIssue.category || "Not specified"}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {selectedIssue.description || "No description provided."}
              </p>

              <p>
                <strong>Landmark:</strong>{" "}
                {selectedIssue.landmark || "Not provided"}
              </p>
            </div>

            <section className="iv-resident-response-panel">
              <h3>
                <FiMessageSquare /> Resident response
              </h3>

              {selectedIssue.residentResponse ? (
                <>
                  <div className="iv-resident-response-content">
                    {selectedIssue.residentResponse}
                  </div>

                  <p className="iv-response-meta">
                    <FiClock />
                    Submitted:{" "}
                    {formatDate(
                      selectedIssue.residentResponseAt ||
                        selectedIssue.additionalInformationSubmittedAt ||
                        selectedIssue.reviewRequestedAt
                    )}
                  </p>

                  {selectedIssue.residentResponseType && (
                    <p className="iv-response-meta">
                      <FiUser />
                      Response type: {selectedIssue.residentResponseType}
                    </p>
                  )}

                  {selectedIssue.residentResponseBy && (
                    <p className="iv-response-meta">
                      Resident ID: {selectedIssue.residentResponseBy}
                    </p>
                  )}
                </>
              ) : (
                <p className="iv-no-resident-response">
                  No written response has been submitted for this report.
                </p>
              )}

              {selectedIssue.reviewRequested && (
                <div className="iv-review-request-banner">
                  <FiRotateCcw />

                  <div>
                    <strong>Resident requested a review</strong>

                    <p>
                      Request date:{" "}
                      {formatDate(selectedIssue.reviewRequestedAt)}
                    </p>

                    {selectedIssue.previousReviewStatus && (
                      <p>
                        Previous status: {selectedIssue.previousReviewStatus}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedIssue.additionalInformationSubmittedAt && (
                <div className="iv-additional-info-banner">
                  <FiCheckCircle />

                  <span>
                    Additional information submitted on{" "}
                    {formatDate(
                      selectedIssue.additionalInformationSubmittedAt
                    )}
                  </span>
                </div>
              )}
            </section>

            {getIssueMedia(selectedIssue).length > 0 && (
              <section className="iv-report-media">
                <h3>
                  <FiImage /> Report evidence
                </h3>

                <div className="iv-report-media-grid">
                  {getIssueMedia(selectedIssue).map((media) => (
                    <div className="iv-report-media-item" key={media.url}>
                      {media.isVideo ? (
                        <video
                          src={media.url}
                          controls
                          preload="metadata"
                          aria-label="Resident report video evidence"
                        />
                      ) : (
                        <a
                          href={media.url}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open full report image"
                        >
                          <img
                            src={media.url}
                            alt="Resident-submitted issue evidence"
                            loading="lazy"
                          />
                        </a>
                      )}

                      <p>
                        {media.isVideo ? <FiVideo /> : <FiImage />}
                        {media.isVideo ? "Video evidence" : "Image evidence"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <form onSubmit={saveReview}>
              <div className="issue-verification-form-group">
                <label htmlFor="review-status">Review decision</label>

                <select
                  id="review-status"
                  value={reviewStatus}
                  onChange={(event) => setReviewStatus(event.target.value)}
                  required
                >
                  {REVIEW_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="issue-verification-form-group">
                <label htmlFor="review-reason">Review notes / reason</label>

                <textarea
                  id="review-reason"
                  rows={4}
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  placeholder="Explain the decision or request missing information..."
                />
              </div>

              {error && (
                <div className="issue-verification-message error" role="alert">
                  <FiAlertCircle />
                  <span>{error}</span>
                </div>
              )}

              <div className="issue-verification-modal-actions">
                <button
                  type="button"
                  className="issue-verification-cancel"
                  onClick={closeReview}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="issue-verification-save"
                  disabled={saving}
                >
                  <FiCheckCircle />
                  {saving ? "Saving..." : "Save Review"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default IssueVerification;
