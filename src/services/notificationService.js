
import { createNotification } from "./civicPulseService";

/**
 * Create a notification for the resident who reported an issue.
 *
 * The issue must contain a real userId before a private
 * resident notification can be created.
 */
export const notifyIssueOwner = async ({
  issue,
  title,
  message,
  type = "status-update",
}) => {
  if (!issue?.userId) {
    return {
      created: false,
      reason: "Issue ownership is not available yet.",
    };
  }

  try {
    const notification = await createNotification({
      userId: String(issue.userId),
      issueId: String(issue.id),
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
    });

    return {
      created: true,
      notification,
    };
  } catch (error) {
    // A notification failure should not undo a successful issue update.
    console.error("Failed to create notification:", error);

    return {
      created: false,
      reason: "Notification could not be saved.",
    };
  }
};
