
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiMapPin,
  FiCalendar,
  FiTag,
  FiAlertCircle,
  FiClock,
  FiCheckCircle,
  FiRefreshCw,
  FiTool,
  FiImage,
  FiVideo,
  FiPhone,
  FiMail,
  FiExternalLink,
} from "react-icons/fi";

import { fetchIssues } from "../../features/issues/issuesSlice";
import { getOrganizations } from "../../services/civicPulseService";
import "./IssueDetails.css";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMediaUrl(media) {
  if (typeof media === "string") return media;
  return media?.url || media?.secure_url || "";
}

function isVideoMedia(media, url = "") {
  if (
    media?.type === "video" ||
    media?.resourceType === "video" ||
    media?.resource_type === "video"
  ) {
    return true;
  }

  if (
    media?.format &&
    ["mp4", "webm", "mov", "m4v", "ogg"].includes(
      String(media.format).toLowerCase()
    )
  ) {
    return true;
  }

  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url);
}

function normalizeEvidence(values, label) {
  const items = (Array.isArray(values) ? values : [values]).filter(Boolean);
  const seenUrls = new Set();

  return items
    .map((media, index) => ({
      media,
      label: `${label} ${index + 1}`,
      url: getMediaUrl(media),
    }))
    .filter(({ url }) => {
      if (!url || seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });
}

function MediaItem({ media, label }) {
  const url = getMediaUrl(media);

  if (!url) return null;

  const video = isVideoMedia(media, url);

  return (
    <div className="issue-details-evidence-item">
      <h3 className="issue-details-evidence-title">
        {video ? (
          <FiVideo aria-hidden="true" />
        ) : (
          <FiImage aria-hidden="true" />
        )}
        <span>{label}</span>
      </h3>

      {video ? (
        <video
          className="issue-details-evidence-media"
          src={url}
          controls
          preload="metadata"
          aria-label={label}
        >
          Your browser does not support video playback.
        </video>
      ) : (
        <a
          className="issue-details-evidence-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label} in a new tab`}
        >
          <img
            className="issue-details-evidence-media"
            src={url}
            alt={label}
            loading="lazy"
          />
        </a>
      )}
    </div>
  );
}

function IssueDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const [organizations, setOrganizations] = useState([]);

  const {
    items = [],
    loading = false,
    error = null,
  } = useSelector((state) => state.issues || {});

  useEffect(() => {
    const issueExists = items.some(
      (item) => String(item.id) === String(id)
    );

    if (!issueExists && !loading) {
      dispatch(fetchIssues());
    }
  }, [dispatch, id, items, loading]);

  useEffect(() => {
    let cancelled = false;

    const loadOrganizations = async () => {
      try {
        const data = await getOrganizations();

        if (!cancelled && Array.isArray(data)) {
          setOrganizations(data);
        }
      } catch {
        // Keep issue details available if organisation data cannot load.
      }
    };

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, []);

  const issue = items.find(
    (item) => String(item.id) === String(id)
  );

  if (loading && !issue) {
    return (
      <main className="issue-details-page">
        <div className="issue-details-message" role="status">
          <FiRefreshCw className="issue-details-spinner" />
          <h2>Loading issue details...</h2>
          <p>Please wait while we retrieve the issue.</p>
        </div>
      </main>
    );
  }

  if (error && !issue) {
    return (
      <main className="issue-details-page">
        <div className="issue-details-message" role="alert">
          <FiAlertCircle />
          <h2>Unable to load issue</h2>
          <p>{error}</p>

          <button
            type="button"
            className="issue-details-button"
            onClick={() => dispatch(fetchIssues())}
            disabled={loading}
          >
            {loading ? "Loading..." : "Try Again"}
          </button>

          <Link to="/explore" className="issue-details-back">
            <FiArrowLeft />
            Back to Explore Issues
          </Link>
        </div>
      </main>
    );
  }

  if (!issue) {
    return (
      <main className="issue-details-page">
        <div className="issue-details-message">
          <FiAlertCircle />
          <h2>Issue not found</h2>
          <p>
            This issue may have been removed or the link may be incorrect.
          </p>

          <Link to="/explore" className="issue-details-button">
            Explore Issues
          </Link>
        </div>
      </main>
    );
  }

  const status = issue.status || "Under Review";
  const category = issue.category || issue.type || "General";
  const title = issue.title || issue.issueTitle || "Reported Issue";

  const location =
    issue.location ||
    issue.address ||
    issue.area ||
    "Location not provided";

  const description =
    issue.description ||
    issue.details ||
    "No description has been provided for this issue.";

  const reportedDate =
    issue.reportedAt ||
    issue.createdAt ||
    issue.date ||
    issue.created_at;

  const priority = issue.priority || "Not assigned";

  const statusClass = status
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Match the organisation selected by the admin with saved organisation data.
  const assignedOrganizationName = String(
    issue.externalOrganization || ""
  ).trim();

  const assignedOrganization = organizations.find(
    (organization) =>
      String(organization.name || "").trim().toLowerCase() ===
      assignedOrganizationName.toLowerCase()
  );

  const hasExternalFollowUp =
    Boolean(assignedOrganizationName) ||
    issue.responsibility === "External Organization" ||
    issue.responsibility === "External" ||
    Boolean(issue.externalWorkCompletedAt);

  const reportMedia = normalizeEvidence(
    [
      issue.media,
      issue.imageUrl,
      issue.image,
      issue.photo,
      issue.videoUrl,
      issue.imageUrls,
      issue.mediaItems,
    ].flat(Infinity),
    "Reported evidence"
  );

  const beforeEvidence = normalizeEvidence(
    [
      issue.beforeEvidence,
      issue.beforeMedia,
      issue.beforeImageUrl,
      issue.beforeVideoUrl,
      issue.beforeImageUrls,
    ].flat(Infinity),
    "Before repair"
  );

  const afterEvidence = normalizeEvidence(
    [
      issue.afterEvidence,
      issue.afterMedia,
      issue.afterImageUrl,
      issue.afterVideoUrl,
      issue.afterImageUrls,
    ].flat(Infinity),
    "After repair"
  );

  const externalHistory = Array.isArray(issue.externalFollowUpHistory)
    ? issue.externalFollowUpHistory
    : [];

  const timeline = [
    {
      title: "Issue reported",
      date: reportedDate,
      icon: <FiCheckCircle />,
    },
    ...(issue.reviewedAt
      ? [
          {
            title: "Report reviewed",
            date: issue.reviewedAt,
            detail: issue.reviewReason,
            icon: <FiCheckCircle />,
          },
        ]
      : []),
    ...(issue.assignedAt
      ? [
          {
            title: "Maintenance team assigned",
            date: issue.assignedAt,
            detail: issue.assignedTeamName,
            icon: <FiTool />,
          },
        ]
      : []),
    ...(issue.acceptedAt
      ? [
          {
            title: "Job accepted",
            date: issue.acceptedAt,
            icon: <FiCheckCircle />,
          },
        ]
      : []),
    ...(issue.startedAt || issue.inProgressAt
      ? [
          {
            title: "Repair started",
            date: issue.startedAt || issue.inProgressAt,
            icon: <FiTool />,
          },
        ]
      : []),
    ...externalHistory.map((entry, index) => ({
      title: entry.action || "External follow-up updated",
      date: entry.recordedAt,
      detail: [
        entry.status,
        entry.notes,
      ]
        .filter(Boolean)
        .join(" — "),
      icon: <FiExternalLink />,
      key: `external-${index}`,
    })),
    ...(issue.submittedForVerificationAt || issue.completedAt
      ? [
          {
            title: "Repair submitted for verification",
            date:
              issue.submittedForVerificationAt || issue.completedAt,
            detail: issue.completionNotes,
            icon: <FiCheckCircle />,
          },
        ]
      : []),
    ...(issue.externalWorkCompletedAt
      ? [
          {
            title: "External work marked complete",
            date: issue.externalWorkCompletedAt,
            icon: <FiCheckCircle />,
          },
        ]
      : []),
    ...(issue.resolutionVerifiedAt || issue.resolvedAt
      ? [
          {
            title: "Resolution verified",
            date: issue.resolutionVerifiedAt || issue.resolvedAt,
            detail: issue.adminResolutionNotes,
            icon: <FiCheckCircle />,
          },
        ]
      : []),
    ...(issue.reopenedAt
      ? [
          {
            title: "Issue reopened",
            date: issue.reopenedAt,
            detail: issue.reopenReason,
            icon: <FiRefreshCw />,
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  return (
    <main className="issue-details-page">
      <div className="issue-details-container">
        <Link to="/explore" className="issue-details-back">
          <FiArrowLeft />
          <span>Back to Explore Issues</span>
        </Link>

        <section className="issue-details-header">
          <div>
            <span className="issue-details-eyebrow">
              CIVICPULSE / ISSUE DETAILS
            </span>

            <h1>{title}</h1>

            <p>
              Review the report, location, and current progress of this
              neighbourhood issue.
            </p>
          </div>

          <span className={`issue-details-status status-${statusClass}`}>
            {status}
          </span>
        </section>

        <div className="issue-details-layout">
          <section className="issue-details-main">
            <article className="issue-details-card">
              {reportMedia.length > 0 ? (
                <div className="issue-details-media-grid">
                  {reportMedia.map((item, index) => (
                    <MediaItem
                      key={`${item.url}-${index}`}
                      media={item.media}
                      label={item.label}
                    />
                  ))}
                </div>
              ) : (
                <div className="issue-details-image-placeholder">
                  <FiAlertCircle />
                  <span>No issue photo or video available</span>
                </div>
              )}

              <div className="issue-details-card-body">
                <div className="issue-details-section-title">
                  <FiAlertCircle />
                  <h2>Issue Description</h2>
                </div>

                <p className="issue-details-description">{description}</p>

                <div className="issue-details-divider" />

                <div className="issue-details-section-title">
                  <FiMapPin />
                  <h2>Reported Location</h2>
                </div>

                <p className="issue-details-location">
                  <FiMapPin />
                  <span>{location}</span>
                </p>

                {issue.landmark && (
                  <p className="issue-details-extra">
                    <strong>Landmark:</strong> {issue.landmark}
                  </p>
                )}
              </div>
            </article>

            {hasExternalFollowUp && (
              <article className="issue-details-card">
                <div className="issue-details-card-body">
                  <div className="issue-details-section-title">
                    <FiExternalLink />
                    <h2>External Organisation</h2>
                  </div>

                  <p className="issue-details-description">
                    This issue requires follow-up with an external
                    organisation.
                  </p>

                  <div className="issue-details-divider" />

                  <div className="issue-details-info-row">
                    <span className="issue-details-info-icon">
                      <FiExternalLink />
                    </span>
                    <div>
                      <span>Organisation name</span>
                      <strong>
                        {assignedOrganizationName || "Not assigned yet"}
                      </strong>
                    </div>
                  </div>

                  {assignedOrganization && (
                    <>
                      <div className="issue-details-info-row">
                        <span className="issue-details-info-icon">
                          <FiPhone />
                        </span>
                        <div>
                          <span>Phone</span>
                          {assignedOrganization.phone ? (
                            <a
                              href={`tel:${assignedOrganization.phone}`}
                              className="issue-details-contact-link"
                            >
                              {assignedOrganization.phone}
                            </a>
                          ) : (
                            <strong>Not provided</strong>
                          )}
                        </div>
                      </div>

                      <div className="issue-details-info-row">
                        <span className="issue-details-info-icon">
                          <FiMail />
                        </span>
                        <div>
                          <span>Email</span>
                          {assignedOrganization.email ? (
                            <a
                              href={`mailto:${assignedOrganization.email}`}
                              className="issue-details-contact-link"
                            >
                              {assignedOrganization.email}
                            </a>
                          ) : (
                            <strong>Not provided</strong>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="issue-details-info-row">
                    <span className="issue-details-info-icon">
                      <FiClock />
                    </span>
                    <div>
                      <span>Follow-up status</span>
                      <strong>{status}</strong>
                    </div>
                  </div>

                  <div className="issue-details-info-row">
                    <span className="issue-details-info-icon">
                      <FiTag />
                    </span>
                    <div>
                      <span>Reference number</span>
                      <strong>
                        {issue.externalReference || "Not recorded"}
                      </strong>
                    </div>
                  </div>

                  <div className="issue-details-info-row">
                    <span className="issue-details-info-icon">
                      <FiCalendar />
                    </span>
                    <div>
                      <span>Next follow-up date</span>
                      <strong>
                        {issue.nextFollowUpDate
                          ? formatDate(issue.nextFollowUpDate)
                          : "Not scheduled"}
                      </strong>
                    </div>
                  </div>

                  {issue.externalNotes && (
                    <>
                      <div className="issue-details-divider" />
                      <h3>Latest Follow-up Update</h3>
                      <p className="issue-details-description">
                        {issue.externalNotes}
                      </p>
                    </>
                  )}

                  {assignedOrganization && (
                    <p className="issue-details-note">
                      Contact details are provided for this issue's
                      external referral.
                    </p>
                  )}
                </div>
              </article>
            )}

            {(beforeEvidence.length > 0 || afterEvidence.length > 0) && (
              <article className="issue-details-card issue-details-progress">
                <div className="issue-details-card-body">
                  <div className="issue-details-section-title">
                    <FiTool />
                    <h2>Maintenance Evidence</h2>
                  </div>

                  {beforeEvidence.length > 0 && (
                    <section className="issue-details-media-section">
                      <h3 className="issue-details-subheading">
                        Before Repair
                      </h3>

                      <div className="issue-details-media-grid">
                        {beforeEvidence.map((item, index) => (
                          <MediaItem
                            key={`before-${item.url}-${index}`}
                            media={item.media}
                            label={item.label}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {afterEvidence.length > 0 && (
                    <section className="issue-details-media-section">
                      <h3 className="issue-details-subheading">
                        After Repair
                      </h3>

                      <div className="issue-details-media-grid">
                        {afterEvidence.map((item, index) => (
                          <MediaItem
                            key={`after-${item.url}-${index}`}
                            media={item.media}
                            label={item.label}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </article>
            )}

            <article className="issue-details-card issue-details-progress">
              <div className="issue-details-card-body">
                <div className="issue-details-section-title">
                  <FiClock />
                  <h2>Issue Progress</h2>
                </div>

                <div className="issue-details-timeline">
                  {timeline.map((item, index) => (
                    <div
                      className="issue-details-timeline-item"
                      key={item.key || `${item.title}-${index}`}
                    >
                      <span className="issue-details-timeline-icon">
                        {item.icon}
                      </span>

                      <div>
                        <h3>{item.title}</h3>
                        <p>{formatDate(item.date)}</p>

                        {item.detail && <p>{item.detail}</p>}
                      </div>
                    </div>
                  ))}

                  <div className="issue-details-timeline-item">
                    <span className="issue-details-timeline-icon">
                      {status === "Resolved" ? (
                        <FiCheckCircle />
                      ) : (
                        <FiClock />
                      )}
                    </span>

                    <div>
                      <h3>Current status</h3>
                      <p>{status}</p>

                      {issue.reviewReason &&
                        !timeline.some(
                          (item) => item.detail === issue.reviewReason
                        ) && <p>{issue.reviewReason}</p>}

                      {issue.reopenReason &&
                        !timeline.some(
                          (item) => item.detail === issue.reopenReason
                        ) && <p>{issue.reopenReason}</p>}
                    </div>
                  </div>

                  {issue.updatedAt && (
                    <div className="issue-details-timeline-item">
                      <span className="issue-details-timeline-icon">
                        <FiRefreshCw />
                      </span>

                      <div>
                        <h3>Last updated</h3>
                        <p>{formatDate(issue.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          </section>

          <aside className="issue-details-sidebar">
            <article className="issue-details-card">
              <h2>Issue Information</h2>

              <div className="issue-details-info-row">
                <span className="issue-details-info-icon">
                  <FiTag />
                </span>
                <div>
                  <span>Category</span>
                  <strong>{category}</strong>
                </div>
              </div>

              <div className="issue-details-info-row">
                <span className="issue-details-info-icon">
                  <FiAlertCircle />
                </span>
                <div>
                  <span>Priority</span>
                  <strong>{priority}</strong>
                </div>
              </div>

              <div className="issue-details-info-row">
                <span className="issue-details-info-icon">
                  <FiCalendar />
                </span>
                <div>
                  <span>Reported on</span>
                  <strong>{formatDate(reportedDate)}</strong>
                </div>
              </div>

              <div className="issue-details-divider" />

              <p className="issue-details-note">
                Issue updates and resolution are managed through the
                CivicPulse verification and maintenance workflow.
              </p>

              <Link to="/explore" className="issue-details-button">
                Explore Other Issues
              </Link>
            </article>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default IssueDetails;
