const SESSION_STORAGE_KEY =
  "tns_ai_studio_session";


function getSession() {
  try {
    const data =
      localStorage.getItem(
        SESSION_STORAGE_KEY
      );

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}


function saveSession(session) {
  if (!session) {
    throw new Error(
      "Session data is required."
    );
  }

  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session)
  );

  return session;
}


function clearSession() {
  localStorage.removeItem(
    SESSION_STORAGE_KEY
  );
}


function getSessionToken() {
  const session =
    getSession();

  if (!session) {
    return null;
  }

  return session.token || null;
}


function getSessionUserId() {
  const session =
    getSession();

  if (!session) {
    return null;
  }

  return session.userId || null;
}


function isSessionExpired(session) {
  if (!session) {
    return true;
  }

  if (!session.expiresAt) {
    return false;
  }

  const expiresAt =
    Date.parse(
      session.expiresAt
    );

  if (
    Number.isNaN(expiresAt)
  ) {
    return true;
  }

  return Date.now() >= expiresAt;
}


function isSessionValid() {
  const session =
    getSession();

  if (!session) {
    return false;
  }

  if (
    isSessionExpired(session)
  ) {
    clearSession();
    return false;
  }

  return Boolean(
    session.token &&
    session.userId
  );
}


function createClientSession(
  sessionData = {}
) {
  const session = {
    token:
      sessionData.token || null,
    userId:
      sessionData.userId || null,
    createdAt:
      sessionData.createdAt ||
      new Date().toISOString(),
    expiresAt:
      sessionData.expiresAt || null
  };

  if (
    !session.token ||
    !session.userId
  ) {
    throw new Error(
      "Valid session token and user ID are required."
    );
  }

  return saveSession(session);
}


function destroyClientSession() {
  clearSession();

  window.dispatchEvent(
    new CustomEvent(
      "tns:session-destroyed"
    )
  );

  return {
    success: true
  };
}


function requireSession() {
  if (
    !isSessionValid()
  ) {
    window.location.href =
      "/auth/login.html";

    return false;
  }

  return true;
}


window.TNSSessions = {
  getSession,
  saveSession,
  clearSession,
  getSessionToken,
  getSessionUserId,
  isSessionExpired,
  isSessionValid,
  createClientSession,
  destroyClientSession,
  requireSession
};
