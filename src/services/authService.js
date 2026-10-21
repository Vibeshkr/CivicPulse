
import api from "./api";

// Demo authentication only.
// JSON Server stores passwords as plain text.
// Do not use this approach in production.

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const removePassword = (user) => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

// Register a new resident account.
export const registerUser = async ({ name, email, password }) => {
  const normalizedName = name?.trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName || !normalizedEmail || !password) {
    throw new Error("Please provide your name, email, and password.");
  }

  if (password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  const response = await api.get("/users");

  const existingUser = response.data.find(
    (user) => normalizeEmail(user.email || "") === normalizedEmail
  );

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const createdUser = await api.post("/users", {
    name: normalizedName,
    email: normalizedEmail,
    password,
    role: "resident",
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  return removePassword(createdUser.data);
};

// Create an individual maintenance account for a selected team.
// This function is intended for the admin's Team Management workflow.
export const createMaintenanceUser = async ({
  name,
  email,
  password,
  maintenanceTeamId,
}) => {
  const normalizedName = name?.trim();
  const normalizedEmail = normalizeEmail(email);

  if (
    !normalizedName ||
    !normalizedEmail ||
    !password ||
    maintenanceTeamId === undefined ||
    maintenanceTeamId === null ||
    String(maintenanceTeamId).trim() === ""
  ) {
    throw new Error(
      "Please provide the member's name, email, password, and team."
    );
  }

  if (password.length < 6) {
    throw new Error("Password must contain at least 6 characters.");
  }

  // Verify the selected team exists and is active.
  const teamsResponse = await api.get("/maintenanceTeams");

  const team = teamsResponse.data.find(
    (item) => String(item.id) === String(maintenanceTeamId)
  );

  if (!team) {
    throw new Error("The selected maintenance team does not exist.");
  }

  if (team.active === false || team.active === "false") {
    throw new Error("Choose an active maintenance team.");
  }

  // Prevent duplicate email accounts.
  const usersResponse = await api.get("/users");

  const existingUser = usersResponse.data.find(
    (user) => normalizeEmail(user.email || "") === normalizedEmail
  );

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const createdUser = await api.post("/users", {
    name: normalizedName,
    email: normalizedEmail,
    password,
    role: "maintenance",
    maintenanceTeamId: team.id,
    maintenanceTeamName: team.name,
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  return removePassword(createdUser.data);
};

// Sign in an existing user.
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error("Please enter your email and password.");
  }

  const response = await api.get("/users");

  const user = response.data.find(
    (item) =>
      normalizeEmail(item.email || "") === normalizedEmail &&
      item.password === password
  );

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (user.isActive === false || user.isActive === "false") {
    throw new Error("This account is inactive. Please contact the admin.");
  }

  return removePassword(user);
};
