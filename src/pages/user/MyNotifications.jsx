
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiRefreshCw,
  FiAlertCircle,
  FiArrowLeft,
} from "react-icons/fi";

import {
  getNotifications,
  updateNotification,
} from "../../services/civicPulseService";

import "./MyNotifications.css";

const getRecipientId = (notification) =>
  notification.userId ??
  notification.residentId ??
  notification.recipientId ??
  notification.user?.id;

const isNotificationRead = (notification) =>
  notification.isRead === true ||
  notification.isRead === 1 ||
  notification.isRead === "true";

function MyNotifications() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (user?.id == null) {
      setNotifications([]);
      setLoading(false);
      setError("Please sign in to view your notifications.");
      return;
    }

    setLoading(true);

    try {
      setError("");

      const data = await getNotifications();

      if (!Array.isArray(data)) {
        throw new Error("Invalid notifications response");
      }

      const residentNotifications = data
        .filter((notification) => {
          const recipientId = getRecipientId(notification);

          return (
            recipientId != null &&
            String(recipientId) === String(user.id)
          );
        })
        .sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();

          return dateB - dateA;
        });

      setNotifications(residentNotifications);
    } catch (err) {
      setError("Unable to load notifications. Check that your server is running.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = notifications.filter(
    (notification) => !isNotificationRead(notification)
  ).length;

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) => !isNotificationRead(notification)
      );
    }

    if (filter === "read") {
      return notifications.filter(isNotificationRead);
    }

    return notifications;
  }, [notifications, filter]);

  const markAsRead = async (notification) => {
    if (isNotificationRead(notification)) {
      return true;
    }

    if (String(updatingId) === String(notification.id)) {
      return false;
    }

    setUpdatingId(notification.id);

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
    } catch (err) {
      setError("Could not mark this notification as read.");
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(
      (notification) => !isNotificationRead(notification)
    );

    if (unread.length === 0) return;

    setMarkingAll(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        unread.map((notification) =>
          updateNotification(notification.id, {
            isRead: true,
          })
        )
      );

      const failed = results.some(
        (result) => result.status === "rejected"
      );

      await loadNotifications();

      if (failed) {
        setError("Some notifications could not be marked as read.");
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const openNotification = async (notification) => {
    const marked = await markAsRead(notification);

    if (!marked) return;

    const issueId = notification.issueId ?? notification.issue?.id;

    if (issueId != null && String(issueId).trim() !== "") {
      navigate(`/issues/${issueId}`);
    } else {
      setError(
        "This notification has no linked issue. You can still read its message above."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString();
  };

  const formatType = (type) => {
    if (!type) return "General update";

    return String(type)
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <main className="my-notifications-page">
      <header className="mn-header">
        <div>
          <p className="mn-eyebrow">CIVICPULSE / RESIDENT</p>

          <h1>My Notifications</h1>

          <p className="mn-header-description">
            Stay informed about your submitted reports, admin decisions,
            maintenance assignments, and repair progress.
          </p>
        </div>

        <div className="mn-header-icon">
          <FiBell />
        </div>
      </header>

      <section className="mn-summary">
        <div className="mn-summary-card">
          <div className="mn-summary-icon">
            <FiBell />
          </div>

          <div>
            <p className="mn-summary-label">Total notifications</p>
            <p className="mn-summary-value">{notifications.length}</p>
          </div>
        </div>

        <div className="mn-summary-card">
          <div className="mn-summary-icon mn-summary-icon-unread">
            <FiAlertCircle />
          </div>

          <div>
            <p className="mn-summary-label">Unread notifications</p>
            <p className="mn-summary-value">{unreadCount}</p>
          </div>
        </div>
      </section>

      <section className="mn-list-section">
        <div className="mn-section-heading">
          <div>
            <h2>Recent activity</h2>
            <p>
              Read updates and open the related issue to follow its progress.
            </p>
          </div>

          <button
            type="button"
            className="mn-refresh-button"
            onClick={loadNotifications}
            disabled={loading || markingAll}
          >
            <FiRefreshCw className={loading ? "mn-spinning" : ""} />
            Refresh
          </button>
        </div>

        <div className="mn-toolbar">
          <div className="mn-filter-group">
            <button
              type="button"
              className={`mn-filter-button ${
                filter === "all" ? "mn-filter-active" : ""
              }`}
              onClick={() => setFilter("all")}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              className={`mn-filter-button ${
                filter === "unread" ? "mn-filter-active" : ""
              }`}
              onClick={() => setFilter("unread")}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              className={`mn-filter-button ${
                filter === "read" ? "mn-filter-active" : ""
              }`}
              onClick={() => setFilter("read")}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="mn-mark-all-button"
              onClick={markAllAsRead}
              disabled={markingAll}
            >
              <FiCheckCircle />
              {markingAll ? "Updating..." : "Mark all as read"}
            </button>
          )}
        </div>

        {error && (
          <div className="mn-error" role="alert">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="mn-state">
            <FiRefreshCw className="mn-spinning" />
            <p>Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="mn-empty-state">
            <div className="mn-empty-icon">
              <FiBell />
            </div>

            <h3>
              {filter === "unread"
                ? "You are all caught up"
                : filter === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
            </h3>

            <p>
              {filter === "unread"
                ? "You have no unread notifications."
                : filter === "read"
                  ? "Notifications you have read will appear here."
                  : "Updates about your reported issues will appear here when available."}
            </p>

            <Link to="/dashboard" className="mn-dashboard-link">
              <FiArrowLeft />
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="mn-notification-list">
            {filteredNotifications.map((notification) => {
              const read = isNotificationRead(notification);

              return (
                <article
                  key={notification.id}
                  className={`mn-notification-card ${
                    read
                      ? "mn-notification-read"
                      : "mn-notification-unread"
                  }`}
                >
                  <div className="mn-notification-icon">
                    {read ? <FiCheckCircle /> : <FiBell />}
                  </div>

                  <div className="mn-notification-content">
                    <div className="mn-notification-top">
                      <h3>
                        {notification.title || "Issue update"}
                      </h3>

                      {!read && (
                        <span className="mn-unread-badge">Unread</span>
                      )}
                    </div>

                    <p className="mn-notification-message">
                      {notification.message ||
                        "There is an update about your reported issue."}
                    </p>

                    <div className="mn-notification-meta">
                      <span>
                        <FiClock />
                        {formatDate(notification.createdAt)}
                      </span>

                      <span className="mn-notification-type">
                        {formatType(notification.type)}
                      </span>
                    </div>

                    <div className="mn-notification-actions">
                      {(
                        notification.issueId ??
                        notification.issue?.id
                      ) != null ? (
                        <button
                          type="button"
                          className="mn-view-issue-link"
                          onClick={() => openNotification(notification)}
                        >
                          View related issue
                          <FiExternalLink />
                        </button>
                      ) : (
                        <span className="mn-notification-message">
                          No linked issue
                        </span>
                      )}

                      {!read && (
                        <button
                          type="button"
                          className="mn-mark-read-button"
                          disabled={
                            String(updatingId) === String(notification.id)
                          }
                          onClick={() => markAsRead(notification)}
                        >
                          <FiCheck />
                          Mark as read
                        </button>
                      )}
                    </div>
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

export default MyNotifications;
