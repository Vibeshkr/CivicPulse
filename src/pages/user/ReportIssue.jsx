
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiArrowLeft,
  FiMapPin,
  FiUpload,
  FiAlertCircle,
  FiCheckCircle,
  FiX,
  FiVideo,
} from "react-icons/fi";

import {
  createIssue,
  createNotification,
} from "../../services/civicPulseService";
import {
  uploadMedia as uploadCloudinaryMedia,
} from "../../services/cloudinaryService";
import "./ReportIssue.css";

const initialForm = {
  title: "",
  category: "",
  description: "",
  location: "",
  landmark: "",
  priority: "Medium",
};

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

function getFriendlyError(error, fallback) {
  const message = error?.message || "";

  // Keep raw Cloudinary and server error messages out of the UI.
  if (
    /cloudinary|api[_ ]key|upload preset|unsigned|http|axios|network error|failed to fetch|request failed|internal server error|forbidden|unauthorized/i.test(
      message
    )
  ) {
    return fallback;
  }

  // Preserve helpful validation messages from the upload service.
  if (
    /please select|supported formats|must be \d+ MB|internet connection/i.test(
      message
    )
  ) {
    return message;
  }

  return fallback;
}

function ReportIssue() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [form, setForm] = useState(initialForm);
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function showMessage(text, type = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setMessage("");
  }

  function handleMediaChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      showMessage(
        "Choose a JPG, PNG, WEBP image or MP4, WEBM, MOV video."
      );
      event.target.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const maxSize = isImage
      ? 5 * 1024 * 1024
      : 25 * 1024 * 1024;

    if (file.size > maxSize) {
      showMessage(
        isImage
          ? "Images must be 5 MB or smaller."
          : "Videos must be 25 MB or smaller."
      );
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));
    setMedia(file);
    setMessage("");
  }

  function removeMedia() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setMedia(null);
    setPreviewUrl("");
    setMessage("");

    const input = document.getElementById("report-media");

    if (input) {
      input.value = "";
    }
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = "Enter an issue title.";
    }

    if (!form.category) {
      nextErrors.category = "Select a category.";
    }

    if (form.description.trim().length < 10) {
      nextErrors.description = "Enter at least 10 characters.";
    }

    if (!form.location.trim()) {
      nextErrors.location = "Enter the issue location.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!validateForm()) return;

    if (!user?.id || user.role !== "resident") {
      showMessage(
        "Please sign in with a resident account before reporting."
      );
      return;
    }

    setSubmitting(true);

    try {
      let uploadedMedia = null;

      if (media) {
        showMessage(
          `Uploading your ${media.type.startsWith("video/") ? "video" : "image"}...`,
          "info"
        );

        try {
          uploadedMedia = await uploadCloudinaryMedia(
            media,
            "civicpulse/reports"
          );
        } catch (uploadError) {
          showMessage(
            getFriendlyError(
              uploadError,
              "We couldn't upload your evidence. Please check your internet connection and try again."
            )
          );
          return;
        }

        uploadedMedia = {
          ...uploadedMedia,
          originalName: media.name,
          mimeType: media.type,
        };
      }

      const issue = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        landmark: form.landmark.trim(),

        userId: String(user.id),

        status: "Under Review",
        reviewReason: "",
        responsibility: "",
        assignedTeamId: "",
        assignedTeamName: "",
        reportedAt: new Date().toISOString(),

        imageUrl:
          uploadedMedia?.type === "image"
            ? uploadedMedia.url
            : "",

        videoUrl:
          uploadedMedia?.type === "video"
            ? uploadedMedia.url
            : "",

        media: uploadedMedia,
      };

      showMessage("Saving your report...", "info");

      let createdIssue;

      try {
        createdIssue = await createIssue(issue);
      } catch {
        showMessage(
          "Your report couldn't be saved. Please try again."
        );
        return;
      }

      // A notification failure must not undo a saved report.
      try {
        await createNotification({
          userId: String(user.id),
          issueId: String(createdIssue.id),
          title: "Report submitted successfully",
          message: `Your report "${createdIssue.title}" has been submitted and is awaiting admin review.`,
          type: "report_submitted",
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (notificationError) {
        console.error(
          "Report saved, but notification creation failed:",
          notificationError
        );
      }

      setSubmitted(true);
      showMessage(
        "Your issue has been submitted for admin review.",
        "success"
      );

      setForm(initialForm);
      setMedia(null);
      setPreviewUrl("");

      const input = document.getElementById("report-media");
      if (input) input.value = "";

      window.setTimeout(() => {
        navigate(`/issues/${createdIssue.id}`, {
          replace: true,
        });
      }, 1200);
    } catch {
      showMessage(
        "Something went wrong while submitting your report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isVideo = media?.type.startsWith("video/");

  return (
    <main className="report-issue-page">
      <div className="report-issue-container">
        <Link to="/explore" className="report-issue-back">
          <FiArrowLeft />
          Back to Explore Issues
        </Link>

        <header className="report-issue-header">
          <span className="report-issue-eyebrow">
            CIVICPULSE / RESIDENT
          </span>

          <h1>Report a Neighbourhood Issue</h1>

          <p>
            Tell us what needs attention. The admin team will review your
            report before assigning repair work.
          </p>
        </header>

        <div className="report-issue-layout">
          <form
            className="report-issue-form"
            onSubmit={handleSubmit}
          >
            <section className="report-issue-section">
              <h2>Issue Information</h2>

              <p className="report-issue-section-description">
                Provide clear information so the team can understand the problem.
              </p>

              <div className="report-issue-field">
                <label htmlFor="title">Issue title *</label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Pothole near the main entrance"
                  maxLength={120}
                  required
                />

                {errors.title && (
                  <span className="report-issue-error">
                    {errors.title}
                  </span>
                )}
              </div>

              <div className="report-issue-field">
                <label htmlFor="category">Category *</label>

                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select an issue category</option>
                  <option value="Road Damage">
                    Road damage and potholes
                  </option>
                  <option value="Street Lighting">
                    Street lighting
                  </option>
                  <option value="Waste Management">
                    Waste management
                  </option>
                  <option value="Drainage">
                    Drainage and waterlogging
                  </option>
                  <option value="Water Supply">Water supply</option>
                  <option value="Electrical">Electrical issues</option>
                  <option value="Other">Other</option>
                </select>

                {errors.category && (
                  <span className="report-issue-error">
                    {errors.category}
                  </span>
                )}
              </div>

              <div className="report-issue-field">
                <label htmlFor="description">Description *</label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the problem, how long it has existed, and its impact..."
                  rows={5}
                  maxLength={2000}
                  required
                />

                <span className="report-issue-character-count">
                  {form.description.length}/2000 characters
                </span>

                {errors.description && (
                  <span className="report-issue-error">
                    {errors.description}
                  </span>
                )}
              </div>

              <div className="report-issue-field">
                <label htmlFor="priority">Suggested priority</label>

                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>

                <span className="report-issue-hint">
                  Admin can adjust priority during verification.
                </span>
              </div>
            </section>

            <section className="report-issue-section">
              <h2>Location Details</h2>

              <p className="report-issue-section-description">
                Help the maintenance team find the exact location.
              </p>

              <div className="report-issue-field">
                <label htmlFor="location">
                  <FiMapPin /> Location or neighbourhood area *
                </label>

                <input
                  id="location"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Near the community entrance"
                  maxLength={200}
                  required
                />

                {errors.location && (
                  <span className="report-issue-error">
                    {errors.location}
                  </span>
                )}
              </div>

              <div className="report-issue-field">
                <label htmlFor="landmark">
                  Nearby landmark (optional)
                </label>

                <input
                  id="landmark"
                  name="landmark"
                  value={form.landmark}
                  onChange={handleChange}
                  placeholder="e.g. Opposite the community hall"
                  maxLength={200}
                />
              </div>
            </section>

            <section className="report-issue-section">
              <h2>Photo or Video Evidence (Optional)</h2>

              <p className="report-issue-section-description">
                You can submit a report without media. Evidence may help the
                admin team verify the problem.
              </p>

              <label
                className="report-issue-upload"
                htmlFor="report-media"
              >
                {isVideo ? <FiVideo /> : <FiUpload />}

                <strong>
                  {media ? media.name : "Choose an image or video"}
                </strong>

                <span>
                  JPG, PNG, WEBP, MP4, WEBM or MOV · Images up to 5 MB,
                  videos up to 25 MB
                </span>

                <input
                  id="report-media"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={handleMediaChange}
                  disabled={submitting}
                />
              </label>

              {previewUrl && media && (
                <div className="report-issue-media-preview">
                  {isVideo ? (
                    <video src={previewUrl} controls />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Selected issue evidence"
                    />
                  )}

                  <button
                    type="button"
                    onClick={removeMedia}
                    disabled={submitting}
                  >
                    <FiX /> Remove selected media
                  </button>
                </div>
              )}
            </section>

            {message && (
              <div
                className={`report-issue-message ${
                  messageType === "success"
                    ? "report-issue-message-success"
                    : messageType === "info"
                      ? "report-issue-message-info"
                      : "report-issue-message-error"
                }`}
                role="status"
              >
                {messageType === "success" ? (
                  <FiCheckCircle />
                ) : (
                  <FiAlertCircle />
                )}
                {message}
              </div>
            )}

            <button
              className="report-issue-submit"
              type="submit"
              disabled={submitting || submitted}
            >
              {submitting
                ? "Uploading and submitting..."
                : submitted
                  ? "Report Submitted"
                  : "Submit for Review"}
            </button>

            <p className="report-issue-disclaimer">
              Reports are reviewed before repair work is assigned.
            </p>
          </form>

          <aside className="report-issue-sidebar">
            <div className="report-issue-info-card">
              <span className="report-issue-info-icon">
                <FiCheckCircle />
              </span>

              <h3>What happens next?</h3>

              <ol>
                <li>Your report is recorded.</li>
                <li>An admin checks validity and responsibility.</li>
                <li>Approved internal repairs can be assigned to a team.</li>
                <li>Completion is checked before an issue is resolved.</li>
              </ol>
            </div>

            <div className="report-issue-tip-card">
              <h3>Tips for a useful report</h3>

              <ul>
                <li>Use a specific, descriptive title.</li>
                <li>Include the exact location and a landmark.</li>
                <li>Describe the problem clearly and honestly.</li>
                <li>Avoid including private information in media.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default ReportIssue;
