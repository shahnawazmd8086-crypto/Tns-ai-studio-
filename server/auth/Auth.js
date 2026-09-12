const crypto = require("crypto");


const users = new Map();


function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}


function validatePassword(password) {
  if (typeof password !== "string") {
    return false;
  }

  return password.length >= 8;
}


function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}


function createUser(input = {}) {
  const email = normalizeEmail(input.email);

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!validatePassword(input.password)) {
    throw new Error(
      "Password must be at least 8 characters long."
    );
  }

  if (users.has(email)) {
    throw new Error("User already exists.");
  }

  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(input.password),
    provider: "password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.set(email, user);

  return sanitizeUser(user);
}


function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  return users.get(normalizedEmail) || null;
}


function verifyPassword(email, password) {
  const user = findUserByEmail(email);

  if (!user) {
    return false;
  }

  return (
    user.passwordHash ===
    hashPassword(password)
  );
}


function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    provider: user.provider,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}


function getUser(email) {
  return sanitizeUser(
    findUserByEmail(email)
  );
}


function listUsers() {
  return Array.from(users.values()).map(
    sanitizeUser
  );
}


function deleteUser(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return users.delete(normalizedEmail);
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
