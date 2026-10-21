
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiMapPin,
  FiPhone,
  FiMail,
  FiTool,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiClipboard,
} from "react-icons/fi";
import api from "../../services/api";
import "./MaintenanceProfile.css";

function MaintenanceProfile() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allTeams, setAllTeams] = useState([]);

  useEffect(() => {
    const loadTeam = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/maintenanceTeams");
        const teams = response.data;

        setAllTeams(teams);

        const savedTeamId = localStorage.getItem("civicPulseTeamId");

        const selectedTeam = savedTeamId
          ? teams.find(
              (item) => String(item.id) === String(savedTeamId)
            )
          : null;

        setTeam(selectedTeam || null);
      } catch {
        setError(
          "Unable to load team information. Please check the backend connection."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTeam();
  }, []);

  const handleSelectTeam = (event) => {
    const teamId = event.target.value;

    if (!teamId) {
      localStorage.removeItem("civicPulseTeamId");
      setTeam(null);
      return;
    }

    const selectedTeam = allTeams.find(
      (item) => String(item.id) === String(teamId)
    );

    if (selectedTeam) {
      localStorage.setItem("civicPulseTeamId", selectedTeam.id);
      setTeam(selectedTeam);
    }
  };

  if (loading) {
    return (
      <main className="maintenance-profile-page">
        <div className="mp-feedback">Loading team profile...</div>
      </main>
    );
  }

  return (
    <main className="maintenance-profile-page">
      <header className="mp-header">
        <div>
          <p className="mp-eyebrow">MAINTENANCE WORKSPACE</p>
          <h1>Team Profile</h1>
          <p>View your maintenance team information and service area.</p>

          <Link to="/maintenance" className="mp-back-link">
            <FiArrowLeft /> Back to Dashboard
          </Link>
        </div>

        <div className="mp-header-icon">
          <FiTool />
        </div>
      </header>

      {error && (
        <div className="mp-alert mp-error">
          <FiAlertCircle />
          {error}
        </div>
      )}

      <section className="mp-profile-card">
        <div className="mp-profile-banner">
          <div className="mp-avatar">
            <FiTool />
          </div>

          <div>
            <p className="mp-eyebrow">TEAM INFORMATION</p>
            <h2>{team?.name || "Select a Maintenance Team"}</h2>
            <p>
              {team?.category || "Maintenance team details"}
            </p>
          </div>

          {team && (
            <span
              className={`mp-status ${
                team.active ? "mp-active" : "mp-inactive"
              }`}
            >
              {team.active ? "Active" : "Inactive"}
            </span>
          )}
        </div>

        <div className="mp-profile-content">
          {!team ? (
            <div className="mp-empty">
              <FiUser />
              <h3>No team selected</h3>
              <p>
                Choose a team from the list below to preview its profile.
                Team selection is for demonstration only until authentication
                and role-based access are implemented.
              </p>

              <label htmlFor="mp-team-select">
                Choose maintenance team
              </label>

              <select
                id="mp-team-select"
                defaultValue=""
                onChange={handleSelectTeam}
              >
                <option value="">Select a team</option>

                {allTeams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="mp-details-grid">
                <article className="mp-detail-item">
                  <span className="mp-detail-icon">
                    <FiUser />
                  </span>
                  <div>
                    <p>Contact Person</p>
                    <h3>{team.contactPerson || "Not provided"}</h3>
                  </div>
                </article>

                <article className="mp-detail-item">
                  <span className="mp-detail-icon">
                    <FiPhone />
                  </span>
                  <div>
                    <p>Contact Number</p>
                    <h3>{team.phone || "Not provided"}</h3>
                  </div>
                </article>

                <article className="mp-detail-item">
                  <span className="mp-detail-icon">
                    <FiMapPin />
                  </span>
                  <div>
                    <p>Service Area</p>
                    <h3>{team.area || "Not specified"}</h3>
                  </div>
                </article>

                <article className="mp-detail-item">
                  <span className="mp-detail-icon">
                    <FiTool />
                  </span>
                  <div>
                    <p>Specialisation</p>
                    <h3>{team.category || "General maintenance"}</h3>
                  </div>
                </article>
              </div>

              <div className="mp-description">
                <h3>Team Description</h3>
                <p>
                  {team.description ||
                    "No team description has been added yet."}
                </p>
              </div>

              <div className="mp-profile-actions">
                <Link to="/maintenance" className="mp-primary-button">
                  View Assigned Jobs <FiArrowRight />
                </Link>

                <Link
                  to="/maintenance/history"
                  className="mp-secondary-button"
                >
                  <FiClipboard /> Work History
                </Link>
              </div>

              <div className="mp-notice">
                <FiCheckCircle />
                <p>
                  Team information is managed by the CivicPulse
                  administrator. Contact the admin to request changes.
                </p>
              </div>

              <div className="mp-switch-team">
                <label htmlFor="mp-team-switch">
                  Preview another team
                </label>

                <select
                  id="mp-team-switch"
                  value={team.id}
                  onChange={handleSelectTeam}
                >
                  {allTeams.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p>
                  This selector is temporary and will be replaced by
                  authenticated team access later.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default MaintenanceProfile;
