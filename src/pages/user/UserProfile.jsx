
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiUser,
  FiClipboard,
  FiActivity,
  FiBell,
  FiPlusCircle,
  FiArrowRight,
  FiInfo,
  FiMail,
  FiShield,
} from "react-icons/fi";

import "./UserProfile.css";

function UserProfile() {
  const user = useSelector((state) => state.auth.user);

  const shortcuts = [
    {
      title: "My Reports",
      description: "View the community issues you have reported.",
      path: "/my-reports",
      icon: <FiClipboard />,
    },
    {
      title: "Track Issue Progress",
      description: "Follow repair progress and current issue status.",
      path: "/track-issues",
      icon: <FiActivity />,
    },
    {
      title: "My Notifications",
      description: "View updates about your reported community issues.",
      path: "/my-notifications",
      icon: <FiBell />,
    },
    {
      title: "Report a Problem",
      description: "Submit a new neighbourhood maintenance issue.",
      path: "/report",
      icon: <FiPlusCircle />,
    },
  ];

  return (
    <main className="user-profile-page">
      <div className="user-profile-container">
        <header className="user-profile-header">
          <div className="user-profile-header-icon">
            <FiUser />
          </div>

          <div>
            <p className="user-profile-eyebrow">RESIDENT ACCOUNT</p>
            <h1>My Profile</h1>
            <p>
              View your account details and access your CivicPulse services.
            </p>
          </div>
        </header>

        <section className="user-profile-card">
          <div className="user-profile-avatar">
            <FiUser />
          </div>

          <div className="user-profile-information">
            <span className="user-profile-status">
              <FiShield /> Resident Account
            </span>

            <h2>{user?.name || "Resident"}</h2>

            <p>Neighbourhood Resident</p>

            <p className="user-profile-email">
              <FiMail /> {user?.email || "Email unavailable"}
            </p>
          </div>
        </section>

        <section className="user-profile-notice">
          <FiInfo />

          <div>
            <h3>About your account</h3>
            <p>
              Your profile represents the resident account currently signed
              in to CivicPulse. Your reports and notifications are associated
              with this account.
            </p>
          </div>
        </section>

        <section className="user-profile-shortcuts">
          <div className="user-profile-section-heading">
            <h2>Resident Services</h2>
            <p>Choose a service to continue.</p>
          </div>

          <div className="user-profile-action-grid">
            {shortcuts.map((shortcut) => (
              <Link
                to={shortcut.path}
                className="user-profile-action-card"
                key={shortcut.title}
              >
                <span className="user-profile-action-icon">
                  {shortcut.icon}
                </span>

                <div>
                  <h3>{shortcut.title}</h3>
                  <p>{shortcut.description}</p>
                </div>

                <FiArrowRight className="user-profile-action-arrow" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default UserProfile;
