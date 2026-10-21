
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiMapPin,
  FiPlay,
  FiSend,
  FiTool,
  FiUpload,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";

import api from "../../services/api";
import { createNotification } from "../../services/civicPulseService";
import { uploadMedia as uploadCloudinaryMedia } from "../../services/cloudinaryService";
import "./MaintenanceJobDetails.css";

const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const formatDate = (date) => {
  if (!date) return "Not recorded";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return parsedDate.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const isVerificationPending = (status) =>
  [
    "Awaiting Resolution Verification",
    "Pending Resolution Verification",
  ].includes(status);

const getEvidence = (issue, stage) => {
  const evidence = issue[`${stage}Evidence`];

  if (evidence?.url) return evidence;

  const imageUrl = issue[`${stage}ImageUrl`];
  const videoUrl = issue[`${stage}VideoUrl`];

  if (imageUrl) return { url: imageUrl, type: "image" };
  if (videoUrl) return { url: videoUrl, type: "video" };

  return null;
};

const getResidentEvidence = (issue) => {
  if (issue.media?.url) return issue.media;

  if (Array.isArray(issue.media) && issue.media.length > 0) {
    return issue.media.find((item) => item?.url) || null;
  }

  if (issue.imageUrl) {
    return { url: issue.imageUrl, type: "image" };
  }

  if (issue.videoUrl) {
    return { url: issue.videoUrl, type: "video" };
  }

  return null;
};

const isVideoEvidence = (evidence) =>
  evidence?.type === "video" ||
  evidence?.resourceType === "video" ||
  String(evidence?.mimeType || "").startsWith("video/");

const friendlyUploadError = (error, mediaName = "file") => {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("5 mb") ||
    message.includes("25 mb") ||
    message.includes("supported formats") ||
    message.includes("supported image") ||
    message.includes("supported video") ||
    message.includes("select a file")
  ) {
    return error.message;
  }

  if (
    message.includes("internet") ||
    message.includes("network") ||
    message.includes("failed to fetch")
  ) {
    return "Connection problem. Please check your internet and try again.";
  }

  return `Unable to upload your ${mediaName}. Please try again.`;
};

function MaintenanceJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [progressNote, setProgressNote] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");

  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState("");
  const [afterPreview, setAfterPreview] = useState("");

  useEffect(() => {
    let active = true;

    async function loadIssue() {
      try {
        setLoading(true);
        setError("");
        setIssue(null);

        const selectedTeamId =
          localStorage.getItem("civicPulseTeamId") || "";

        if (!selectedTeamId) {
          throw new Error(
            "No maintenance team is selected. Return to the maintenance dashboard and select your demo team."
          );
        }

        const response = await api.get(`/issues/${id}`);
        const loadedIssue = response.data;

        if (!loadedIssue) {
          throw new Error("This issue could not be found.");
        }

        if (
          loadedIssue.assignedTeamId == null ||
          String(loadedIssue.assignedTeamId) !== String(selectedTeamId)
        ) {
          throw new Error(
            "This job is not assigned to the currently selected team. Return to the dashboard and choose the correct team."
          );
        }

        if (active) {
          setIssue(loadedIssue);
          setCompletionNotes(loadedIssue.completionNotes || "");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.status === 404
              ? "This job could not be found."
              : err.message ||
                  "Unable to load this job. Please check the backend connection."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadIssue();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (beforePreview) URL.revokeObjectURL(beforePreview);
    };
  }, [beforePreview]);

  useEffect(() => {
    return () => {
      if (afterPreview) URL.revokeObjectURL(afterPreview);
    };
  }, [afterPreview]);

  function handleMediaChange(event, stage) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG, WEBP image or MP4, WEBM, MOV video.");
      event.target.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const maxSize = isImage
      ? 5 * 1024 * 1024
      : 25 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        isImage
          ? "Images must be 5 MB or smaller."
          : "Videos must be 25 MB or smaller."
      );
      event.target.value = "";
      return;
    }

    setError("");
    setSuccess("");

    const preview = URL.createObjectURL(file);

    if (stage === "before") {
      setBeforeFile(file);
      setBeforePreview(preview);
    } else {
      setAfterFile(file);
      setAfterPreview(preview);
    }
  }

  function removeEvidence(stage) {
    if (stage === "before") {
      setBeforeFile(null);
      setBeforePreview("");

      const input = document.getElementById("beforePhoto");
      if (input) input.value = "";
    } else {
      setAfterFile(null);
      setAfterPreview("");

      const input = document.getElementById("afterPhoto");
      if (input) input.value = "";
    }
  }

  const updateIssue = async (updates, successMessage) => {
    if (!issue || saving || uploading) return false;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const selectedTeamId =
        localStorage.getItem("civicPulseTeamId") || "";

      if (
        !selectedTeamId ||
        String(issue.assignedTeamId) !== String(selectedTeamId)
      ) {
        setError("The selected team does not match this assigned job.");
        return false;
      }

      const response = await api.patch(`/issues/${id}`, updates);

      setIssue(response.data);
      setSuccess(successMessage);

      return true;
    } catch {
      setError("Unable to save the changes. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const acceptJob = async () => {
    if (!issue || issue.status !== "Assigned") return;

    await updateIssue(
      {
        status: "Accepted",
        acceptedAt: new Date().toISOString(),
      },
      "Job accepted successfully."
    );
  };

  const startWork = async () => {
    if (!issue || issue.status !== "Accepted") return;

    await updateIssue(
      {
        status: "In Progress",
        startedAt: new Date().toISOString(),
      },
      "Repair work has started."
    );
  };

  const addProgressUpdate = async (event) => {
    event.preventDefault();

    if (!progressNote.trim()) {
      setError("Please enter a progress update.");
      return;
    }

    if (issue?.status !== "In Progress") {
      setError("Progress updates can only be added while work is in progress.");
      return;
    }

    const existingUpdates = Array.isArray(issue.progressUpdates)
      ? issue.progressUpdates
      : [];

    const saved = await updateIssue(
      {
        progressUpdates: [
          ...existingUpdates,
          {
            id: `${Date.now()}`,
            note: progressNote.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      },
      "Progress update added successfully."
    );

    if (saved) setProgressNote("");
  };

  const notifyAdminsAboutRepair = async (savedIssue) => {
    const response = await api.get("/users");
    const users = Array.isArray(response.data) ? response.data : [];

    const admins = users.filter((user) => {
      const role = String(user.role || user.userRole || "")
        .trim()
        .toLowerCase();

      return role === "admin" && user.id != null;
    });

    if (admins.length === 0) {
      return {
        sent: 0,
        message:
          "The repair was saved, but no admin accounts were found to notify.",
      };
    }

    const results = await Promise.allSettled(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          issueId: savedIssue.id,
          title: "Repair submitted for verification",
          message: `The maintenance team has submitted "${savedIssue.title || "Untitled issue"}" for verification. Review the before-and-after evidence and completion notes.`,
          type: "resolution-verification",
          isRead: false,
          createdAt: new Date().toISOString(),
        })
      )
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled"
    ).length;

    return {
      sent,
      message:
        sent === admins.length
          ? ""
          : `The repair was saved, but notifications were created for only ${sent} of ${admins.length} admin account(s).`,
    };
  };

  const submitForVerification = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!issue || uploading || saving) return;

    if (issue.status !== "In Progress") {
      setError("Only jobs currently in progress can be submitted.");
      return;
    }

    if (!completionNotes.trim()) {
      setError("Please enter the repair completion notes.");
      return;
    }

    if (!beforeFile || !afterFile) {
      setError(
        "Both before-repair and after-repair image or video evidence are required."
      );
      return;
    }

    const selectedTeamId =
      localStorage.getItem("civicPulseTeamId") || "";

    if (
      !selectedTeamId ||
      String(issue.assignedTeamId) !== String(selectedTeamId)
    ) {
      setError("The selected team does not match this assigned job.");
      return;
    }

    try {
      setUploading(true);
      setSuccess("Uploading before-repair evidence...");

      let beforeUpload;

      try {
        beforeUpload = await uploadCloudinaryMedia(
          beforeFile,
          "civicpulse/maintenance/before-repair"
        );
      } catch (uploadError) {
        throw new Error(
          friendlyUploadError(
            uploadError,
            beforeFile.type.startsWith("video/") ? "video" : "image"
          )
        );
      }

      if (!beforeUpload?.url) {
        throw new Error(
          "Unable to upload your before-repair evidence. Please try again."
        );
      }

      const beforeEvidence = {
        ...beforeUpload,
        originalName: beforeFile.name,
        mimeType: beforeFile.type,
        type: beforeFile.type.startsWith("video/") ? "video" : "image",
      };

      setSuccess("Uploading after-repair evidence...");

      let afterUpload;

      try {
        afterUpload = await uploadCloudinaryMedia(
          afterFile,
          "civicpulse/maintenance/after-repair"
        );
      } catch (uploadError) {
        throw new Error(
          friendlyUploadError(
            uploadError,
            afterFile.type.startsWith("video/") ? "video" : "image"
          )
        );
      }

      if (!afterUpload?.url) {
        throw new Error(
          "Unable to upload your after-repair evidence. Please try again."
        );
      }

      const afterEvidence = {
        ...afterUpload,
        originalName: afterFile.name,
        mimeType: afterFile.type,
        type: afterFile.type.startsWith("video/") ? "video" : "image",
      };

      setSuccess("Saving repair details...");

      const now = new Date().toISOString();

      const response = await api.patch(`/issues/${id}`, {
        status: "Awaiting Resolution Verification",
        completionNotes: completionNotes.trim(),
        beforeEvidence,
        afterEvidence,

        beforeImageUrl:
          beforeEvidence.type === "image" ? beforeEvidence.url : "",
        beforeVideoUrl:
          beforeEvidence.type === "video" ? beforeEvidence.url : "",

        afterImageUrl:
          afterEvidence.type === "image" ? afterEvidence.url : "",
        afterVideoUrl:
          afterEvidence.type === "video" ? afterEvidence.url : "",

        beforePhotoName: beforeEvidence.url,
        afterPhotoName: afterEvidence.url,

        completedAt: now,
        submittedForVerificationAt: now,
      });

      setIssue(response.data);

      setBeforeFile(null);
      setAfterFile(null);
      setBeforePreview("");
      setAfterPreview("");

      const beforeInput = document.getElementById("beforePhoto");
      const afterInput = document.getElementById("afterPhoto");

      if (beforeInput) beforeInput.value = "";
      if (afterInput) afterInput.value = "";

      setSuccess("Repair submitted. Sending admin notification...");

      try {
        const notificationResult = await notifyAdminsAboutRepair(
          response.data
        );

        if (notificationResult.message) {
          setSuccess("Repair submitted successfully.");
          setError(notificationResult.message);
        } else {
          setSuccess(
            `Repair submitted successfully. ${notificationResult.sent} admin notification(s) created.`
          );
        }
      } catch {
        setSuccess("Repair submitted successfully.");
        setError(
          "The repair was saved, but admin notifications could not be created. Please try again later."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to submit the repair. Please try again."
      );
      setSuccess("");
    } finally {
      setUploading(false);
    }
  };

  const renderEvidencePreview = (file, preview, stage) => {
    if (!file || !preview) return null;

    const video = file.type.startsWith("video/");

    return (
      <div className="mjd-evidence-preview">
        {video ? (
          <video src={preview} controls />
        ) : (
          <img src={preview} alt={`${stage} repair evidence preview`} />
        )}

        <button
          type="button"
          className="mjd-evidence-remove"
          onClick={() => removeEvidence(stage)}
          disabled={uploading || saving}
        >
          <FiX />
          Remove selected file
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="mjd-page">
        <div className="mjd-message">Loading job details...</div>
      </main>
    );
  }

  if (error && !issue) {
    return (
      <main className="mjd-page">
        <div className="mjd-message mjd-error">
          <FiAlertCircle />
          <p>{error}</p>
          <Link to="/maintenance">Back to maintenance dashboard</Link>
        </div>
      </main>
    );
  }

  if (!issue) return null;

  const status = issue.status || "Assigned";
  const awaitingVerification = isVerificationPending(status);
  const resolved = status === "Resolved";

  const beforeStoredEvidence = getEvidence(issue, "before");
  const afterStoredEvidence = getEvidence(issue, "after");
  const residentEvidence = getResidentEvidence(issue);

  return (
    <main className="mjd-page">
      <div className="mjd-container">
        <Link to="/maintenance" className="mjd-back">
          <FiArrowLeft />
          Back to Maintenance Dashboard
        </Link>

        <section className="mjd-heading">
          <div>
            <span className="mjd-eyebrow">
              <FiTool />
              MAINTENANCE WORKSPACE
            </span>
            <h1>{issue.title || "Untitled issue"}</h1>
            <p>
              Review the issue details and record each stage of the repair.
            </p>
          </div>

          <span
            className={`mjd-status ${
              resolved
                ? "mjd-status-success"
                : awaitingVerification
                  ? "mjd-status-pending"
                  : "mjd-status-active"
            }`}
          >
            {status}
          </span>
        </section>

        {error && (
          <div className="mjd-alert mjd-alert-error" role="alert">
            <FiAlertCircle />
            {error}
          </div>
        )}

        {success && (
          <div className="mjd-alert mjd-alert-success" role="status">
            <FiCheckCircle />
            {success}
          </div>
        )}

        <div className="mjd-layout">
          <div className="mjd-main-column">
            <section className="mjd-card">
              <div className="mjd-card-heading">
                <span className="mjd-icon">
                  <FiFileText />
                </span>
                <div>
                  <h2>Issue Information</h2>
                  <p>Details submitted by the resident</p>
                </div>
              </div>

              <div className="mjd-info-grid">
                <div>
                  <span className="mjd-label">Issue ID</span>
                  <strong>#{issue.id}</strong>
                </div>
                <div>
                  <span className="mjd-label">Category</span>
                  <strong>{issue.category || "Not specified"}</strong>
                </div>
                <div>
                  <span className="mjd-label">Priority</span>
                  <strong>{issue.priority || "Normal"}</strong>
                </div>
                <div>
                  <span className="mjd-label">Reported On</span>
                  <strong>
                    {formatDate(issue.createdAt || issue.reportedAt)}
                  </strong>
                </div>
              </div>

              <div className="mjd-description">
                <span className="mjd-label">Description</span>
                <p>{issue.description || "No description provided."}</p>
              </div>

              <div className="mjd-location">
                <FiMapPin />
                <div>
                  <span className="mjd-label">Location</span>
                  <strong>{issue.location || "Location not provided"}</strong>
                  {issue.landmark && <p>Landmark: {issue.landmark}</p>}
                </div>
              </div>

              {residentEvidence?.url && (
                <div className="mjd-description">
                  <span className="mjd-label">Resident Evidence</span>

                  {isVideoEvidence(residentEvidence) ? (
                    <video
                      className="mjd-stored-evidence"
                      src={residentEvidence.url}
                      controls
                    />
                  ) : (
                    <a
                      href={residentEvidence.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className="mjd-stored-evidence"
                        src={residentEvidence.url}
                        alt="Resident-submitted issue evidence"
                      />
                    </a>
                  )}
                </div>
              )}
            </section>

            <section className="mjd-card">
              <div className="mjd-card-heading">
                <span className="mjd-icon">
                  <FiClock />
                </span>
                <div>
                  <h2>Repair Progress</h2>
                  <p>Keep a record of the work performed</p>
                </div>
              </div>

              {Array.isArray(issue.progressUpdates) &&
              issue.progressUpdates.length > 0 ? (
                <div className="mjd-timeline">
                  {issue.progressUpdates.map((update, index) => (
                    <div
                      className="mjd-timeline-item"
                      key={update.id || index}
                    >
                      <span className="mjd-timeline-dot" />
                      <div>
                        <p>{update.note}</p>
                        <span>{formatDate(update.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mjd-empty">
                  No progress updates have been added yet.
                </p>
              )}

              {status === "In Progress" && (
                <form
                  className="mjd-progress-form"
                  onSubmit={addProgressUpdate}
                >
                  <label htmlFor="progressNote">Add progress update</label>
                  <textarea
                    id="progressNote"
                    value={progressNote}
                    onChange={(event) => setProgressNote(event.target.value)}
                    placeholder="Example: Inspected the damaged streetlight and identified the fault."
                    rows={3}
                  />

                  <button
                    type="submit"
                    className="mjd-button mjd-button-secondary"
                    disabled={saving || uploading}
                  >
                    <FiSend />
                    {saving ? "Saving..." : "Save Progress"}
                  </button>
                </form>
              )}
            </section>

            {status === "In Progress" && (
              <section className="mjd-card">
                <div className="mjd-card-heading">
                  <span className="mjd-icon">
                    <FiUpload />
                  </span>
                  <div>
                    <h2>Submit Completed Work</h2>
                    <p>
                      Before and after evidence plus completion notes are
                      required.
                    </p>
                  </div>
                </div>

                <form
                  className="mjd-completion-form"
                  onSubmit={submitForVerification}
                >
                  <label htmlFor="completionNotes">Completion notes *</label>
                  <textarea
                    id="completionNotes"
                    value={completionNotes}
                    onChange={(event) => setCompletionNotes(event.target.value)}
                    placeholder="Describe the repair completed and any remaining concerns."
                    rows={4}
                    required
                  />

                  <div className="mjd-photo-grid">
                    <div>
                      <label htmlFor="beforePhoto">
                        Before repair — image or video *
                      </label>
                      <input
                        id="beforePhoto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                        onChange={(event) =>
                          handleMediaChange(event, "before")
                        }
                        required={!beforeFile}
                        disabled={uploading || saving}
                      />
                      {beforeFile && <small>Selected: {beforeFile.name}</small>}
                      {renderEvidencePreview(
                        beforeFile,
                        beforePreview,
                        "before"
                      )}
                    </div>

                    <div>
                      <label htmlFor="afterPhoto">
                        After repair — image or video *
                      </label>
                      <input
                        id="afterPhoto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                        onChange={(event) =>
                          handleMediaChange(event, "after")
                        }
                        required={!afterFile}
                        disabled={uploading || saving}
                      />
                      {afterFile && <small>Selected: {afterFile.name}</small>}
                      {renderEvidencePreview(
                        afterFile,
                        afterPreview,
                        "after"
                      )}
                    </div>
                  </div>

                  <p className="mjd-photo-notice">
                    Both files will be uploaded securely. Their URLs will be
                    saved with this issue for admin review.
                  </p>

                  <button
                    type="submit"
                    className="mjd-button mjd-button-primary"
                    disabled={saving || uploading}
                  >
                    <FiCheckCircle />
                    {uploading
                      ? "Uploading evidence..."
                      : saving
                        ? "Submitting..."
                        : "Submit for Verification"}
                  </button>
                </form>
              </section>
            )}

            {awaitingVerification && (
              <section className="mjd-review-notice">
                <FiClock />
                <div>
                  <h3>Awaiting Admin Verification</h3>
                  <p>
                    Your repair is awaiting admin review. The admin must verify
                    the work before the issue can be marked resolved.
                  </p>
                </div>
              </section>
            )}

            {(awaitingVerification || resolved) && (
              <section className="mjd-card">
                <h2>Repair Evidence</h2>
                <p>{issue.completionNotes || "No completion notes recorded."}</p>

                <div className="mjd-photo-grid">
                  {[
                    { label: "Before repair", evidence: beforeStoredEvidence },
                    { label: "After repair", evidence: afterStoredEvidence },
                  ].map(({ label, evidence }) => (
                    <div key={label}>
                      <span className="mjd-label">{label}</span>

                      {evidence?.url ? (
                        isVideoEvidence(evidence) ? (
                          <video
                            className="mjd-stored-evidence"
                            src={evidence.url}
                            controls
                          />
                        ) : (
                          <a
                            href={evidence.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              className="mjd-stored-evidence"
                              src={evidence.url}
                              alt={label}
                            />
                          </a>
                        )
                      ) : (
                        <p className="mjd-empty">No evidence uploaded.</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {resolved && (
              <section className="mjd-review-notice mjd-review-complete">
                <FiCheckCircle />
                <div>
                  <h3>Repair Verified</h3>
                  <p>This issue has been marked as resolved.</p>
                </div>
              </section>
            )}
          </div>

          <aside className="mjd-side-column">
            <section className="mjd-card">
              <h2>Job Actions</h2>
              <p className="mjd-side-description">
                Update the job as work progresses.
              </p>

              {status === "Assigned" && (
                <button
                  type="button"
                  className="mjd-button mjd-button-primary mjd-full-button"
                  onClick={acceptJob}
                  disabled={saving || uploading}
                >
                  <FiCheckCircle />
                  {saving ? "Saving..." : "Accept Job"}
                </button>
              )}

              {status === "Accepted" && (
                <button
                  type="button"
                  className="mjd-button mjd-button-primary mjd-full-button"
                  onClick={startWork}
                  disabled={saving || uploading}
                >
                  <FiPlay />
                  {saving ? "Saving..." : "Start Repair"}
                </button>
              )}

              {status === "In Progress" && (
                <div className="mjd-next-step">
                  <FiTool />
                  <p>
                    Work is in progress. Record progress and submit completion
                    evidence when the repair is finished.
                  </p>
                </div>
              )}

              {awaitingVerification && (
                <div className="mjd-next-step">
                  <FiClock />
                  <p>Waiting for the admin to review the completed repair.</p>
                </div>
              )}

              {resolved && (
                <div className="mjd-next-step">
                  <FiCheckCircle />
                  <p>This job is complete.</p>
                </div>
              )}

              <div className="mjd-side-divider" />

              <div className="mjd-side-detail">
                <span>Current status</span>
                <strong>{status}</strong>
              </div>

              <div className="mjd-side-detail">
                <span>Accepted at</span>
                <strong>{formatDate(issue.acceptedAt)}</strong>
              </div>

              <div className="mjd-side-detail">
                <span>Work started</span>
                <strong>{formatDate(issue.startedAt)}</strong>
              </div>

              <div className="mjd-side-detail">
                <span>Submitted for review</span>
                <strong>{formatDate(issue.submittedForVerificationAt)}</strong>
              </div>
            </section>

            <section className="mjd-help-card">
              <h3>Remember</h3>
              <p>
                Upload genuine before-and-after evidence and provide accurate
                completion notes. The admin verifies the repair before closing
                the issue.
              </p>
            </section>
          </aside>
        </div>

        <button
          type="button"
          className="mjd-back-bottom"
          onClick={() => navigate("/maintenance")}
        >
          <FiArrowLeft />
          Return to Dashboard
        </button>
      </div>
    </main>
  );
}

export default MaintenanceJobDetails;
