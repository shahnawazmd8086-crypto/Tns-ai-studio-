const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Keep one canonical, case-sensitive data directory for Linux/Render.
const DATA_DIR = path.join(__dirname, '..', 'Data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LEGACY_DATA_DIR = path.join(__dirname, '..', 'data');
const LEGACY_USERS_FILE = path.join(LEGACY_DATA_DIR, 'users.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]', 'utf8');
  }
}

function normalizeUsers(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  // Compatibility with the old object-keyed users.json format.
  return Object.values(value)
    .filter((user) => user && typeof user === 'object')
    .map((user) => ({
      ...user,
      email: user.email ? normalizeEmail(user.email) : null,
      mobile: user.mobile ? normalizeMobile(user.mobile) : null
    }));
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readUsers() {
  ensureStore();
  const primaryRaw = readJson(USERS_FILE);
  const primary = normalizeUsers(primaryRaw);

  // If a previous Render deployment stored users under lowercase `data`,
  // preserve those accounts instead of silently losing them after the case fix.
  if (primary.length === 0 && fs.existsSync(LEGACY_USERS_FILE)) {
    const legacy = normalizeUsers(readJson(LEGACY_USERS_FILE));
    if (legacy.length > 0) {
      writeUsers(legacy);
      return legacy;
    }
  }

  if (!Array.isArray(primaryRaw)) writeUsers(primary);
  return primary;
}

function writeUsers(users) {
  ensureStore();
  const tmp = `${USERS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(normalizeUsers(users), null, 2), 'utf8');
  fs.renameSync(tmp, USERS_FILE);
}

function normalizeEmail(email) { return String(email || '').trim().toLowerCase(); }
function normalizeMobile(mobile) { return String(mobile || '').replace(/[^0-9+]/g, ''); }
function validateEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)); }
function validateMobile(mobile) { return /^\+?[1-9][0-9]{7,14}$/.test(normalizeMobile(mobile)); }
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyHash(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[0-9a-f]+$/i.test(parts[1]) || !/^[0-9a-f]+$/i.test(parts[2])) return false;
  try {
    const derived = crypto.scryptSync(String(password), parts[1], 64);
    const expected = Buffer.from(parts[2], 'hex');
    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function createUser(input = {}) {
  const email = normalizeEmail(input.email);
  const mobile = normalizeMobile(input.mobile);
  const password = String(input.password || '');
  if (!email && !mobile) throw new Error('Email or mobile number is required.');
  if (email && !validateEmail(email)) throw new Error('Please enter a valid email address.');
  if (mobile && !validateMobile(mobile)) throw new Error('Please enter a valid mobile number.');
  if (input.provider !== 'otp' && !validatePassword(password)) throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
  const users = readUsers();
  if (users.some((u) => (email && u.email === email) || (mobile && u.mobile === mobile))) throw new Error('Account already exists.');
  const now = new Date().toISOString();
  const user = { id: crypto.randomUUID(), email: email || null, mobile: mobile || null, name: String(input.name || '').trim().slice(0, 100) || null, passwordHash: hashPassword(password), provider: input.provider || 'password', createdAt: now, updatedAt: now };
  users.push(user);
  writeUsers(users);
  return sanitizeUser(user);
}

function findUserByEmail(email) { const e = normalizeEmail(email); return readUsers().find((u) => u.email === e) || null; }
function findUserByMobile(mobile) { const m = normalizeMobile(mobile); return readUsers().find((u) => u.mobile === m) || null; }
function findUserById(id) { return readUsers().find((u) => u.id === String(id)) || null; }
function verifyPassword(identifier, password) {
  const value = String(identifier || '').trim();
  const user = value.includes('@') ? findUserByEmail(value) : findUserByMobile(value);
  return Boolean(user && verifyHash(password, user.passwordHash));
}
function updatePassword(identifier, newPassword) {
  if (!validatePassword(String(newPassword || ''))) throw new Error('Password must be at least 8 characters and include uppercase, lowercase, number, and special character.');
  const value = String(identifier || '').trim();
  const users = readUsers();
  const user = users.find((u) => (value.includes('@') ? u.email === normalizeEmail(value) : u.mobile === normalizeMobile(value)));
  if (!user) throw new Error('User not found.');
  user.passwordHash = hashPassword(newPassword);
  user.updatedAt = new Date().toISOString();
  writeUsers(users);
  return sanitizeUser(user);
}
function sanitizeUser(user) {
  if (!user) return null;
  return { id: user.id, email: user.email, mobile: user.mobile, name: user.name || null, provider: user.provider, createdAt: user.createdAt, updatedAt: user.updatedAt };
}
function getUser(identifier) { const value = String(identifier || '').trim(); return sanitizeUser(value.includes('@') ? findUserByEmail(value) : findUserByMobile(value)); }
function getUserById(id) { return sanitizeUser(findUserById(id)); }
function listUsers() { return readUsers().map(sanitizeUser); }
function deleteUser(identifier) { const value = String(identifier || '').trim(); const users = readUsers(); const next = users.filter((u) => value.includes('@') ? u.email !== normalizeEmail(value) : u.mobile !== normalizeMobile(value)); if (next.length === users.length) return false; writeUsers(next); return true; }

module.exports = { normalizeEmail, normalizeMobile, validateEmail, validateMobile, validatePassword, hashPassword, verifyHash, createUser, findUserByEmail, findUserByMobile, findUserById, verifyPassword, updatePassword, sanitizeUser, getUser, getUserById, listUsers, deleteUser, DATA_DIR, USERS_FILE };
