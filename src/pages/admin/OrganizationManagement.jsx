
import { useEffect, useState } from "react";
import {
  FiPlus,
  FiEdit2,
  FiRefreshCw,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiHome,
  FiBriefcase,
  FiFileText,
} from "react-icons/fi";

import {
  getOrganizations,
  createOrganization,
  updateOrganization,
} from "../../services/civicPulseService";

import "./OrganizationManagement.css";

const emptyForm = {
  name: "",
  category: "",
  phone: "",
  email: "",
  active: true,
  address: "",
  description: "",
};

const categories = [
  "Electricity",
  "Water Supply",
  "Roads and Transport",
  "Waste Management",
  "Drainage and Sewage",
  "Telecommunications",
  "Other",
];

const isActive = (organization) =>
  organization.active !== false &&
  organization.active !== "false";

function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch {
      setError(
        "Unable to load organisations. Check that JSON Server is running and the API URL is correct."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const openAddForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEditForm = (organization) => {
    setForm({
      ...emptyForm,
      ...organization,
      name: organization.name || "",
      category: organization.category || "",
      phone: organization.phone || "",
      email: organization.email || "",
      address: organization.address || "",
      description: organization.description || "",
      active: isActive(organization),
    });

    setEditingId(organization.id);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const data = {
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim(),
      email: form.email.trim(),
      active: Boolean(form.active),
      address: form.address.trim(),
      description: form.description.trim(),
    };

    if (!data.name || !data.category) {
      setError(
        "Please fill in Organisation Name and Category."
      );
      return;
    }

    if (
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null && editingId !== undefined) {
        await updateOrganization(editingId, data);
        setMessage("Organisation updated successfully.");
      } else {
        await createOrganization({
          ...data,
          createdAt: new Date().toISOString(),
        });
        setMessage("Organisation added successfully.");
      }

      closeForm();
      await loadOrganizations();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save the organisation. Please check JSON Server and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (organization) => {
    const nextActive = !isActive(organization);

    setError("");
    setMessage("");
    setChangingStatusId(organization.id);

    try {
      await updateOrganization(organization.id, {
        active: nextActive,
      });

      setMessage(
        `${organization.name} is now ${
          nextActive ? "Active" : "Inactive"
        }.`
      );

      await loadOrganizations();
    } catch {
      setError("Unable to update organisation status.");
    } finally {
      setChangingStatusId(null);
    }
  };

  const activeCount = organizations.filter(isActive).length;
  const inactiveCount = organizations.length - activeCount;

  return (
    <main className="org-page">
      <div className="org-container">
        <header className="org-header">
          <div>
            <span className="org-eyebrow">
              <FiBriefcase /> ADMINISTRATION
            </span>
            <h1>Organisation Management</h1>
            <p>
              Manage external authorities responsible for issues outside
              CivicPulse's service area.
            </p>
          </div>

          <button
            type="button"
            className="org-primary-btn"
            onClick={openAddForm}
          >
            <FiPlus /> Add Organisation
          </button>
        </header>

        {error && (
          <div className="org-alert org-alert-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <FiX />
            </button>
          </div>
        )}

        {message && (
          <div className="org-alert org-alert-success" role="status">
            <FiCheckCircle />
            <span>{message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              <FiX />
            </button>
          </div>
        )}

        <section className="org-stats">
          <article className="org-stat-card">
            <div className="org-stat-icon">
              <FiBriefcase />
            </div>
            <div>
              <span>Total Organisations</span>
              <strong>{organizations.length}</strong>
            </div>
          </article>

          <article className="org-stat-card">
            <div className="org-stat-icon org-icon-active">
              <FiCheckCircle />
            </div>
            <div>
              <span>Active</span>
              <strong>{activeCount}</strong>
            </div>
          </article>

          <article className="org-stat-card">
            <div className="org-stat-icon org-icon-inactive">
              <FiAlertCircle />
            </div>
            <div>
              <span>Inactive</span>
              <strong>{inactiveCount}</strong>
            </div>
          </article>
        </section>

        {showForm && (
          <section className="org-form-card">
            <div className="org-form-heading">
              <div>
                <h2>
                  {editingId !== null
                    ? "Edit Organisation"
                    : "Add Organisation"}
                </h2>
                <p>
                  Enter the authority's details for external issue follow-up.
                </p>
              </div>

              <button
                type="button"
                className="org-icon-btn"
                onClick={closeForm}
                aria-label="Close form"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="org-form-grid">
                <div className="org-field">
                  <label htmlFor="org-name">
                    Organisation Name <span>*</span>
                  </label>
                  <input
                    id="org-name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Water Supply Department"
                    required
                  />
                </div>

                <div className="org-field">
                  <label htmlFor="org-category">
                    Category <span>*</span>
                  </label>
                  <select
                    id="org-category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="org-field">
                  <label htmlFor="org-phone">Phone</label>
                  <div className="org-input-icon">
                    <FiPhone />
                    <input
                      id="org-phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="org-field">
                  <label htmlFor="org-email">Email</label>
                  <div className="org-input-icon">
                    <FiMail />
                    <input
                      id="org-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="org-field">
                  <label htmlFor="org-status">Status</label>
                  <select
                    id="org-status"
                    name="active"
                    value={form.active ? "true" : "false"}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        active: event.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="org-field">
                  <label htmlFor="org-address">Address</label>
                  <div className="org-input-icon">
                    <FiHome />
                    <input
                      id="org-address"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Enter office address"
                    />
                  </div>
                </div>

                <div className="org-field org-field-full">
                  <label htmlFor="org-description">Description</label>
                  <div className="org-input-icon org-textarea-icon">
                    <FiFileText />
                    <textarea
                      id="org-description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Describe the organisation's services and responsibilities"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              <p className="org-required-note">* Required fields</p>

              <div className="org-form-actions">
                <button
                  type="button"
                  className="org-secondary-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="org-primary-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <FiRefreshCw className="org-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle />
                      {editingId !== null
                        ? "Save Changes"
                        : "Add Organisation"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="org-list-section">
          <div className="org-list-heading">
            <div>
              <h2>Registered Organisations</h2>
              <p>
                Authorities available for external issue follow-up.
              </p>
            </div>

            <button
              type="button"
              className="org-refresh-btn"
              onClick={loadOrganizations}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? "org-spin" : ""} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="org-empty-state">
              <FiRefreshCw className="org-spin org-empty-icon" />
              <h3>Loading organisations...</h3>
            </div>
          ) : organizations.length === 0 ? (
            <div className="org-empty-state">
              <div className="org-empty-icon">
                <FiBriefcase />
              </div>
              <h3>No organisations added yet</h3>
              <p>
                Add an external authority to manage issues that require
                action outside CivicPulse.
              </p>
              <button
                type="button"
                className="org-primary-btn"
                onClick={openAddForm}
              >
                <FiPlus /> Add First Organisation
              </button>
            </div>
          ) : (
            <div className="org-card-grid">
              {organizations.map((organization) => {
                const active = isActive(organization);

                return (
                  <article className="org-card" key={organization.id}>
                    <div className="org-card-top">
                      <div className="org-card-icon">
                        <FiBriefcase />
                      </div>
                      <span
                        className={`org-status ${
                          active
                            ? "org-status-active"
                            : "org-status-inactive"
                        }`}
                      >
                        <span />
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3>{organization.name}</h3>

                    <span className="org-category">
                      {organization.category}
                    </span>

                    <div className="org-card-details">
                      <div>
                        <FiPhone />
                        <span>
                          <small>Phone</small>
                          {organization.phone || "Not provided"}
                        </span>
                      </div>

                      <div>
                        <FiMail />
                        <span>
                          <small>Email</small>
                          {organization.email || "Not provided"}
                        </span>
                      </div>

                      <div>
                        <FiHome />
                        <span>
                          <small>Address</small>
                          {organization.address || "Not provided"}
                        </span>
                      </div>
                    </div>

                    {organization.description && (
                      <p className="org-card-description">
                        {organization.description}
                      </p>
                    )}

                    <div className="org-card-actions">
                      <button
                        type="button"
                        className="org-edit-btn"
                        onClick={() => openEditForm(organization)}
                      >
                        <FiEdit2 /> Edit
                      </button>

                      <button
                        type="button"
                        className="org-toggle-btn"
                        onClick={() => toggleStatus(organization)}
                        disabled={changingStatusId === organization.id}
                      >
                        {changingStatusId === organization.id ? (
                          <FiRefreshCw className="org-spin" />
                        ) : active ? (
                          <FiX />
                        ) : (
                          <FiCheckCircle />
                        )}
                        {active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default OrganizationManagement;
