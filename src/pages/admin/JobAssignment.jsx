
import { useEffect, useState } from "react";
import {
  FiTool,
  FiRefreshCw,
  FiMapPin,
  FiUsers,
  FiCheckCircle,
  FiAlertCircle,
  FiClipboard,
} from "react-icons/fi";

import {
  getIssues,
  getMaintenanceTeams,
  updateIssue,
  createNotification,
} from "../../services/civicPulseService";

import "./JobAssignment.css";

function JobAssignment() {
  const [issues, setIssues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [issueData, teamData] = await Promise.all([
        getIssues(),
        getMaintenanceTeams(),
      ]);

      if (!Array.isArray(issueData) || !Array.isArray(teamData)) {
        throw new Error("The server returned invalid assignment data.");
      }

      setIssues(issueData);
      setTeams(teamData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load issues and maintenance teams."
      );
    } finally {
      setLoading(false);
    }
  };

  const activeTeams = teams.filter(
    (team) => team.active !== false && team.active !== "false"
  );

  const awaitingAssignment = issues.filter(
    (issue) =>
      issue.status === "Approved for Assignment" &&
      !issue.assignedTeamId
  );

  const query = search.trim().toLowerCase();

  const filteredAwaiting = awaitingAssignment.filter((issue) => {
    return (
      !query ||
      String(issue.title || "").toLowerCase().includes(query) ||
      String(issue.location || "").toLowerCase().includes(query) ||
      String(issue.category || "").toLowerCase().includes(query) ||
      String(issue.id || "").toLowerCase().includes(query)
    );
  });

  const assignedIssues = issues.filter(
    (issue) =>
      Boolean(issue.assignedTeamId) &&
      ![
        "Resolved",
        "Rejected—False Report",
        "Duplicate",
      ].includes(issue.status)
  );

  const handleTeamChange = (issueId, teamId) => {
    setSelectedTeams((previous) => ({
      ...previous,
      [issueId]: teamId,
    }));

    setError("");
    setMessage("");
  };

  const handleAssign = async (issue) => {
    if (savingId !== null) return;

    // Prevent assignment if the issue is no longer eligible.
    const currentIssue = issues.find(
      (item) => String(item.id) === String(issue.id)
    );

    if (
      !currentIssue ||
      currentIssue.status !== "Approved for Assignment" ||
      currentIssue.assignedTeamId
    ) {
      setError(
        "This issue is no longer awaiting assignment. Refresh the data and try again."
      );
      setMessage("");
      await loadData();
      return;
    }

    const selectedTeamId = selectedTeams[issue.id];

    if (!selectedTeamId) {
      setError("Select a maintenance team before assigning this issue.");
      setMessage("");
      return;
    }

    const team = activeTeams.find(
      (item) => String(item.id) === String(selectedTeamId)
    );

    if (!team) {
      setError("That team is unavailable. Please select an active team.");
      setMessage("");
      return;
    }

    try {
      setSavingId(issue.id);
      setError("");
      setMessage("");

      await updateIssue(issue.id, {
        assignedTeamId: team.id,
        assignedTeamName: team.name,
        responsibility: "Internal Maintenance",
        status: "Assigned",
        assignedAt: new Date().toISOString(),
      });

      let notificationFailed = false;

      const teamUserId = team.userId ?? team.user?.id;

      if (teamUserId != null) {
        try {
          await createNotification({
            userId: teamUserId,
            issueId: issue.id,
            title: "New maintenance job assigned",
            message: `The issue "${issue.title || "Untitled issue"}" has been assigned to your team. Location: ${issue.location || "Not provided"}. Please review the job and update its progress.`,
            type: "maintenance-assignment",
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        } catch {
          notificationFailed = true;
        }
      } else {
        notificationFailed = true;
      }

      setSelectedTeams((previous) => {
        const next = { ...previous };
        delete next[issue.id];
        return next;
      });

      setMessage(
        notificationFailed
          ? `Issue "${issue.title || "Untitled issue"}" was assigned to ${team.name}, but the notification could not be created. Check that the maintenance team has a valid userId.`
          : `Issue "${issue.title || "Untitled issue"}" assigned to ${team.name}. The team has been notified.`
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to assign this issue. Please try again."
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="job-assignment-page">
      <header className="job-assignment-header">
        <div>
          <p className="job-assignment-eyebrow">ADMINISTRATION</p>
          <h1>Job Assignment</h1>
          <p>
            Assign approved neighbourhood repair issues to available
            maintenance teams.
          </p>
        </div>

        <button
          type="button"
          className="job-assignment-refresh"
          onClick={loadData}
          disabled={loading || savingId !== null}
        >
          <FiRefreshCw />
          Refresh
        </button>
      </header>

      {error && (
        <div className="job-assignment-message error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="job-assignment-message success" role="status">
          <FiCheckCircle />
          <span>{message}</span>
        </div>
      )}

      <section className="job-assignment-summary">
        <article className="job-assignment-summary-card">
          <FiClipboard />
          <div>
            <p>Awaiting Assignment</p>
            <h2>{awaitingAssignment.length}</h2>
          </div>
        </article>

        <article className="job-assignment-summary-card">
          <FiTool />
          <div>
            <p>Active Maintenance Teams</p>
            <h2>{activeTeams.length}</h2>
          </div>
        </article>

        <article className="job-assignment-summary-card">
          <FiUsers />
          <div>
            <p>Assigned, Unfinished Jobs</p>
            <h2>{assignedIssues.length}</h2>
          </div>
        </article>
      </section>

      <section className="job-assignment-section">
        <div className="job-assignment-section-heading">
          <div>
            <h2>Approved Issues</h2>
            <p>
              Only issues approved for assignment appear in this section.
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search approved issues..."
            aria-label="Search approved issues"
          />
        </div>

        {loading ? (
          <div className="job-assignment-empty">
            <FiRefreshCw />
            <p>Loading assignment data...</p>
          </div>
        ) : error && issues.length === 0 ? (
          <div className="job-assignment-empty">
            <FiAlertCircle />
            <p>Unable to load assignment data. Please refresh.</p>
          </div>
        ) : filteredAwaiting.length === 0 ? (
          <div className="job-assignment-empty">
            <FiCheckCircle />
            <h3>No issues awaiting assignment</h3>
            <p>
              Issues approved by the administrator will appear here.
            </p>
          </div>
        ) : (
          <div className="job-assignment-grid">
            {filteredAwaiting.map((issue) => (
              <article className="job-assignment-card" key={issue.id}>
                <div className="job-assignment-card-top">
                  <span className="job-assignment-category">
                    {issue.category || "General"}
                  </span>
                  <span className="job-assignment-status">
                    {issue.status}
                  </span>
                </div>

                <h3>{issue.title || "Untitled issue"}</h3>

                <p className="job-assignment-location">
                  <FiMapPin />
                  {issue.location || "Location not provided"}
                </p>

                <p className="job-assignment-description">
                  {issue.description || "No description provided."}
                </p>

                <div className="job-assignment-team-selector">
                  <label htmlFor={`team-${issue.id}`}>
                    Assign maintenance team
                  </label>

                  <select
                    id={`team-${issue.id}`}
                    value={selectedTeams[issue.id] || ""}
                    onChange={(event) =>
                      handleTeamChange(issue.id, event.target.value)
                    }
                    disabled={
                      activeTeams.length === 0 || savingId !== null
                    }
                  >
                    <option value="">Select a team</option>
                    {activeTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} — {team.category || "General"}
                      </option>
                    ))}
                  </select>
                </div>

                {activeTeams.length === 0 && (
                  <p className="job-assignment-warning">
                    No active teams are available. Activate or create a
                    maintenance team first.
                  </p>
                )}

                <button
                  type="button"
                  className="job-assignment-submit"
                  onClick={() => handleAssign(issue)}
                  disabled={savingId !== null || activeTeams.length === 0}
                >
                  {savingId === issue.id ? (
                    <>
                      <FiRefreshCw /> Assigning...
                    </>
                  ) : (
                    <>
                      <FiTool /> Assign Job
                    </>
                  )}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="job-assignment-section">
        <div className="job-assignment-section-heading">
          <div>
            <h2>Current Assignments</h2>
            <p>Assigned jobs that have not reached a final status.</p>
          </div>
        </div>

        {assignedIssues.length === 0 ? (
          <div className="job-assignment-empty">
            <FiTool />
            <p>No active assignments yet.</p>
          </div>
        ) : (
          <div className="job-assignment-table-wrapper">
            <table className="job-assignment-table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>Assigned Team</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {assignedIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <strong>{issue.title || "Untitled issue"}</strong>
                      <span>#{issue.id}</span>
                    </td>
                    <td>{issue.location || "Not provided"}</td>
                    <td>{issue.assignedTeamName || "Team not recorded"}</td>
                    <td>
                      <span className="job-assignment-table-status">
                        {issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default JobAssignment;
