
import { useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiMapPin,
  FiClipboard,
  FiRotateCcw,
  FiImage,
  FiVideo,
} from "react-icons/fi";

import {
  getIssues,
  updateIssue,
  getNotifications,
  createNotification,
} from "../../services/civicPulseService";

import "./ResolutionVerification.css";
function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleString("en-IN");
}

function getMediaUrl(media) {
  if (typeof media === "string") return media;

  return media?.url || media?.secure_url || "";
}

function isVideoMedia(media, url = "") {
  const type = String(
    media?.type || media?.resourceType || media?.resource_type || ""
  ).toLowerCase();

  return (
    type === "video" ||
    /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url)
  );
}

function normalizeEvidence(evidence) {
  const items = Array.isArray(evidence)
    ? evidence
    : evidence
      ? [evidence]
      : [];

  const seen = new Set();

  return items
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
      media,
      url,
      isVideo: isVideoMedia(media, url),
    }));
}

function EvidenceGallery({ title, evidence }) {
  const items = normalizeEvidence(evidence);

  return (
    <section className="resolution-evidence-gallery">
      <h4>{title}</h4>

      {items.length === 0 ? (
        <p className="resolution-no-evidence">
          No evidence uploaded.
        </p>
      ) : (
        <div className="resolution-evidence-media-grid">
          {items.map((item, index) => (
            <div
              className="resolution-evidence-media"
              key={`${item.url}-${index}`}
            >
              {item.isVideo ? (
                <video
                  src={item.url}
                  controls
                  preload="metadata"
                  aria-label={`${title} ${index + 1}`}
                >
                  Your browser does not support video playback.
                </video>
              ) : (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${title.toLowerCase()} ${index + 1}`}
                >
                  <img
                    src={item.url}
                    alt={`${title} ${index + 1}`}
                    loading="lazy"
                  />
                </a>
              )}

              <span>
                {item.isVideo ? <FiVideo /> : <FiImage />}
                {item.isVideo ? "Video evidence" : "Image evidence"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getEvidence(issue, stage) {
  const isBefore = stage === "before";

  const candidates = isBefore
    ? [
        issue.beforeEvidence,
        issue.beforeMedia,
        issue.beforeImageUrl,
        issue.beforeVideoUrl,
        issue.beforeImageUrls,
      ]
    : [
        issue.afterEvidence,
        issue.afterMedia,
        issue.afterImageUrl,
        issue.afterVideoUrl,
        issue.afterImageUrls,
      ];

  return normalizeEvidence(candidates.flat(Infinity));
}

function ResolutionVerification() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [reopenReasons, setReopenReasons] = useState({});

  useEffect(() => {
    loadIssues();
  }, []);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getIssues();

      if (!Array.isArray(data)) {
        throw new Error("The server returned an invalid issue list.");
      }

      setIssues(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load issues for resolution verification."
      );
    } finally {
      setLoading(false);
    }
  };

  const pendingIssues = issues.filter((issue) =>
    [
      "Awaiting Resolution Verification",
      "Pending Resolution Verification",
    ].includes(issue.status)
  );

  const filteredIssues = pendingIssues.filter((issue) => {
    const query = search.trim().toLowerCase();

    return (
      !query ||
      String(issue.title || "").toLowerCase().includes(query) ||
      String(issue.location || "").toLowerCase().includes(query) ||
      String(issue.assignedTeamName || "").toLowerCase().includes(query) ||
      String(issue.category || "").toLowerCase().includes(query)
    );
  });

  const notifyResident = async (issue, action, details = "") => {
    if (issue.userId == null) return false;

    const existingNotifications = await getNotifications();

    const notifications = Array.isArray(existingNotifications)
      ? existingNotifications
      : [];

    const alreadyExists = notifications.some(
      (notification) =>
        String(notification.userId) === String(issue.userId) &&
        String(notification.issueId) === String(issue.id) &&
        notification.type === action.type &&
        notification.actionAt === action.actionAt
    );

    if (alreadyExists) return true;

    await createNotification({
      userId: issue.userId,
      issueId: issue.id,
      title: action.title,
      message: action.message,
      type: action.type,
      isRead: false,
      createdAt: new Date().toISOString(),
      actionAt: action.actionAt,
      details,
    });

    return true;
  };

  const verifyResolution = async (issue) => {
    if (savingId !== null) return;

    const notes = (reviewNotes[issue.id] || "").trim();
    const afterEvidence = getEvidence(issue, "after");

    if (!issue.completionNotes?.trim()) {
      setError(
        "This repair cannot be verified because the maintenance team has not provided completion notes."
      );
      setMessage("");
      return;
    }

    if (afterEvidence.length === 0) {
      setError(
        "This repair cannot be verified because no after-repair evidence was uploaded."
      );
      setMessage("");
      return;
    }

    try {
      setSavingId(issue.id);
      setError("");
      setMessage("");

      const now = new Date().toISOString();

      await updateIssue(issue.id, {
        status: "Resolved",
        adminResolutionNotes: notes,
        resolutionVerifiedAt: now,
        resolvedAt: now,
      });

      let notificationMessage =
        `"${issue.title || "Untitled issue"}" has been marked as resolved.`;

      try {
        const notified = await notifyResident(
          issue,
          {
            title: "Your reported issue has been resolved",
            message: `The repair for "${issue.title || "your reported issue"}" has been verified by the admin and marked as resolved.`,
            type: "resolution-verified",
            actionAt: now,
          },
          notes
        );

        notificationMessage += notified
          ? " The resident notification was created."
          : " The issue was saved, but the reporter account could not be identified for notification.";
      } catch {
        notificationMessage +=
          " However, the resident notification could not be created.";
      }

      setMessage(notificationMessage);
      await loadIssues();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to verify this resolution."
      );
    } finally {
      setSavingId(null);
    }
  };

  const reopenIssue = async (issue) => {
    if (savingId !== null) return;

    const reason = (reopenReasons[issue.id] || "").trim();

    if (!reason) {
      setError(
        "Enter a reason before returning a repair for further work."
      );
      setMessage("");
      return;
    }

    try {
      setSavingId(issue.id);
      setError("");
      setMessage("");

      const now = new Date().toISOString();

      await updateIssue(issue.id, {
        status: "In Progress",
        adminResolutionNotes: reason,
        resolutionVerifiedAt: null,
        resolvedAt: null,
        reopenedAt: now,
        reopenReason: reason,
      });

      let notificationMessage =
        `"${issue.title || "Untitled issue"}" has been returned for further maintenance work.`;

      try {
        const notified = await notifyResident(
          issue,
          {
            title: "Further repair work is required",
            message: `The admin reviewed "${issue.title || "your reported issue"}" and returned it for additional maintenance work.`,
            type: "resolution-reopened",
            actionAt: now,
          },
          reason
        );

        notificationMessage += notified
          ? " The resident notification was created."
          : " The issue was saved, but the reporter account could not be identified for notification.";
      } catch {
        notificationMessage +=
          " However, the resident notification could not be created.";
      }

      setMessage(notificationMessage);

      setReopenReasons((previous) => ({
        ...previous,
        [issue.id]: "",
      }));

      await loadIssues();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reopen this issue."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="resolution-verification-page">
      <header className="resolution-verification-header">
        <div>
          <p className="resolution-eyebrow">ADMINISTRATION</p>
          <h1>Resolution Verification</h1>
          <p>
            Review the actual repair evidence and completion details
            before confirming that a civic issue is resolved.
          </p>
        </div>

        <button
          type="button"
          className="resolution-refresh-button"
          onClick={loadIssues}
          disabled={loading || savingId !== null}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && (
        <div className="resolution-message error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="resolution-message success" role="status">
          <FiCheckCircle />
          <span>{message}</span>
        </div>
      )}

      <section className="resolution-summary">
        <article>
          <FiClipboard />
          <div>
            <p>Awaiting Verification</p>
            <h2>{pendingIssues.length}</h2>
          </div>
        </article>

        <article>
          <FiCheckCircle />
          <div>
            <p>Resolved Issues</p>
            <h2>
              {issues.filter((issue) => issue.status === "Resolved").length}
            </h2>
          </div>
        </article>
      </section>

      <section className="resolution-list-section">
        <div className="resolution-list-heading">
          <div>
            <h2>Completed Repairs Awaiting Review</h2>
            <p>
              Inspect before-and-after evidence, then verify the repair
              or return it for further work.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search issues..."
            aria-label="Search issues awaiting verification"
          />
        </div>

        {loading ? (
          <div className="resolution-empty">
            <FiRefreshCw />
            <p>Loading resolution requests...</p>
          </div>
        ) : error && issues.length === 0 ? (
          <div className="resolution-empty">
            <FiAlertCircle />
            <p>Unable to load resolution requests.</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="resolution-empty">
            <FiCheckCircle />
            <h3>No repairs awaiting verification</h3>
            <p>
              When a maintenance team submits a completed repair, it
              will appear here.
            </p>
          </div>
        ) : (
          <div className="resolution-grid">
            {filteredIssues.map((issue) => {
              const beforeEvidence = getEvidence(issue, "before");
              const afterEvidence = getEvidence(issue, "after");

              return (
                <article className="resolution-card" key={issue.id}>
                  <div className="resolution-card-top">
                    <span className="resolution-status">
                      {issue.status}
                    </span>
                    <span className="resolution-issue-id">
                      #{issue.id}
                    </span>
                  </div>

                  <h3>{issue.title || "Untitled issue"}</h3>

                  <p className="resolution-location">
                    <FiMapPin />
                    {issue.location || "Location not provided"}
                  </p>

                  <div className="resolution-detail">
                    <span>Category</span>
                    <strong>
                      {issue.category || issue.type || "Not recorded"}
                    </strong>
                  </div>

                  <div className="resolution-detail">
                    <span>Maintenance team</span>
                    <strong>
                      {issue.assignedTeamName || "Not recorded"}
                    </strong>
                  </div>

                  <div className="resolution-detail">
                    <span>Completion submitted</span>
                    <strong>
                      {formatDate(
                        issue.submittedForVerificationAt ||
                          issue.completedAt
                      )}
                    </strong>
                  </div>

                  <div className="resolution-evidence">
                    <h4>Completion Notes</h4>
                    <p>
                      {issue.completionNotes ||
                        "No completion notes provided."}
                    </p>

                    <EvidenceGallery
                      title="Before Repair"
                      evidence={beforeEvidence}
                    />

                    <EvidenceGallery
                      title="After Repair"
                      evidence={afterEvidence}
                    />
                  </div>

                  <div className="resolution-review-field">
                    <label htmlFor={`review-${issue.id}`}>
                      Admin verification notes
                    </label>
                    <textarea
                      id={`review-${issue.id}`}
                      rows={3}
                      value={reviewNotes[issue.id] || ""}
                      onChange={(event) =>
                        setReviewNotes((previous) => ({
                          ...previous,
                          [issue.id]: event.target.value,
                        }))
                      }
                      placeholder="Record the verification decision..."
                    />
                  </div>

                  <div className="resolution-review-field">
                    <label htmlFor={`reopen-${issue.id}`}>
                      Reason for reopening
                    </label>
                    <textarea
                      id={`reopen-${issue.id}`}
                      rows={2}
                      value={reopenReasons[issue.id] || ""}
                      onChange={(event) =>
                        setReopenReasons((previous) => ({
                          ...previous,
                          [issue.id]: event.target.value,
                        }))
                      }
                      placeholder="Required only if the repair needs more work"
                    />
                  </div>

                  <div className="resolution-actions">
                    <button
                      type="button"
                      className="resolution-approve-button"
                      onClick={() => verifyResolution(issue)}
                      disabled={savingId !== null}
                    >
                      <FiCheckCircle />
                      {savingId === issue.id
                        ? "Saving..."
                        : "Verify Resolution"}
                    </button>

                    <button
                      type="button"
                      className="resolution-reopen-button"
                      onClick={() => reopenIssue(issue)}
                      disabled={savingId !== null}
                    >
                      <FiRotateCcw /> Reopen
                    </button>
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

export default ResolutionVerification;
