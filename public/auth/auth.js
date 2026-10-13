// Client auth helper. The server HttpOnly session cookie is authoritative.
let memoryUser = null;

function getAuthState() {
  return memoryUser ? { user: { ...memoryUser } } : null;
}

function saveAuthState(state) {
  memoryUser = state && state.user ? { ...state.user } : null;
  return getAuthState();
}

function clearAuthState() {
  memoryUser = null;
}

function isLoggedIn() {
  return Boolean(memoryUser);
}

function getCurrentUser() {
  return memoryUser ? { ...memoryUser } : null;
}

function setLoggedIn(user) {
  if (!user) throw new Error('User data is required.');
  memoryUser = { ...user };
  return getCurrentUser();
}

function logout() {
  clearAuthState();
  return { success: true, message: 'Logged out successfully.' };
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = '/index.html';
    return true;
  }
  return false;
}

window.TNSAuth = { getAuthState, saveAuthState, clearAuthState, isLoggedIn, getCurrentUser, setLoggedIn, logout, requireLogin, redirectIfLoggedIn };
