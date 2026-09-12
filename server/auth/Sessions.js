const crypto = require("crypto");


const sessions = new Map();


function createSession(userId, options = {}) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const expiresInMs =
    Number(options.expiresInMs) ||
    7 * 24 * 60 * 60 * 1000;

  const now = Date.now();

  const session = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(32).toString("hex"),
    userId: String(userId),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(
      now + expiresInMs
    ).toISOString()
  };

  sessions.set(session.token, session);

  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
  };
}


function getSession(token) {
  if (!token) {
    return null;
  }

  const session = sessions.get(
    String(token)
  );

  if (!session) {
    return null;
  }

  if (
    Date.now() >=
    Date.parse(session.expiresAt)
  ) {
    sessions.delete(String(token));
    return null;
  }

  return session;
}


function isSessionValid(token) {
  return getSession(token) !== null;
}


function destroySession(token) {
  if (!token) {
    return false;
  }

  return sessions.delete(
    String(token)
  );
}


function destroyUserSessions(userId) {
  if (!userId) {
    return 0;
  }

  const targetUserId = String(userId);
  let removed = 0;

  for (const [token, session] of sessions.entries()) {
    if (session.userId === targetUserId) {
      sessions.delete(token);
      removed += 1;
    }
  }

  return removed;
}


function clearExpiredSessions() {
  const now = Date.now();
  let removed = 0;

  for (const [token, session] of sessions.entries()) {
    if (
      now >=
      Date.parse(session.expiresAt)
    ) {
      sessions.delete(token);
      removed += 1;
    }
  }

  return removed;
}


function listSessions() {
  return Array.from(
    sessions.values()
  ).map((session) => ({
    id: session.id,
    userId: session.userId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
  }));
}


module.exports = {
  createSession,
  getSession,
  isSessionValid,
  destroySession,
  destroyUserSessions,
  clearExpiredSessions,
  listSessions
};
