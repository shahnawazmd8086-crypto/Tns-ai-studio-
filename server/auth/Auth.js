const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "{}", "utf8");
  }
}

function loadUsers() {
  ensureStore();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  ensureStore();
  const temp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(users, null, 2), "utf8");
  fs.renameSync(temp, USERS_FILE);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
  if (typeof password !== "string") return false;
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyHash(password, stored) {
  try {
    const [scheme, salt, expectedHex] = String(stored || "").split(":");
    if (scheme !== "scrypt" || !salt || !expectedHex) return false;
    const actual = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function createUser(input = {}) {
  const email = normalizeEmail(input.email);
  if (!email) throw new Error("Email is required.");
  if (!validatePassword(input.password)) {
    throw new Error("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.");
  }

  const users = loadUsers();
  if (users[email]) throw new Error("User already exists.");

  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    provider: "password",
    createdAt: now,
    updatedAt: now
  };

  users[email] = user;
  saveUsers(users);
  return sanitizeUser(user);
}

function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const users = loadUsers();
  return users[normalizedEmail] || null;
}

function verifyPassword(email, password) {
  const user = findUserByEmail(email);
  return Boolean(user && verifyHash(password, user.passwordHash));
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function getUser(email) {
  return sanitizeUser(findUserByEmail(email));
}

function listUsers() {
  return Object.values(loadUsers()).map(sanitizeUser);
}

function deleteUser(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const users = loadUsers();
  if (!users[normalizedEmail]) return false;
  delete users[normalizedEmail];
  saveUsers(users);
  return true;
}

module.exports = {
  normalizeEmail,
  validatePassword,
  hashPassword,
  createUser,
  findUserByEmail,
  verifyPassword,
  sanitizeUser,
  getUser,
  listUsers,
  deleteUser
};
