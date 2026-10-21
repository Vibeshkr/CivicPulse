
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
} from "react-icons/fi";

import { loginUser } from "../../services/authService";
import { loginSuccess, logout } from "../../features/auth/authSlice";
import "./Login.css";

const ALLOWED_ROLES = [
  "resident",
  "admin",
  "maintenance",
  "maintenanceTeam",
];

function getSafePath(path) {
  if (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
  ) {
    return path;
  }

  return null;
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const user = await loginUser({
        email,
        password: form.password,
      });

      if (!user || !ALLOWED_ROLES.includes(user.role)) {
        setError("This account has an unrecognised role.");
        return;
      }

      // Clear demo identifiers from any previous account.
      localStorage.removeItem("civicPulseUserId");
      localStorage.removeItem("civicPulseTeamId");

      dispatch(loginSuccess(user));

      if (user.role === "resident") {
        localStorage.setItem("civicPulseUserId", String(user.id));

        const requestedPath = location.state?.from;
        const requestedPathname =
          typeof requestedPath === "string"
            ? requestedPath
            : requestedPath?.pathname
              ? `${requestedPath.pathname}${requestedPath.search || ""}${requestedPath.hash || ""}`
              : null;

        const redirectQuery = new URLSearchParams(
          location.search
        ).get("redirect");

        const destination =
          getSafePath(requestedPathname) ||
          getSafePath(redirectQuery) ||
          "/dashboard";

        navigate(destination, { replace: true });
        return;
      }

      if (user.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (user.maintenanceTeamId !== undefined &&
          user.maintenanceTeamId !== null &&
          String(user.maintenanceTeamId).trim() !== "") {
        localStorage.setItem(
          "civicPulseTeamId",
          String(user.maintenanceTeamId)
        );
      }

      navigate("/maintenance", { replace: true });
    } catch (err) {
      dispatch(logout());
      localStorage.removeItem("civicPulseUserId");
      localStorage.removeItem("civicPulseTeamId");

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to sign in. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="civic-login-page">
      <section className="civic-login-card">
        <Link to="/" className="civic-login-brand">
          <span className="civic-login-brand-icon">
            <FiShield />
          </span>
          <span>CivicPulse</span>
        </Link>

        <div className="civic-login-heading">
          <span>WELCOME BACK</span>
          <h1>Sign in to CivicPulse</h1>
          <p>
            Access your neighbourhood issue reports and updates.
          </p>
        </div>

        <form className="civic-login-form" onSubmit={handleSubmit}>
          <div className="civic-login-field">
            <label htmlFor="login-email">Email address</label>

            <div className="civic-login-input-wrap">
              <FiMail />

              <input
                id="login-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="civic-login-field">
            <label htmlFor="login-password">Password</label>

            <div className="civic-login-input-wrap">
              <FiLock />

              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="civic-login-toggle"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                disabled={loading}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {error && (
            <div className="civic-login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="civic-login-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="civic-login-register">
          Don't have an account?{" "}
          <Link to="/register">Create an account</Link>
        </p>

        <div className="civic-login-footer">
          Demo access for residents and authorised CivicPulse staff.
        </div>
      </section>
    </main>
  );
}

export default Login;
