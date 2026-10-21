
import { useEffect, useState, useCallback } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  FiActivity,
  FiMenu,
  FiX,
  FiLogOut,
  FiGrid,
  FiBell,
  FiCheck,
  FiClock,
  FiExternalLink,
} from "react-icons/fi";

import { logout } from "../features/auth/authSlice";
import {
  getNotifications,
  updateNotification,
} from "../services/civicPulseService";

import "./Navbar.css";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth?.user);
  const isAuthenticated = useSelector(
    (state) => state.auth?.isAuthenticated
  );

  const isLoggedIn = Boolean(
    isAuthenticated && user?.id !== undefined && user?.id !== null
  );

  const role = String(user?.role || "").toLowerCase();

  const isAdmin = role === "admin";

  const isMaintenance = [
    "maintenance",
    "maintenance_team",
    "maintenanceteam",
  ].includes(role);

  const dashboardPath = isAdmin
    ? "/admin"
    : isMaintenance
      ? "/maintenance"
      : "/dashboard";

  const notificationPath = isAdmin
    ? "/admin/issues"
    : isMaintenance
      ? "/maintenance/priority-jobs"
      : "/my-notifications";

  const notificationLabel = isAdmin
    ? "Admin Notifications"
    : isMaintenance
      ? "Maintenance Notifications"
      : "My Notifications";

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const closeNotifications = () => {
    setNotificationsOpen(false);
  };

  // Load every notification belonging to the signed-in user.
  // Read notifications are deliberately kept in the list.
  const loadNotifications = useCallback(async () => {
    if (
      !isLoggedIn ||
      user?.id === undefined ||
      user?.id === null
    ) {
      setNotifications([]);
      return;
    }

    try {
      setNotificationsLoading(true);

      const allNotifications = await getNotifications();

      const userNotifications = allNotifications
        .filter(
          (notification) =>
            String(notification.userId) === String(user.id)
        )
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();

          return dateB - dateA;
        });

      setNotifications(userNotifications);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isLoggedIn, user?.id]);

  // Load notifications after login and refresh every 15 seconds.
  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      return undefined;
    }

    loadNotifications();

    const intervalId = window.setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [isLoggedIn, loadNotifications]);

  // Refresh notifications when navigating between pages.
  useEffect(() => {
    if (isLoggedIn) {
      loadNotifications();
    }
  }, [location.pathname, isLoggedIn, loadNotifications]);

  // Count unread notifications only.
  const unreadCount = notifications.filter(
    (notification) =>
      !(
        notification.isRead === true ||
        notification.isRead === 1 ||
        notification.isRead === "true"
      )
  ).length;

  const isNotificationRead = (notification) =>
    notification.isRead === true ||
    notification.isRead === 1 ||
    notification.isRead === "true";

  // Mark a notification as read without deleting it.
  const markAsRead = async (notification) => {
    if (isNotificationRead(notification)) {
      return true;
    }

    try {
      await updateNotification(notification.id, {
        isRead: true,
      });

      setNotifications((previous) =>
        previous.map((item) =>
          String(item.id) === String(notification.id)
            ? { ...item, isRead: true }
            : item
        )
      );

      return true;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  };

  // Clicking a notification marks it as read and opens
  // the existing role-specific notifications page.
  const handleNotificationClick = async (notification) => {
    await markAsRead(notification);

    closeNotifications();
    closeMenu();

    navigate(notificationPath);
  };

  // Mark every notification as read without removing any.
  const handleMarkAllRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => !isNotificationRead(notification)
    );

    if (unreadNotifications.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      unreadNotifications.map((notification) =>
        updateNotification(notification.id, {
          isRead: true,
        })
      )
    );

    const successfullyReadIds = new Set(
      unreadNotifications
        .filter((_, index) => results[index].status === "fulfilled")
        .map((notification) => String(notification.id))
    );

    setNotifications((previous) =>
      previous.map((notification) =>
        successfullyReadIds.has(String(notification.id))
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const handleAboutClick = (event) => {
    event.preventDefault();
    closeMenu();

    if (
      location.pathname === "/" &&
      location.hash === "#about"
    ) {
      document.getElementById("about")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    navigate("/#about");
  };

  // Scroll to About after navigating to the home page.
  useEffect(() => {
    if (
      location.pathname !== "/" ||
      location.hash !== "#about"
    ) {
      return undefined;
    }

    let attempts = 0;
    let timer;

    const scrollToAbout = () => {
      const section = document.getElementById("about");

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        return;
      }

      if (attempts < 15) {
        attempts += 1;
        timer = window.setTimeout(scrollToAbout, 100);
      }
    };

    timer = window.setTimeout(scrollToAbout, 100);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const handleHomeClick = (event) => {
    closeMenu();

    if (location.pathname === "/") {
      event.preventDefault();
      navigate("/", { replace: true });

      window.setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 0);
    }
  };

  const handleBrandClick = (event) => {
    closeMenu();

    if (location.pathname === "/") {
      event.preventDefault();
      navigate("/", { replace: true });

      window.setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, 0);
    }
  };

  const handleLogout = () => {
    setNotifications([]);
    closeNotifications();
    closeMenu();

    dispatch(logout());

    navigate("/", { replace: true });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const formatNotificationTime = (dateValue) => {
    if (!dateValue) {
      return "";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link
          to="/"
          className="navbar-brand"
          onClick={handleBrandClick}
        >
          <span className="brand-icon">
            <FiActivity />
          </span>

          <span>
            Civic<span className="brand-highlight">Pulse</span>
          </span>
        </Link>

        <button
          type="button"
          className="menu-toggle"
          onClick={() =>
            setMenuOpen((previous) => !previous)
          }
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>

        <nav
          className={`navbar-links ${menuOpen ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <NavLink to="/" end onClick={handleHomeClick}>
            Home
          </NavLink>

          <NavLink to="/explore" onClick={closeMenu}>
            Explore Issues
          </NavLink>

          <a href="/#about" onClick={handleAboutClick}>
            About
          </a>

          {!isLoggedIn && (
            <Link
              to="/login?redirect=/report"
              className="mobile-report-link"
              onClick={closeMenu}
            >
              Report Issue
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login?redirect=/report"
                className="btn btn-primary navbar-report"
                onClick={closeMenu}
              >
                Report Issue
              </Link>

              <Link
                to="/login"
                className="btn btn-secondary navbar-login"
                onClick={closeMenu}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-primary"
                onClick={closeMenu}
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <div className="navbar-notification-wrapper">
                <button
                  type="button"
                  className="navbar-notification"
                  onClick={() =>
                    setNotificationsOpen((previous) => !previous)
                  }
                  aria-label={`${notificationLabel}, ${unreadCount} unread`}
                  aria-expanded={notificationsOpen}
                  title={notificationLabel}
                >
                  <FiBell />

                  <span className="navbar-notification-label">
                    Notifications
                  </span>

                  {unreadCount > 0 && (
                    <span className="navbar-notification-count">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                      <div>
                        <h3>{notificationLabel}</h3>

                        <p>
                          {unreadCount} unread notification
                          {unreadCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="notification-close"
                        onClick={closeNotifications}
                        aria-label="Close notifications"
                      >
                        <FiX />
                      </button>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notification-mark-all"
                        onClick={handleMarkAllRead}
                      >
                        <FiCheck /> Mark all as read
                      </button>
                    )}

                    <div className="notification-list">
                      {notificationsLoading &&
                      notifications.length === 0 ? (
                        <div className="notification-empty">
                          Loading notifications...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="notification-empty">
                          <FiBell />
                          <strong>No notifications yet</strong>
                          <span>
                            New updates will appear here.
                          </span>
                        </div>
                      ) : (
                        notifications.map((notification) => {
                          const isRead =
                            isNotificationRead(notification);

                          return (
                            <button
                              type="button"
                              key={notification.id}
                              className={`notification-item ${
                                isRead ? "is-read" : "is-unread"
                              }`}
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                            >
                              <span className="notification-item-icon">
                                {isRead ? (
                                  <FiCheck />
                                ) : (
                                  <FiBell />
                                )}
                              </span>

                              <span className="notification-item-content">
                                <strong>
                                  {notification.title ||
                                    "CivicPulse Update"}
                                </strong>

                                <span className="notification-message">
                                  {notification.message ||
                                    "You have a new update."}
                                </span>

                                <span className="notification-time">
                                  <FiClock />
                                  {formatNotificationTime(
                                    notification.createdAt
                                  )}
                                </span>
                              </span>

                              {!isRead && (
                                <span className="notification-unread-dot" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <Link
                      to={notificationPath}
                      className="notification-view-all"
                      onClick={() => {
                        closeNotifications();
                        closeMenu();
                      }}
                    >
                      Open {notificationLabel}
                      <FiExternalLink />
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to={dashboardPath}
                className="btn btn-secondary navbar-login"
                onClick={closeMenu}
              >
                <FiGrid /> Dashboard
              </Link>

              <button
                type="button"
                className="btn btn-primary navbar-logout"
                onClick={handleLogout}
              >
                <FiLogOut /> Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;