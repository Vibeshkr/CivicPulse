
import { Link } from "react-router-dom";
import { FiActivity, FiHeart } from "react-icons/fi";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer" id="about">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="navbar-brand">
              <span className="brand-icon">
                <FiActivity />
              </span>
              <span>
                Civic<span className="brand-highlight">Pulse</span>
              </span>
            </Link>

            <p>
              Working together for a cleaner, safer and better
              neighbourhood.
            </p>
          </div>

          <div className="footer-links">
            <h3>Explore</h3>
            <Link to="/">Home</Link>
            <Link to="/explore">Explore Issues</Link>
            <Link to="/login">Login</Link>
          </div>

          <div className="footer-links">
            <h3>Get Involved</h3>
            <Link to="/report">Report an Issue</Link>
            <Link to="/register">Create an Account</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CivicPulse. All rights reserved.</p>
          <span>
            Made for communities <FiHeart />
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
