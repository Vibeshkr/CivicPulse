import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiShield,
  FiClipboard,
  FiUsers,
  FiTool,
  FiCheckCircle,
  FiMapPin,
  FiArrowRight,
  FiSettings,
  FiInfo,
  FiUser,
  FiMail,
} from "react-icons/fi";
import "./AdminProfile.css";

function AdminProfile() {
  const user = useSelector((state) => state.auth.user);

  const shortcuts = [
    {
      title: "Issue Verification",
      description: "Review reports and verify community issues.",
      path: "/admin/issues",
      icon: <FiClipboard />,
    },
    {
      title: "Team Management",
      description: "Manage maintenance teams and their information.",
      path: "/admin/teams",
      icon: <FiUsers />,
    },
    {
      title: "Job Assignment",
      description: "Assign approved issues to active teams.",
      path: "/admin/assignments",
      icon: <FiTool />,
    },
    {
      title: "Resolution Verification",
      description: "Verify completed repairs before resolving issues.",
      path: "/admin/resolutions",
      icon: <FiCheckCircle />,
    },
    {
      title: "External Follow-ups",
      description: "Track issues referred to external organisations.",
      path: "/admin/external-followups",
      icon: <FiMapPin />,
    },
    {
      title: "Organisation Management",
      description: "Manage external organisation contact details.",
      path: "/admin/organizations",
      icon: <FiSettings />,
    },
  ];

  const adminName = user?.name?.trim() || "Administrator";
  const adminEmail = user?.email || "Email not available";

  return (
    <main className="admin-profile-page">
      <section className="ap-header">
        <div>
          <p className="ap-eyebrow">ADMINISTRATION</p>
          <h1>Administrator Profile</h1>
          <p>
            Manage neighbourhood issues, maintenance teams,
            and community repair activities.
          </p>

          <Link to="/admin" className="ap-back-link">
            <FiArrowRight />
            Back to Dashboard
          </Link>
        </div>

        <div className="ap-header-icon" aria-hidden="true">
          <FiShield />
        </div>
      </section>

      <section className="ap-profile-card">
        <div className="ap-profile-banner">
          <div className="ap-avatar" aria-hidden="true">
            <FiShield />
          </div>

          <div className="ap-profile-heading">
            <span className="ap-demo-label">
              CIVICPULSE ADMINISTRATOR
            </span>

            <h2>{adminName}</h2>

            <p>Administrator account</p>
          </div>

          <span className="ap-status">Admin</span>
        </div>

        <div className="ap-account-details">
          <div className="ap-account-detail">
            <span className="ap-account-detail-icon">
              <FiUser />
            </span>

            <div>
              <span className="ap-account-label">Full name</span>
              <p>{adminName}</p>
            </div>
          </div>

          <div className="ap-account-detail">
            <span className="ap-account-detail-icon">
              <FiMail />
            </span>

            <div>
              <span className="ap-account-label">Email address</span>
              <p>{adminEmail}</p>
            </div>
          </div>

          <div className="ap-account-detail">
            <span className="ap-account-detail-icon">
              <FiShield />
            </span>

            <div>
              <span className="ap-account-label">Account role</span>
              <p>Administrator</p>
            </div>
          </div>
        </div>

        <div className="ap-notice">
          <FiInfo />

          <div>
            <h3>Administrator responsibilities</h3>
            <p>
              Review reports, verify issue details, assign maintenance
              work, coordinate external follow-ups, and verify completed
              repairs before closing issues.
            </p>
          </div>
        </div>

        <div className="ap-section-heading">
          <h3>Administration Shortcuts</h3>
          <p>
            Quickly access the tools required to manage CivicPulse.
          </p>
        </div>

        <div className="ap-action-grid">
          {shortcuts.map((shortcut) => (
            <Link
              to={shortcut.path}
              className="ap-action-card"
              key={shortcut.title}
            >
              <span className="ap-action-icon">
                {shortcut.icon}
              </span>

              <div className="ap-action-content">
                <strong>{shortcut.title}</strong>
                <small>{shortcut.description}</small>
              </div>

              <FiArrowRight className="ap-action-arrow" />
            </Link>
          ))}
        </div>

        <div className="ap-footer-note">
          <FiShield />

          <p>
            Your displayed profile information comes from the currently
            signed-in account. Account permissions are handled by the
            CivicPulse authentication flow.
          </p>
        </div>
      </section>
    </main>
  );
}

export default AdminProfile;