const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'Data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '{}', 'utf8');
}

function readSessions() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions) {
  ensureStore();
  const tmp = `${SESSIONS_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(sessions, null, 2), 'utf8');
  fs.renameSync(tmp, SESSIONS_FILE);
}

function createSession(userId, options = {}) {
  if (!userId) throw new Error('User ID is required.');
  const timeoutMinutes = Math.max(1, Number(process.env.SESSION_TIMEOUT_MINUTES) || 1440);
  const expiresInMs = Number(options.expiresInMs) || timeoutMinutes * 60 * 1000;
  const now = Date.now();
  const session = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(32).toString('hex'),
    userId: String(userId),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + expiresInMs).toISOString()
  };
  const sessions = readSessions();
  sessions[session.token] = session;
  writeSessions(sessions);
  return { ...session };
}

function getSession(token) {
  if (!token) return null;
  const key = String(token);
  const sessions = readSessions();
  const session = sessions[key];
  if (!session) return null;
  if (Date.now() >= Date.parse(session.expiresAt)) {
    delete sessions[key];
    writeSessions(sessions);
    return null;
  }
  return { ...session };
}

function isSessionValid(token) { return getSession(token) !== null; }

function destroySession(token) {
  if (!token) return false;
  const sessions = readSessions();
  const key = String(token);
  const existed = Boolean(sessions[key]);
  if (existed) { delete sessions[key]; writeSessions(sessions); }
  return existed;
}

function destroyUserSessions(userId) {
  if (!userId) return 0;
  const sessions = readSessions();
  let removed = 0;
  for (const [token, session] of Object.entries(sessions)) {
    if (session.userId === String(userId)) { delete sessions[token]; removed += 1; }
  }
  if (removed) writeSessions(sessions);
  return removed;
}

function clearExpiredSessions() {
  const sessions = readSessions();
  const now = Date.now();
  let removed = 0;
  for (const [token, session] of Object.entries(sessions)) {
    if (now >= Date.parse(session.expiresAt)) { delete sessions[token]; removed += 1; }
  }
  if (removed) writeSessions(sessions);
  return removed;
}

function listSessions() {
  return Object.values(readSessions()).map(({ id, userId, createdAt, expiresAt }) => ({ id, userId, createdAt, expiresAt }));
}

module.exports = { createSession, getSession, isSessionValid, destroySession, destroyUserSessions, clearExpiredSessions, listSessions, SESSIONS_FILE };
