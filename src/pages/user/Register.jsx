
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  FiShield,
  FiUser,
  FiMail,
  FiLock,
} from "react-icons/fi";

import { registerUser } from "../../services/authService";
import { loginSuccess } from "../../features/auth/authSlice";
import "./Register.css";

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      setError("Please enter your name and email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const user = await registerUser({
        name,
        email,
        password: form.password,
      });

      if (!user || user.id === undefined || user.id === null) {
        throw new Error(
          "Your account may have been created, but its details could not be confirmed. Please try signing in."
        );
      }

      // Public registration is restricted to resident accounts.
      const residentUser = {
        ...user,
        role: "resident",
      };

      // Clear any previous demo account identifiers.
      localStorage.removeItem("civicPulseTeamId");
      localStorage.setItem(
        "civicPulseUserId",
        String(residentUser.id)
      );

      dispatch(loginSuccess(residentUser));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="civic-register-page">
      <section className="civic-register-card">
        <Link to="/" className="civic-register-brand">
          <span className="civic-register-brand-icon">
            <FiShield />
          </span>
          CivicPulse
        </Link>

        <div className="civic-register-heading">
          <span>JOIN YOUR COMMUNITY</span>
          <h1>Create an account</h1>
          <p>
            Report neighbourhood problems and follow their progress.
          </p>
        </div>

        <form className="civic-register-form" onSubmit={handleSubmit}>
          <div className="civic-register-field">
            <label htmlFor="register-name">Full name</label>

            <div className="civic-register-input">
              <FiUser />

              <input
                id="register-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                maxLength={100}
                disabled={loading}
              />
            </div>
          </div>

          <div className="civic-register-field">
            <label htmlFor="register-email">Email address</label>

            <div className="civic-register-input">
              <FiMail />

              <input
                id="register-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
                maxLength={254}
                disabled={loading}
              />
            </div>
          </div>

          <div className="civic-register-field">
            <label htmlFor="register-password">Password</label>

            <div className="civic-register-input">
              <FiLock />

              <input
                id="register-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="civic-register-field">
            <label htmlFor="register-confirm">
              Confirm password
            </label>

            <div className="civic-register-input">
              <FiLock />

              <input
                id="register-confirm"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter your password again"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="civic-register-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="civic-register-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="civic-register-login">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
