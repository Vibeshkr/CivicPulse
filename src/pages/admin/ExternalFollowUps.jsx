
import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowUpRight,
  FiCalendar,
  FiCheckCircle,
  FiExternalLink,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiClock,
  FiMail,
  FiPhone,
  FiCopy,
  FiMessageSquare,
  FiBriefcase,
} from "react-icons/fi";

import {
  getIssues,
  getOrganizations,
  updateIssue,
  createNotification,
} from "../../services/civicPulseService";

import "./ExternalFollowUps.css";

const EXTERNAL_STATUSES = [
  "External Follow-up Required",
  "External Follow-up",
  "Referred to External Organization",
  "Awaiting External Response",
  "External Work In Progress",
];

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-IN");
}

function getOrganizationForIssue(issue, organizations) {
  const savedId = issue.externalOrganizationId;

  if (savedId !== undefined && savedId !== null && savedId !== "") {
    const organizationById = organizations.find(
      (organization) => String(organization.id) === String(savedId)
    );

    if (organizationById) return organizationById;
  }

  const savedName = String(issue.externalOrganization || "")
    .trim()
    .toLowerCase();

  if (!savedName) return null;

  return (
    organizations.find(
      (organization) =>
        String(organization.name || "").trim().toLowerCase() === savedName
    ) || null
  );
}

function getIssueDescription(issue) {
  return (
    issue.description ||
    issue.details ||
    issue.problemDescription ||
    "Please review and investigate the reported civic problem."
  );
}

function buildContactMessage(issue, organization) {
  const evidenceUrl =
    issue.media?.url || issue.imageUrl || issue.videoUrl || "";

  return [
    `Subject: Request for action - ${issue.title || "Civic problem"}`,
    "",
    `Dear ${
      organization?.name ||
      issue.externalOrganization ||
      "Concerned Department"
    },`,
    "",
    "A civic problem has been reported through CivicPulse.",
    "",
    `Issue ID: ${issue.id}`,
    `Problem: ${issue.title || "Not provided"}`,
    `Category: ${issue.category || "Not specified"}`,
    `Location: ${issue.location || "Not provided"}`,
    `Description: ${getIssueDescription(issue)}`,
    evidenceUrl ? `Evidence: ${evidenceUrl}` : "",
    "",
    "Please review this complaint and take the necessary action.",
    "Kindly provide a complaint reference number and an update on the expected resolution date.",
    "",
    "Regards,",
    "CivicPulse Administration Team",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function ExternalFollowUps() {
  const [issues, setIssues] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingIssueId, setSavingIssueId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [form, setForm] = useState({
    externalOrganizationId: "",
    externalOrganization: "",
    externalReference: "",
    externalNotes: "",
    nextFollowUpDate: "",
    externalStatus: "External Follow-up",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [issueData, organizationData] = await Promise.all([
        getIssues(),
        getOrganizations(),
      ]);

      if (!Array.isArray(issueData) || !Array.isArray(organizationData)) {
        throw new Error(
          "The server returned invalid issue or organisation data."
        );
      }

      setIssues(issueData);
      setOrganizations(organizationData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load external follow-ups. Check the backend collections."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const organizationOptions = useMemo(
    () =>
      organizations.filter(
        (organization) =>
          organization.active !== false &&
          organization.active !== "false" &&
          organization.status !== "Inactive"
      ),
    [organizations]
  );

  const externalIssues = useMemo(
    () =>
      issues.filter(
        (issue) =>
          issue.responsibility === "External Organization" ||
          issue.responsibility === "External" ||
          Boolean(issue.externalOrganization) ||
          EXTERNAL_STATUSES.includes(issue.status) ||
          Boolean(issue.externalWorkCompletedAt)
      ),
    [issues]
  );

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return externalIssues.filter((issue) => {
      const organization = getOrganizationForIssue(issue, organizations);

      return (
        !query ||
        String(issue.title || "").toLowerCase().includes(query) ||
        String(issue.location || "").toLowerCase().includes(query) ||
        String(issue.externalOrganization || "")
          .toLowerCase()
          .includes(query) ||
        String(organization?.name || "").toLowerCase().includes(query) ||
        String(issue.externalReference || "").toLowerCase().includes(query) ||
        String(issue.id || "").toLowerCase().includes(query)
      );
    });
  }, [externalIssues, organizations, search]);

  const openEditor = (issue) => {
    const organization = getOrganizationForIssue(issue, organizations);

    setSelectedIssue(issue);

    setForm({
      externalOrganizationId: organization ? String(organization.id) : "",
      externalOrganization:
        issue.externalOrganization || organization?.name || "",
      externalReference: issue.externalReference || "",
      externalNotes: issue.externalNotes || "",
      nextFollowUpDate: issue.nextFollowUpDate || "",
      externalStatus: EXTERNAL_STATUSES.includes(issue.status)
        ? issue.status
        : "External Follow-up",
    });

    setError("");
    setMessage("");
  };

  const closeEditor = () => {
    if (saving) return;
    setSelectedIssue(null);
  };

  const selectedOrganization = useMemo(
    () =>
      organizationOptions.find(
        (organization) =>
          String(organization.id) === String(form.externalOrganizationId)
      ) || null,
    [organizationOptions, form.externalOrganizationId]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "externalOrganizationId") {
      const organization = organizationOptions.find(
        (item) => String(item.id) === String(value)
      );

      setForm((previous) => ({
        ...previous,
        externalOrganizationId: value,
        externalOrganization: organization?.name || "",
      }));

      return;
    }

    if (name === "externalOrganization") {
      const matchingOrganization = organizationOptions.find(
        (organization) =>
          String(organization.name || "").trim().toLowerCase() ===
          value.trim().toLowerCase()
      );

      setForm((previous) => ({
        ...previous,
        externalOrganization: value,
        externalOrganizationId: matchingOrganization
          ? String(matchingOrganization.id)
          : "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const notifyResident = async (issue, notification) => {
    const userId = issue.userId ?? issue.residentId;

    if (userId == null || userId === "") {
      return "The issue was saved, but the reporter account could not be identified for notification.";
    }

    try {
      await createNotification({
        userId,
        issueId: issue.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      return "";
    } catch {
      return "The issue was saved, but the resident notification could not be created.";
    }
  };

  const buildHistoryEntry = (action, notes, status, organization) => ({
    action,
    status,
    organization,
    notes,
    recordedAt: new Date().toISOString(),
  });

  const copyComplaintMessage = async (issue, organization) => {
    const contactMessage = buildContactMessage(issue, organization);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(contactMessage);

      setError("");
      setMessage(
        "Complaint message copied to clipboard. You can now paste it into your preferred communication app."
      );
    } catch {
      window.prompt(
        "Copy this complaint message:",
        contactMessage
      );
    }
  };

  const saveFollowUp = async (event) => {
    event.preventDefault();

    if (!selectedIssue || saving) return;

    const matchedOrganization = organizationOptions.find(
      (organization) =>
        String(organization.id) === String(form.externalOrganizationId)
    );

    const organizationName = (
      matchedOrganization?.name || form.externalOrganization
    ).trim();

    if (!organizationName) {
      setError("Select or enter the responsible external organisation.");
      return;
    }

    try {
      setSaving(true);
      setSavingIssueId(selectedIssue.id);
      setError("");
      setMessage("");

      const now = new Date().toISOString();

      const previousHistory = Array.isArray(
        selectedIssue.externalFollowUpHistory
      )
        ? selectedIssue.externalFollowUpHistory
        : [];

      const historyEntry = buildHistoryEntry(
        "Follow-up updated",
        form.externalNotes.trim(),
        form.externalStatus,
        organizationName
      );

      const updates = {
        responsibility: "External Organization",
        externalOrganization: organizationName,
        externalOrganizationId: matchedOrganization?.id ?? null,
        externalOrganizationCategory: matchedOrganization?.category || "",
        externalOrganizationPhone: matchedOrganization?.phone || "",
        externalOrganizationEmail: matchedOrganization?.email || "",
        externalOrganizationAddress: matchedOrganization?.address || "",
        externalReference: form.externalReference.trim(),
        externalNotes: form.externalNotes.trim(),
        nextFollowUpDate: form.nextFollowUpDate,
        status: form.externalStatus,
        lastFollowUpAt: now,
        externalFollowUpHistory: [...previousHistory, historyEntry],
      };

      const savedIssue = await updateIssue(selectedIssue.id, updates);

      const notificationWarning = await notifyResident(savedIssue, {
        title: "External follow-up updated",
        message: `There is an update about your reported issue "${
          savedIssue.title || "Untitled issue"
        }". Responsible organisation: ${
          savedIssue.externalOrganization
        }. Current status: ${savedIssue.status}.${
          savedIssue.externalReference
            ? ` Reference number: ${savedIssue.externalReference}.`
            : ""
        }${
          savedIssue.nextFollowUpDate
            ? ` Next follow-up date: ${savedIssue.nextFollowUpDate}.`
            : ""
        }${
          savedIssue.externalNotes
            ? ` Update: ${savedIssue.externalNotes}`
            : ""
        }`,
        type: "external-follow-up-update",
      });

      setSelectedIssue(null);
      await loadData();

      setMessage(
        `Follow-up details saved for "${
          savedIssue.title || "Untitled issue"
        }".`
      );

      if (notificationWarning) setError(notificationWarning);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save external follow-up details."
      );
    } finally {
      setSaving(false);
      setSavingIssueId(null);
    }
  };

  const markExternalWorkComplete = async (issue) => {
    if (saving) return;

    if (!issue.externalOrganization?.trim()) {
      setError(
        "Assign an external organisation and record the follow-up before marking work complete."
      );
      return;
    }

    const confirmed = window.confirm(
      "Has the external organisation actually completed the work? The issue will be sent for admin resolution verification."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setSavingIssueId(issue.id);
      setError("");
      setMessage("");

      const now = new Date().toISOString();

      const previousHistory = Array.isArray(
        issue.externalFollowUpHistory
      )
        ? issue.externalFollowUpHistory
        : [];

      const updates = {
        status: "Awaiting Resolution Verification",
        externalWorkCompletedAt: now,
        externalNotes: issue.externalNotes || "",
        externalFollowUpHistory: [
          ...previousHistory,
          buildHistoryEntry(
            "External work reported complete",
            issue.externalNotes || "",
            "Awaiting Resolution Verification",
            issue.externalOrganization
          ),
        ],
      };

      const savedIssue = await updateIssue(issue.id, updates);

      const notificationWarning = await notifyResident(savedIssue, {
        title: "External work reported complete",
        message: `Work for "${
          savedIssue.title || "Untitled issue"
        }" has been recorded as reported complete and is awaiting admin verification.`,
        type: "external-work-completed",
      });

      await loadData();

      setMessage(
        `External work for "${
          savedIssue.title || "Untitled issue"
        }" was recorded as complete. It is now awaiting admin verification.`
      );

      if (notificationWarning) setError(notificationWarning);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to record external work completion."
      );
    } finally {
      setSaving(false);
      setSavingIssueId(null);
    }
  };

  const getContactDetails = (issue) => {
    const organization = getOrganizationForIssue(issue, organizations);

    return {
      organization,
      name: organization?.name || issue.externalOrganization || "",
      phone: organization?.phone || issue.externalOrganizationPhone || "",
      email: organization?.email || issue.externalOrganizationEmail || "",
      address:
        organization?.address || issue.externalOrganizationAddress || "",
      category:
        organization?.category || issue.externalOrganizationCategory || "",
    };
  };

  return (
    <main className="external-followups-page">
      <header className="external-followups-header">
        <div>
          <p className="external-followups-eyebrow">ADMIN WORKSPACE</p>
          <h1>External Follow-ups</h1>
          <p>
            Manage external referrals, contact responsible organisations,
            record their responses, and track resolution.
          </p>
        </div>

        <button
          type="button"
          className="external-followups-refresh"
          onClick={loadData}
          disabled={loading || saving}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && (
        <div className="external-followups-message error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {message && (
        <div className="external-followups-message success" role="status">
          <FiCheckCircle />
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            <FiX />
          </button>
        </div>
      )}

      <section className="external-followups-summary">
        <article>
          <FiExternalLink />
          <div>
            <p>External Issues</p>
            <h2>{externalIssues.length}</h2>
          </div>
        </article>

        <article>
          <FiCalendar />
          <div>
            <p>Follow-up Required</p>
            <h2>
              {
                externalIssues.filter(
                  (issue) =>
                    issue.status !== "Resolved" &&
                    !issue.externalWorkCompletedAt
                ).length
              }
            </h2>
          </div>
        </article>

        <article>
          <FiCheckCircle />
          <div>
            <p>Completed Externally</p>
            <h2>
              {
                externalIssues.filter(
                  (issue) => Boolean(issue.externalWorkCompletedAt)
                ).length
              }
            </h2>
          </div>
        </article>
      </section>

      <section className="external-followups-list-section">
        <div className="external-followups-list-heading">
          <div>
            <h2>External Issue Records</h2>
            <p>Manage organisation contacts and complaint progress.</p>
          </div>

          <div className="external-followups-search">
            <FiSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search external issues..."
              aria-label="Search external issues"
            />
          </div>
        </div>

        {loading ? (
          <div className="external-followups-empty">
            <FiRefreshCw />
            <p>Loading external records...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="external-followups-empty">
            <FiExternalLink />
            <h3>No external follow-ups yet</h3>
            <p>
              Reports marked External Follow-up Required or assigned to
              external organisations will appear here.
            </p>
          </div>
        ) : (
          <div className="external-followups-grid">
            {filteredIssues.map((issue) => {
              const details = getContactDetails(issue);
              const organization = details.organization;
              const contactMessage = buildContactMessage(
                issue,
                organization
              );

              const emailHref = details.email
                ? `mailto:${details.email}?subject=${encodeURIComponent(
                    `Request for action - ${
                      issue.title || "Civic problem"
                    }`
                  )}&body=${encodeURIComponent(
                    contactMessage.replace(/^Subject:.*\n/, "")
                  )}`
                : "";

              return (
                <article
                  className="external-followups-card"
                  key={issue.id}
                >
                  <div className="external-followups-card-top">
                    <span className="external-followups-status">
                      {issue.status || "External Follow-up Required"}
                    </span>
                    <span>#{issue.id}</span>
                  </div>

                  <h3>{issue.title || "Untitled issue"}</h3>

                  <p className="external-followups-location">
                    <FiMapPin />
                    {issue.location || "Location not provided"}
                  </p>

                  <div className="external-followups-detail">
                    <span>Organisation</span>
                    <strong>{details.name || "Not assigned"}</strong>
                  </div>

                  {details.name && (
                    <div className="external-followups-contact-details">
                      <h4>
                        <FiBriefcase /> Organisation Contact Details
                      </h4>

                      {details.category && (
                        <p>
                          <strong>Category:</strong> {details.category}
                        </p>
                      )}

                      {details.phone && (
                        <p>
                          <FiPhone />
                          <a href={`tel:${details.phone}`}>
                            {details.phone}
                          </a>
                        </p>
                      )}

                      {details.email && (
                        <p>
                          <FiMail />
                          <a href={`mailto:${details.email}`}>
                            {details.email}
                          </a>
                        </p>
                      )}

                      {details.address && (
                        <p>
                          <FiMapPin />
                          <span>{details.address}</span>
                        </p>
                      )}

                      {!details.phone && !details.email && (
                        <p className="external-followups-contact-warning">
                          No phone number or email is registered. Update the
                          organisation in Organization Management.
                        </p>
                      )}
                    </div>
                  )}

                  {!organization && details.name && (
                    <p className="external-followups-contact-warning">
                      This organisation is not matched to a registered record.
                      Select a registered organisation in Update Follow-up to
                      use its saved contact details.
                    </p>
                  )}

                  {/* Simplified professional contact panel */}
                  <div className="external-followups-contact-panel">
                    <h4>
                      <FiMessageSquare /> Organisation Contact
                    </h4>

                    <p>
                      Contact the responsible authority to follow up on this
                      complaint.
                    </p>

                    <div className="external-followups-contact-actions">
                      {details.phone ? (
                        <a
                          className="external-followups-contact-button"
                          href={`tel:${details.phone}`}
                        >
                          <FiPhone /> Call Organisation
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="external-followups-contact-button"
                          onClick={() =>
                            setMessage(
                              "No phone number is available. Add one in Organization Management."
                            )
                          }
                        >
                          <FiPhone /> Phone Unavailable
                        </button>
                      )}

                      {emailHref ? (
                        <a
                          className="external-followups-contact-button"
                          href={emailHref}
                        >
                          <FiMail /> Email Draft
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="external-followups-contact-button"
                          onClick={() =>
                            setMessage(
                              "No email address is available. Add one in Organization Management."
                            )
                          }
                        >
                          <FiMail /> Email Unavailable
                        </button>
                      )}

                      <button
                        type="button"
                        className="external-followups-contact-button"
                        onClick={() =>
                          copyComplaintMessage(issue, organization)
                        }
                      >
                        <FiCopy /> Copy Message
                      </button>
                    </div>
                  </div>

                  <div className="external-followups-detail">
                    <span>Reference number</span>
                    <strong>
                      {issue.externalReference || "Not recorded"}
                    </strong>
                  </div>

                  <div className="external-followups-detail">
                    <span>Next follow-up</span>
                    <strong>
                      {issue.nextFollowUpDate || "Not scheduled"}
                    </strong>
                  </div>

                  {issue.lastFollowUpAt && (
                    <div className="external-followups-detail">
                      <span>Last updated</span>
                      <strong>{formatDate(issue.lastFollowUpAt)}</strong>
                    </div>
                  )}

                  {issue.externalNotes && (
                    <p className="external-followups-notes">
                      {issue.externalNotes}
                    </p>
                  )}

                  {Array.isArray(issue.externalFollowUpHistory) &&
                    issue.externalFollowUpHistory.length > 0 && (
                      <details className="external-followups-history">
                        <summary>
                          <FiClock /> Follow-up history (
                          {issue.externalFollowUpHistory.length})
                        </summary>

                        <ol>
                          {[...issue.externalFollowUpHistory]
                            .reverse()
                            .map((entry, index) => (
                              <li
                                key={`${entry.recordedAt || index}-${index}`}
                              >
                                <strong>{entry.action}</strong>
                                <p>
                                  {entry.organization ||
                                    "External organisation"}
                                  {" — "}
                                  {entry.status || "Status not recorded"}
                                </p>
                                {entry.notes && <p>{entry.notes}</p>}
                                <small>
                                  {formatDate(entry.recordedAt)}
                                </small>
                              </li>
                            ))}
                        </ol>
                      </details>
                    )}

                  {issue.externalWorkCompletedAt && (
                    <p className="external-followups-completed">
                      <FiCheckCircle /> External work completion recorded;
                      awaiting admin verification where applicable.
                    </p>
                  )}

                  <div className="external-followups-actions">
                    <button
                      type="button"
                      className="external-followups-edit"
                      onClick={() => openEditor(issue)}
                      disabled={saving}
                    >
                      <FiArrowUpRight /> Update Follow-up / Record Response
                    </button>

                    {!issue.externalWorkCompletedAt &&
                      issue.status !== "Resolved" && (
                        <button
                          type="button"
                          className="external-followups-complete"
                          onClick={() => markExternalWorkComplete(issue)}
                          disabled={
                            saving || !issue.externalOrganization?.trim()
                          }
                          title={
                            !issue.externalOrganization?.trim()
                              ? "Assign an organisation before recording completion"
                              : "Record external work as complete"
                          }
                        >
                          {savingIssueId === issue.id ? (
                            <>
                              <FiRefreshCw /> Saving...
                            </>
                          ) : (
                            <>
                              <FiCheckCircle /> Record Work Complete
                            </>
                          )}
                        </button>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedIssue && (
        <div
          className="external-followups-modal-backdrop"
          onClick={closeEditor}
        >
          <section
            className="external-followups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-followups-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="external-followups-modal-header">
              <div>
                <p>EXTERNAL REFERRAL</p>
                <h2 id="external-followups-modal-title">
                  Update Follow-up / Record Response
                </h2>
                <span>{selectedIssue.title || "Untitled issue"}</span>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close editor"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={saveFollowUp}>
              <div className="external-followups-form-group">
                <label htmlFor="externalOrganizationId">
                  Select registered organisation
                </label>

                <select
                  id="externalOrganizationId"
                  name="externalOrganizationId"
                  value={form.externalOrganizationId}
                  onChange={handleChange}
                >
                  <option value="">Choose an organisation</option>

                  {organizationOptions.map((organization) => (
                    <option
                      key={organization.id}
                      value={String(organization.id)}
                    >
                      {organization.name}
                      {organization.category
                        ? ` — ${organization.category}`
                        : ""}
                    </option>
                  ))}
                </select>

                <small>
                  Select an organisation to automatically use its saved phone,
                  email, address, and category.
                </small>

                {organizationOptions.length === 0 && (
                  <p className="external-followups-contact-warning">
                    No active organisations found. Add or activate an
                    organisation in Organization Management.
                  </p>
                )}
              </div>

              <div className="external-followups-form-group">
                <label htmlFor="externalOrganization">
                  Organisation name (manual entry if not registered)
                </label>

                <input
                  id="externalOrganization"
                  name="externalOrganization"
                  value={form.externalOrganization}
                  onChange={handleChange}
                  placeholder="Enter organisation name"
                  required
                />

                <small>
                  Manual entries can be saved, but registered contact details
                  are available only when an organisation is selected above.
                </small>
              </div>

              {selectedOrganization && (
                <div className="external-followups-contact-panel">
                  <h4>
                    <FiBriefcase /> Selected Organisation
                  </h4>

                  {selectedOrganization.phone && (
                    <p>
                      <FiPhone /> {selectedOrganization.phone}
                    </p>
                  )}

                  {selectedOrganization.email && (
                    <p>
                      <FiMail /> {selectedOrganization.email}
                    </p>
                  )}

                  {selectedOrganization.address && (
                    <p>
                      <FiMapPin /> {selectedOrganization.address}
                    </p>
                  )}

                  {selectedOrganization.description && (
                    <p>{selectedOrganization.description}</p>
                  )}

                  {!selectedOrganization.phone &&
                    !selectedOrganization.email && (
                      <p>
                        Add a phone number or email to this organisation in
                        Organization Management to enable contact actions.
                      </p>
                    )}
                </div>
              )}

              <div className="external-followups-form-group">
                <label htmlFor="externalReference">
                  External reference number
                </label>
                <input
                  id="externalReference"
                  name="externalReference"
                  value={form.externalReference}
                  onChange={handleChange}
                  placeholder="Complaint or service request number"
                />
              </div>

              <div className="external-followups-form-group">
                <label htmlFor="externalStatus">Follow-up status</label>
                <select
                  id="externalStatus"
                  name="externalStatus"
                  value={form.externalStatus}
                  onChange={handleChange}
                >
                  {EXTERNAL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="external-followups-form-group">
                <label htmlFor="nextFollowUpDate">
                  Next follow-up date
                </label>
                <input
                  type="date"
                  id="nextFollowUpDate"
                  name="nextFollowUpDate"
                  value={form.nextFollowUpDate}
                  onChange={handleChange}
                />
              </div>

              <div className="external-followups-form-group">
                <label htmlFor="externalNotes">
                  Follow-up notes / actual authority response
                </label>
                <textarea
                  id="externalNotes"
                  name="externalNotes"
                  rows={4}
                  value={form.externalNotes}
                  onChange={handleChange}
                  placeholder="Record the actual call, response, reference number, and expected action date."
                />
              </div>

              <div className="external-followups-modal-actions">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button type="submit" disabled={saving}>
                  <FiCheckCircle />
                  {saving
                    ? "Saving..."
                    : "Save Follow-up and Notify Resident"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default ExternalFollowUps;
