const AUTH_STORAGE_KEY = "tns_ai_studio_auth";


function getAuthState() {
  try {
    const data =
      localStorage.getItem(
        AUTH_STORAGE_KEY
      );

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}


function saveAuthState(state) {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(state)
  );

  return state;
}


function clearAuthState() {
  localStorage.removeItem(
    AUTH_STORAGE_KEY
  );
}


function isLoggedIn() {
  const state =
    getAuthState();

  return Boolean(
    state &&
    state.loggedIn === true &&
    state.user
  );
}


function getCurrentUser() {
  const state =
    getAuthState();

  if (!state || !state.user) {
    return null;
  }

  return state.user;
}


function setLoggedIn(user) {
  if (!user) {
    throw new Error(
      "User data is required."
    );
  }

  return saveAuthState({
    loggedIn: true,
    user,
    loginTime:
      new Date().toISOString()
  });
}


function logout() {
  clearAuthState();

  return {
    success: true,
    message: "Logged out successfully."
  };
}


function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href =
      "/auth/login.html";

    return false;
  }

  return true;
}


function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href =
      "/index.html";

    return true;
  }

  return false;
}


window.TNSAuth = {
  getAuthState,
  saveAuthState,
  clearAuthState,
  isLoggedIn,
  getCurrentUser,
  setLoggedIn,
  logout,
  requireLogin,
  redirectIfLoggedIn
};
