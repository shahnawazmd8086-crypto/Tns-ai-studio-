const https = require('https');
const crypto = require('crypto');

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function googleConfig(port, requestOrigin = '') {
  const fallbackOrigin = String(requestOrigin || '').trim() || `http://localhost:${port}`;
  return {
    clientId: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri: String(process.env.GOOGLE_REDIRECT_URI || `${fallbackOrigin.replace(/\/$/, '')}/api/auth/google/callback`).trim()
  };
}
function configured(port) {
  const c = googleConfig(port);
  return Boolean(c.clientId && c.clientSecret && c.redirectUri);
}
function createState() {
  const state = crypto.randomBytes(32).toString('hex');
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}
function consumeState(state) {
  const key = String(state || '');
  const expiresAt = pendingStates.get(key);
  pendingStates.delete(key);
  return Boolean(expiresAt && Date.now() < expiresAt);
}
function cleanupStates() {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates.entries()) if (now >= expiresAt) pendingStates.delete(state);
}
function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const req = https.request(target, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk.toString(); });
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(body); } catch {}
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(data?.error_description || data?.error || `Google request failed (${res.statusCode}).`));
        resolve(data || {});
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}
function authorizationUrl(port, requestOrigin = '') {
  const c = googleConfig(port, requestOrigin);
  if (!configured(port)) throw new Error('Google sign-in is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.');
  const state = createState();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', c.clientId);
  url.searchParams.set('redirect_uri', c.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}
async function exchangeCode(code, port, requestOrigin = '') {
  const c = googleConfig(port, requestOrigin);
  if (!configured(port)) throw new Error('Google sign-in is not configured.');
  const body = new URLSearchParams({ code: String(code || ''), client_id: c.clientId, client_secret: c.clientSecret, redirect_uri: c.redirectUri, grant_type: 'authorization_code' }).toString();
  return requestJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body });
}
async function getProfile(accessToken) {
  return requestJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${String(accessToken || '')}`, Accept: 'application/json' } });
}
function getStateSize() { return pendingStates.size; }
module.exports = { googleConfig, configured, authorizationUrl, consumeState, exchangeCode, getProfile, cleanupStates, getStateSize };
