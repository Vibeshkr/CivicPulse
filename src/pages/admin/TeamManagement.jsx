
import { useEffect, useState } from "react";
import {
  FiUsers,
  FiPlus,
  FiEdit2,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiTool,
  FiPhone,
  FiMapPin,
  FiUser,
  FiX,
  FiAlertCircle,
  FiMail,
  FiLock,
} from "react-icons/fi";

import {
  getMaintenanceTeams,
  createMaintenanceTeam,
  updateMaintenanceTeam,
} from "../../services/civicPulseService";

import { createMaintenanceUser } from "../../services/authService";
import "./TeamManagement.css";

const initialForm = {
  name: "",
  category: "",
  contactPerson: "",
  phone: "",
  area: "",
  description: "",
  active: true,
  loginEmail: "",
  loginPassword: "",
};

function isTeamActive(team) {
  return team.active !== false && team.active !== "false";
}

function TeamManagement() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ ...initialForm });
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMaintenanceTeams();

      if (!Array.isArray(data)) {
        throw new Error("Invalid maintenance team data received.");
      }

      setTeams(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load maintenance teams."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddForm = () => {
    if (saving || changingStatusId !== null) return;

    setEditingId(null);
    setForm({ ...initialForm });
    setError("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (team) => {
    if (saving || changingStatusId !== null) return;

    setEditingId(team.id);

    setForm({
      ...initialForm,
      name: team.name || "",
      category: team.category || "",
      contactPerson: team.contactPerson || "",
      phone: team.phone || "",
      area: team.area || "",
      description: team.description || "",
      active: isTeamActive(team),
      loginEmail: team.loginEmail || "",
    });

    setError("");
    setMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm({ ...initialForm });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setMessage("");

    const teamData = {
      name: form.name.trim(),
      category: form.category.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      area: form.area.trim(),
      description: form.description.trim(),
      active: form.active === true,
    };

    const loginEmail = form.loginEmail.trim().toLowerCase();
    const loginPassword = form.loginPassword;

    if (
      !teamData.name ||
      !teamData.category ||
      !teamData.contactPerson ||
      !teamData.phone ||
      !teamData.area
    ) {
      setError("Please complete all required team fields.");
      return;
    }

    if (editingId === null) {
      if (!loginEmail || !loginPassword) {
        setError("Enter a login email and password for this team.");
        return;
      }

      if (loginPassword.length < 6) {
        setError("The team password must contain at least 6 characters.");
        return;
      }
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        await updateMaintenanceTeam(editingId, teamData);
        setMessage("Maintenance team updated successfully.");
      } else {
        // Create the team first so it has an ID.
        const createdTeam = await createMaintenanceTeam({
          ...teamData,
          loginEmail,
          createdAt: new Date().toISOString(),
        });

        if (
          !createdTeam ||
          createdTeam.id === undefined ||
          createdTeam.id === null
        ) {
          throw new Error(
            "The team may have been saved, but its ID was not returned. Check the team list before trying again."
          );
        }

        // Create one maintenance login linked to this team.
        try {
          await createMaintenanceUser({
            name: `${teamData.name} Account`,
            email: loginEmail,
            password: loginPassword,
            maintenanceTeamId: createdTeam.id,
          });
        } catch (accountError) {
          // The team may already exist. Don't create another one blindly.
          await loadTeams();

          setError(
            `The team "${teamData.name}" was created, but its login account could not be created. ${accountError.message} Check the team list before retrying.`
          );
          return;
        }

        setMessage(
          `Team "${teamData.name}" and its maintenance login were created successfully.`
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...initialForm });

      await loadTeams();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to save the maintenance team."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTeamStatus = async (team) => {
    if (saving || changingStatusId !== null) return;

    setError("");
    setMessage("");

    const currentlyActive = isTeamActive(team);

    try {
      setChangingStatusId(team.id);

      await updateMaintenanceTeam(team.id, {
        active: !currentlyActive,
      });

      setMessage(
        `${team.name} has been ${
          currentlyActive ? "deactivated" : "activated"
        }.`
      );

      await loadTeams();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update the team's status."
      );
    } finally {
      setChangingStatusId(null);
    }
  };

  const activeCount = teams.filter(isTeamActive).length;
  const inactiveCount = teams.length - activeCount;

  return (
    <main className="team-management-page">
      <div className="page-header">
        <div>
          <p className="team-eyebrow">ADMINISTRATION</p>
          <h1>Team Management</h1>
          <p>
            Manage maintenance teams and their login accounts.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={openAddForm}
          disabled={saving || changingStatusId !== null}
        >
          <FiPlus />
          Add Maintenance Team
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
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
        <div className="success-message" role="status">
          <FiCheckCircle />
          <span>{message}</span>
        </div>
      )}

      <section className="team-summary">
        <div className="team-summary-card">
          <span className="team-summary-icon">
            <FiUsers />
          </span>
          <div>
            <p>Total Teams</p>
            <h2>{teams.length}</h2>
          </div>
        </div>

        <div className="team-summary-card">
          <span className="team-summary-icon team-summary-active">
            <FiCheckCircle />
          </span>
          <div>
            <p>Active Teams</p>
            <h2>{activeCount}</h2>
          </div>
        </div>

        <div className="team-summary-card">
          <span className="team-summary-icon team-summary-inactive">
            <FiXCircle />
          </span>
          <div>
            <p>Inactive Teams</p>
            <h2>{inactiveCount}</h2>
          </div>
        </div>
      </section>

      {showForm && (
        <section className="team-form-section">
          <div className="team-form-heading">
            <div>
              <h2>
                {editingId !== null
                  ? "Edit Maintenance Team"
                  : "Add Maintenance Team"}
              </h2>
              <p>
                {editingId !== null
                  ? "Update the team's details."
                  : "Enter the team details and create its login credentials."}
              </p>
            </div>

            <button
              type="button"
              className="team-close-button"
              onClick={closeForm}
              disabled={saving}
              aria-label="Close form"
            >
              <FiX />
            </button>
          </div>

          <form className="team-form" onSubmit={handleSubmit}>
            <div className="team-form-grid">
              <div className="form-group">
                <label htmlFor="team-name">Team Name *</label>
                <input
                  id="team-name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Road Maintenance Team"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team-category">Repair Category *</label>
                <select
                  id="team-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  disabled={saving}
                >
                  <option value="">Select category</option>
                  <option value="Roads">Roads and Potholes</option>
                  <option value="Electrical">Streetlights and Electrical</option>
                  <option value="Waste">Waste Management</option>
                  <option value="Drainage">Drainage and Sewage</option>
                  <option value="Water">Water Supply</option>
                  <option value="General Maintenance">
                    General Maintenance
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="team-contact">Contact Person *</label>
                <input
                  id="team-contact"
                  name="contactPerson"
                  value={form.contactPerson}
                  onChange={handleChange}
                  placeholder="Team leader's name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team-phone">Contact Number *</label>
                <input
                  id="team-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team-area">Service Area *</label>
                <input
                  id="team-area"
                  name="area"
                  value={form.area}
                  onChange={handleChange}
                  placeholder="e.g. North neighbourhood"
                  required
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team-active">Team Status</label>
                <select
                  id="team-active"
                  name="active"
                  value={String(form.active)}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      active: event.target.value === "true",
                    }))
                  }
                  disabled={saving}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {editingId === null && (
                <>
                  <div className="form-group team-form-full">
                    <label htmlFor="team-login-email">
                      Team Login Email *
                    </label>
                    <div>
                      <FiMail />
                      <input
                        id="team-login-email"
                        name="loginEmail"
                        type="email"
                        value={form.loginEmail}
                        onChange={handleChange}
                        placeholder="roadteam@example.com"
                        autoComplete="off"
                        required
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="form-group team-form-full">
                    <label htmlFor="team-login-password">
                      Team Login Password *
                    </label>
                    <div>
                      <FiLock />
                      <input
                        id="team-login-password"
                        name="loginPassword"
                        type="password"
                        value={form.loginPassword}
                        onChange={handleChange}
                        placeholder="At least 6 characters"
                        autoComplete="new-password"
                        minLength={6}
                        required
                        disabled={saving}
                      />
                    </div>
                    <small>
                      Save this password securely. It will not be displayed
                      again in Team Management.
                    </small>
                  </div>
                </>
              )}

              <div className="form-group team-form-full">
                <label htmlFor="team-description">Description</label>
                <textarea
                  id="team-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the team's responsibilities..."
                  rows={4}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="team-form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Create Team and Login"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="team-list-section">
        <div className="team-list-heading">
          <div>
            <h2>Maintenance Teams</h2>
            <p>
              {teams.length} team{teams.length !== 1 ? "s" : ""} registered
            </p>
          </div>

          <button
            type="button"
            className="team-refresh-button"
            onClick={loadTeams}
            disabled={loading || saving || changingStatusId !== null}
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="team-state-message">
            <FiRefreshCw className="team-loading-icon" />
            <p>Loading maintenance teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="team-state-message">
            <FiUsers />
            <h3>No maintenance teams yet</h3>
            <p>
              Add a team to make it available for assigning approved civic
              issues.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddForm}
              disabled={saving}
            >
              <FiPlus />
              Add First Team
            </button>
          </div>
        ) : (
          <div className="team-grid">
            {teams.map((team) => {
              const active = isTeamActive(team);
              const changing = changingStatusId === team.id;

              return (
                <article className="team-card" key={team.id}>
                  <div className="team-card-header">
                    <div className="team-card-icon">
                      <FiTool />
                    </div>

                    <span
                      className={`team-status ${
                        active
                          ? "team-status-active"
                          : "team-status-inactive"
                      }`}
                    >
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3>{team.name}</h3>
                  <p className="team-category">{team.category}</p>

                  <div className="team-card-details">
                    <p>
                      <FiUser />
                      <span>{team.contactPerson || "Not provided"}</span>
                    </p>

                    <p>
                      <FiPhone />
                      <span>{team.phone || "Not provided"}</span>
                    </p>

                    <p>
                      <FiMapPin />
                      <span>{team.area || "Area not specified"}</span>
                    </p>

                    {team.loginEmail && (
                      <p>
                        <FiMail />
                        <span>{team.loginEmail}</span>
                      </p>
                    )}
                  </div>

                  {team.description && (
                    <p className="team-description">{team.description}</p>
                  )}

                  <div className="team-card-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openEditForm(team)}
                      disabled={saving || changingStatusId !== null}
                    >
                      <FiEdit2 />
                      Edit
                    </button>

                    <button
                      type="button"
                      className={`btn ${
                        active ? "btn-danger" : "btn-primary"
                      }`}
                      onClick={() => toggleTeamStatus(team)}
                      disabled={saving || changingStatusId !== null}
                    >
                      {changing ? (
                        <>
                          <FiRefreshCw /> Updating...
                        </>
                      ) : active ? (
                        <>
                          <FiXCircle /> Deactivate
                        </>
                      ) : (
                        <>
                          <FiCheckCircle /> Activate
                        </>
                      )}
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

export default TeamManagement;
