
import api from "./api";

// -------------------- RESPONSE HELPERS --------------------

const getList = async (endpoint, resourceName) => {
  const response = await api.get(endpoint);

  if (!Array.isArray(response.data)) {
    throw new Error(`Invalid ${resourceName} response from the server.`);
  }

  return response.data;
};

// -------------------- ISSUES --------------------

export const getIssues = () => getList("/issues", "issues");

export const getIssueById = async (id) => {
  const response = await api.get(
    `/issues/${encodeURIComponent(id)}`
  );
  return response.data;
};

export const createIssue = async (issue) => {
  const response = await api.post("/issues", issue);
  return response.data;
};

export const updateIssue = async (id, updates) => {
  const response = await api.patch(
    `/issues/${encodeURIComponent(id)}`,
    updates
  );
  return response.data;
};

// -------------------- MAINTENANCE TEAMS --------------------

export const getMaintenanceTeams = () =>
  getList("/maintenanceTeams", "maintenance teams");

export const createMaintenanceTeam = async (team) => {
  const response = await api.post("/maintenanceTeams", team);
  return response.data;
};

export const updateMaintenanceTeam = async (id, updates) => {
  const response = await api.patch(
    `/maintenanceTeams/${encodeURIComponent(id)}`,
    updates
  );
  return response.data;
};

export const deleteMaintenanceTeam = async (id) => {
  const response = await api.delete(
    `/maintenanceTeams/${encodeURIComponent(id)}`
  );
  return response.data;
};

// -------------------- EXTERNAL ORGANIZATIONS --------------------

export const getOrganizations = () =>
  getList("/organizations", "organizations");

export const createOrganization = async (organization) => {
  const response = await api.post("/organizations", organization);
  return response.data;
};

export const updateOrganization = async (id, updates) => {
  const response = await api.patch(
    `/organizations/${encodeURIComponent(id)}`,
    updates
  );
  return response.data;
};

export const deleteOrganization = async (id) => {
  const response = await api.delete(
    `/organizations/${encodeURIComponent(id)}`
  );
  return response.data;
};

// -------------------- NOTIFICATIONS --------------------

export const getNotifications = () =>
  getList("/notifications", "notifications");

export const createNotification = async (notification) => {
  const response = await api.post("/notifications", {
    ...notification,
    isRead: false,
    createdAt:
      notification.createdAt || new Date().toISOString(),
  });

  return response.data;
};

export const updateNotification = async (id, updates) => {
  const response = await api.patch(
    `/notifications/${encodeURIComponent(id)}`,
    updates
  );
  return response.data;
};

// -------------------- ROLE-AWARE NOTIFICATIONS --------------------

export const notifyUser = async ({
  userId,
  issueId,
  title,
  message,
  type,
}) => {
  if (userId === undefined || userId === null || userId === "") {
    throw new Error("A recipient user ID is required.");
  }

  if (!title || !message || !type) {
    throw new Error(
      "Notification title, message, and type are required."
    );
  }

  return createNotification({
    userId: String(userId),
    issueId:
      issueId === undefined || issueId === null
        ? ""
        : String(issueId),
    title,
    message,
    type,
  });
};

// Resident: only important issue outcomes.
export const notifyResident = async ({
  residentId,
  issueId,
  action,
  reason = "",
}) => {
  const notifications = {
    approved: {
      title: "Issue Approved",
      message:
        "Your reported issue has been approved for maintenance.",
      type: "issue_approved",
    },
    rejected: {
      title: "Issue Rejected",
      message: reason
        ? `Your reported issue has been rejected. Reason: ${reason}`
        : "Your reported issue has been rejected.",
      type: "issue_rejected",
    },
    more_info: {
      title: "More Information Required",
      message:
        reason ||
        "Please provide additional details about your reported issue.",
      type: "more_information_required",
    },
    resolved: {
      title: "Issue Resolved",
      message:
        "Your reported issue has been resolved and verified.",
      type: "issue_resolved",
    },
  };

  const notification = notifications[action];

  if (!notification) {
    throw new Error(
      `Unsupported resident notification action: ${action}`
    );
  }

  return notifyUser({
    userId: residentId,
    issueId,
    ...notification,
  });
};

// Admin: new reports or work requiring admin review.
export const notifyAdmin = async ({
  adminId,
  issueId,
  action,
}) => {
  const notifications = {
    new_issue: {
      title: "New Issue Reported",
      message:
        "A resident has submitted a new issue for verification.",
      type: "new_issue_reported",
    },
    resident_update: {
      title: "Issue Updated",
      message:
        "A resident has provided additional information for review.",
      type: "resident_issue_updated",
    },
    resolution_review: {
      title: "Resolution Verification Required",
      message:
        "A maintenance team has submitted repair evidence for verification.",
      type: "resolution_verification_required",
    },
    maintenance_attention: {
      title: "Maintenance Attention Required",
      message:
        "A maintenance issue needs admin review.",
      type: "maintenance_attention_required",
    },
  };

  const notification = notifications[action];

  if (!notification) {
    throw new Error(
      `Unsupported admin notification action: ${action}`
    );
  }

  return notifyUser({
    userId: adminId,
    issueId,
    ...notification,
  });
};

// Maintenance: notify the assigned recipient about job actions.
export const notifyMaintenance = async ({
  maintenanceUserId,
  issueId,
  action,
}) => {
  const notifications = {
    assigned: {
      title: "New Job Assigned",
      message:
        "A new maintenance job has been assigned to your team.",
      type: "maintenance_job_assigned",
    },
    reassigned: {
      title: "Job Reassigned",
      message:
        "A maintenance job has been reassigned to your team.",
      type: "maintenance_job_reassigned",
    },
    reopened: {
      title: "Job Reopened",
      message:
        "This job requires further maintenance work.",
      type: "maintenance_job_reopened",
    },
    further_work: {
      title: "Further Action Required",
      message:
        "Please review the job and complete the required work.",
      type: "maintenance_further_work_required",
    },
  };

  const notification = notifications[action];

  if (!notification) {
    throw new Error(
      `Unsupported maintenance notification action: ${action}`
    );
  }

  return notifyUser({
    userId: maintenanceUserId,
    issueId,
    ...notification,
  });
};
