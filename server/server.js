const http = require('http');
const { detectReplyLanguage, languageInstruction, normalizeLanguage } = require('./utils/language');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { signup } = require('./auth/Signup');
const { login } = require('./auth/Login');
const { changePassword, verifyPasswordStrength } = require('./auth/Password');
const Auth = require('./auth/Auth');
const { createSession, getSession, destroySession, clearExpiredSessions } = require('./auth/Sessions');
const Otp = require('./auth/Otp');
const GoogleAuth = require('./auth/Google');
const { create: createVoiceJob, getJob: getVoiceJob } = require('./jobs/voice-job');
const { registerProvider, getProvider } = require('./providers/provider');
const MockProvider = require('./providers/mock');
const HttpProvider = require('./providers/http');
const Uploads = require('./storage/Uploads');
const ProjectStore = require('./storage/Projects');
const ChatHistory = require('./storage/ChatHistory');
const ReplyFeedback = require('./storage/ReplyFeedback');
const REPLY_FEEDBACK_FILE = process.env.TNS_REPLY_FEEDBACK_FILE ? path.resolve(process.env.TNS_REPLY_FEEDBACK_FILE) : path.join(__dirname, 'Data', 'reply-feedback.json');
const MediaAccess = require('./storage/MediaAccess');
const GlobalConfig = require('./config/Global-config');
const BrowserAutomation = require('./browser/BrowserAutomation');
const ActionReview = require('./browser/ActionReview');
const TaskProgress = require('./browser/TaskProgress');

registerProvider('mock', new MockProvider());
registerProvider('http', new HttpProvider({ name: 'http' }));

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const PROJECT_DIR = path.join(__dirname, 'Data', 'projects');
const CHAT_HISTORY_DIR = process.env.CHAT_HISTORY_DIR ? path.resolve(process.env.CHAT_HISTORY_DIR) : path.join(__dirname, 'Data', 'chat-history');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PROJECT_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4'
};

const rateBuckets = new Map();
const authBuckets = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = Math.max(30, Number(process.env.API_RATE_LIMIT) || 120);
const AUTH_RATE_WINDOW_MS = 60 * 1000;
const SESSION_TIMEOUT_MINUTES = Math.max(1, Number(process.env.SESSION_TIMEOUT_MINUTES) || GlobalConfig.auth.sessionTimeoutMinutes);

// Live web research: configure TAVILY_API_KEY in the server environment.
// Never pretend that research ran when the search service is not configured.
async function runWebResearch(query, replyLanguage) {
  const apiKey = String(process.env.TAVILY_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('Live web research is not configured yet. Add TAVILY_API_KEY to the server environment.');
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ api_key: apiKey, query, search_depth: 'advanced', topic: 'general', max_results: 6, include_answer: false, include_raw_content: false })
  });
  if (!response.ok) {
    const error = new Error(response.status === 401 || response.status === 403
      ? 'Web research API key was rejected. Check TAVILY_API_KEY.'
      : `Web research service returned HTTP ${response.status}. Please try again later.`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }
  const data = await response.json();
  const sources = (Array.isArray(data.results) ? data.results : []).slice(0, 6).map(item => ({
    title: String(item.title || item.url || 'Source').slice(0, 300),
    url: String(item.url || ''),
    snippet: String(item.content || '').slice(0, 1800),
    score: Number.isFinite(Number(item.score)) ? Number(item.score) : null
  })).filter(item => /^https?:\/\//i.test(item.url));
  if (!sources.length) {
    const error = new Error('Web research found no usable sources for this question. Try a more specific query.');
    error.statusCode = 502;
    throw error;
  }
  return { sources, researchContext: sources.map((item, i) => `[Source ${i + 1}] ${item.title}\nURL: ${item.url}\nExtract: ${item.snippet}`).join('\n\n') };
}


function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  res.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function rateLimit(req, res) {
  if (!String(req.url || '').startsWith('/api/')) return true;
  const now = Date.now();
  const key = requestIp(req);
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT) {
    sendJson(res, 429, { error: 'Too many requests. Please try again later.' }, { 'Retry-After': '60' });
    return false;
  }
  return true;
}


function authRateLimit(req, identifier, limit = 10) {
  const key = `${requestIp(req)}|${String(identifier || '').trim().toLowerCase()}`;
  const now = Date.now();
  const current = authBuckets.get(key);
  if (!current || now - current.startedAt >= AUTH_RATE_WINDOW_MS) {
    authBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

function isStateChanging(method) { return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method); }
function sameOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const host = String(req.headers.host || '').split(':')[0];
    return originUrl.hostname === host || originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
  } catch { return false; }
}

function readBody(req, limit = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let finished = false;
    const fail = (error) => { if (!finished) { finished = true; reject(error); } };
    req.on('data', (chunk) => {
      if (finished) return;
      raw += chunk.toString();
      if (Buffer.byteLength(raw, 'utf8') > limit) {
        fail(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (finished) return;
      finished = true;
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON request.')); }
    });
    req.on('error', fail);
  });
}

function cookies(req) {
  const result = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const item = part.trim();
    if (!item) continue;
    const index = item.indexOf('=');
    if (index < 0) continue;
    const key = item.slice(0, index);
    const value = item.slice(index + 1);
    try { result[key] = decodeURIComponent(value); } catch { result[key] = value; }
  }
  return result;
}

function currentUser(req) {
  const token = getSessionToken(req);
  const session = getSession(token);
  return session ? Auth.getUserById(session.userId) : null;
}

function requireAuth(req, res) {
  const user = currentUser(req);
  if (!user) { sendJson(res, 401, { error: 'Authentication required.' }); return null; }
  return user;
}

function sessionCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-tns_session' : 'tns_session';
}

function sessionCookieAttributes(secure) {
  return `HttpOnly; SameSite=Strict; Path=/; Max-Age=${secure ? '' : ''}`;
}

function getSessionToken(req) {
  const c = cookies(req);
  return c[sessionCookieName()] || c.tns_session || null;
}

function setSessionCookie(req, res, session) {
  const maxAge = Math.max(1, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000));
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const secure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';
  const prefix = sessionCookieName();
  res.setHeader('Set-Cookie', `${prefix}=${encodeURIComponent(session.token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}

function clearSessionCookie(req, res) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  const secure = forwardedProto === 'https' || process.env.NODE_ENV === 'production';
  const prefix = sessionCookieName();
  res.setHeader('Set-Cookie', `${prefix}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`);
}



function safePublicFile(requestPath) {
  let decoded;
  try { decoded = decodeURIComponent(String(requestPath).split('?')[0]); } catch { return null; }
  const relative = decoded.replace(/^\/+/, '') || 'index.html';
  const full = path.resolve(PUBLIC_DIR, relative);
  const root = path.resolve(PUBLIC_DIR) + path.sep;
  return full.startsWith(root) ? full : null;
}

function publicUrl(fileName) { return `/uploads/${encodeURIComponent(fileName)}`; }


function readMultipart(req, maxBytes = 500 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    const match = type.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return reject(new Error('Multipart form data is required.'));
    const boundary = Buffer.from(`--${match[1] || match[2]}`);
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes + 1024 * 1024) { reject(new Error('Upload is too large.')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const parts = [];
        let pos = 0;
        while ((pos = body.indexOf(boundary, pos)) !== -1) {
          pos += boundary.length;
          if (body.slice(pos, pos + 2).toString() === '--') break;
          if (body.slice(pos, pos + 2).toString() === '\r\n') pos += 2;
          const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos);
          if (headerEnd < 0) break;
          const headers = body.slice(pos, headerEnd).toString();
          const next = body.indexOf(boundary, headerEnd + 4);
          if (next < 0) break;
          const data = body.slice(headerEnd + 4, Math.max(headerEnd + 4, next - 2));
          const name = (headers.match(/name="([^"]+)"/i) || [])[1];
          const filename = (headers.match(/filename="([^"]*)"/i) || [])[1];
          const contentType = (headers.match(/Content-Type:\s*([^\r\n]+)/i) || [])[1] || 'application/octet-stream';
          if (name) parts.push({ name, filename, contentType, data });
          pos = next;
        }
        resolve(parts);
      } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

async function refreshProviderJob(provider, job, type, updateJob) {
  if (!job || !job.providerJob || !provider || typeof provider.getStatus !== 'function') return job;
  const current = String(job.status || '').toLowerCase();
  if (['completed', 'failed', 'cancelled', 'canceled'].includes(current)) return job;
  try {
    const providerState = await provider.getStatus(type, job.providerJob);
    if (!providerState) return job;
    const status = String(providerState.status || providerState.state || '').toLowerCase();
    const progress = Number(providerState.progress ?? providerState.percent ?? job.progress ?? 0);
    const patch = { providerJob: { ...job.providerJob, ...providerState }, progress: Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : job.progress };
    if (['completed', 'complete', 'succeeded', 'success'].includes(status)) {
      patch.status = 'completed'; patch.progress = 100;
      patch.result = providerState.result || providerState.output || providerState.data || job.result || null;
    } else if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      patch.status = status === 'cancelled' || status === 'canceled' ? 'cancelled' : 'failed';
      patch.error = providerState.error || providerState.message || `${type} provider job failed.`;
    } else if (status) {
      patch.status = ['processing', 'running', 'in_progress'].includes(status) ? 'processing' : status;
    }
    return await updateJob(job.id, patch);
  } catch (error) { return job; }
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  try {
    if (!rateLimit(req, res)) return;
    if (isStateChanging(req.method) && !sameOriginAllowed(req)) return sendJson(res, 403, { error: 'Request origin is not allowed.' });

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, name: 'TNS API' });

    // Per-reply feedback is stored privately for owner review; users can submit only while signed in.
    if (req.method === 'POST' && url.pathname === '/api/tns-ai/reply-feedback') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 16 * 1024);
      try {
        const feedback = ReplyFeedback.add(REPLY_FEEDBACK_FILE, user, input);
        return sendJson(res, 201, { success: true, feedback });
      } catch (error) { return sendJson(res, 400, { error: error.message || 'Could not save feedback.' }); }
    }
    if (req.method === 'GET' && url.pathname === '/api/tns-ai/reply-feedback') {
      const user = requireAuth(req, res); if (!user) return;
      const ownerEmail = String(process.env.TNS_OWNER_EMAIL || '').trim().toLowerCase();
      if (!ownerEmail || String(user.email || '').trim().toLowerCase() !== ownerEmail) return sendJson(res, 403, { error: 'Owner access is not configured for this account.' });
      return sendJson(res, 200, { success: true, feedback: ReplyFeedback.list(REPLY_FEEDBACK_FILE) });
    }

    // Per-account chat history: conversations are stored separately by authenticated user ID.
    if (url.pathname === '/api/tns-ai/conversations' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      return sendJson(res, 200, { success: true, conversations: ChatHistory.list(CHAT_HISTORY_DIR, user.id) });
    }
    if (url.pathname === '/api/tns-ai/conversations' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 1024 * 1024);
      try { const conversation = ChatHistory.save(CHAT_HISTORY_DIR, user.id, input); return sendJson(res, 200, { success: true, conversation }); }
      catch (error) { return sendJson(res, 400, { error: error.message || 'Could not save chat history.' }); }
    }
    const conversationMatch = url.pathname.match(/^\/api\/tns-ai\/conversations\/([A-Za-z0-9_-]+)$/);
    if (conversationMatch && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const conversation = ChatHistory.load(CHAT_HISTORY_DIR, user.id, conversationMatch[1]);
      return conversation ? sendJson(res, 200, { success: true, conversation }) : sendJson(res, 404, { error: 'Conversation not found.' });
    }
    if (conversationMatch && req.method === 'DELETE') {
      const user = requireAuth(req, res); if (!user) return;
      return ChatHistory.remove(CHAT_HISTORY_DIR, user.id, conversationMatch[1]) ? sendJson(res, 200, { success: true }) : sendJson(res, 404, { error: 'Conversation not found.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
      const input = await readBody(req, 1024 * 1024);
      const result = signup(input);
      const session = createSession(result.user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      return sendJson(res, 201, { ...result, message: 'Account created successfully.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const input = await readBody(req, 1024 * 1024);
      if (!authRateLimit(req, input.identifier, 8)) return sendJson(res, 429, { error: 'Too many login attempts. Please try again later.' }, { 'Retry-After': '60' });
      const result = login(input);
      // Email/mobile password login is usable before an external OTP service is connected.
      // A real OTP provider can be re-enabled later without changing the dashboard flow.
      const session = createSession(result.user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      return sendJson(res, 200, { success: true, message: 'Login successful.', user: result.user });
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/google') {
      const publicOrigin = `${String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()}://${String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim()}`;
      if (!GoogleAuth.configured(PORT)) { res.writeHead(302, { Location: '/?authError=Google%20sign-in%20is%20not%20configured.%20Add%20Google%20OAuth%20credentials%20in%20deployment%20configuration.' }); return res.end(); }
      const redirect = GoogleAuth.authorizationUrl(PORT, publicOrigin);
      res.writeHead(302, { Location: redirect, 'Cache-Control': 'no-store' });
      return res.end();
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/google/callback') {
      const state = String(url.searchParams.get('state') || '');
      const code = String(url.searchParams.get('code') || '');
      if (!GoogleAuth.consumeState(state)) {
        res.writeHead(302, { Location: '/?authError=Invalid%20or%20expired%20Google%20login%20state.' });
        return res.end();
      }
      if (!code) {
        const error = String(url.searchParams.get('error_description') || url.searchParams.get('error') || 'Google sign-in was cancelled.');
        res.writeHead(302, { Location: `/?authError=${encodeURIComponent(error)}` });
        return res.end();
      }
      const publicOrigin = `${String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()}://${String(req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`).split(',')[0].trim()}`;
      const tokens = await GoogleAuth.exchangeCode(code, PORT, publicOrigin);
      const profile = await GoogleAuth.getProfile(tokens.access_token);
      const email = String(profile.email || '').trim().toLowerCase();
      if (!email || profile.email_verified === false) throw new Error('Google did not provide a verified email address.');
      let user = Auth.findUserByEmail(email);
      if (!user) {
        user = Auth.createUser({ email, name: profile.name || profile.given_name || null, provider: 'google', password: crypto.randomBytes(32).toString('hex') });
        user = Auth.findUserByEmail(email);
      }
      const session = createSession(user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      res.writeHead(302, { Location: '/' });
      return res.end();
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      destroySession(getSessionToken(req));
      clearSessionCookie(req, res);
      res.setHeader('Clear-Site-Data', '"cache", "storage"');
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = currentUser(req);
      return sendJson(res, user ? 200 : 401, user ? { authenticated: true, user } : { authenticated: false });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/otp/request') {
      const input = await readBody(req, 1024 * 1024);
      if (!input.identifier) throw new Error('Email or mobile number is required.');
      if (!authRateLimit(req, input.identifier, 5)) return sendJson(res, 429, { error: 'Too many OTP requests. Please try again later.' }, { 'Retry-After': '60' });
      const otp = Otp.createOtp(input.identifier, 10 * 60 * 1000, 5);
      const response = { success: true, message: 'OTP created. Configure an email/SMS provider for delivery.', expiresAt: otp.expiresAt };
      // Development-only helper: never return an OTP from a production server,
      // even if OTP_EXPOSE_CODE is accidentally left enabled in deployment settings.
      if (process.env.NODE_ENV !== 'production' && process.env.OTP_EXPOSE_CODE === 'true') {
        response.otp = otp.code;
        response.message = 'Development test OTP generated. No email/SMS was sent.';
      }
      return sendJson(res, 200, response);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/otp/verify') {
      const input = await readBody(req, 1024 * 1024);
      const verified = Otp.verifyOtp(input.identifier, input.code);
      if (!verified.success) return sendJson(res, 400, verified);
      const identifier = String(input.identifier || '').trim();
      const existing = identifier.includes('@') ? Auth.findUserByEmail(identifier) : Auth.findUserByMobile(identifier);
      if (!existing) return sendJson(res, 400, { success: false, message: 'Account not found.' });
      Otp.removeOtp(identifier);
      const user = Auth.sanitizeUser(existing);
      const session = createSession(user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      return sendJson(res, 200, { ...verified, user });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/otp/login') {
      const input = await readBody(req, 1024 * 1024);
      const verified = Otp.verifyOtp(input.identifier, input.code);
      if (!verified.success) return sendJson(res, 400, verified);
      const identifier = String(input.identifier || '').trim();
      const existing = identifier.includes('@') ? Auth.findUserByEmail(identifier) : Auth.findUserByMobile(identifier);
      const user = existing
        ? Auth.sanitizeUser(existing)
        : Auth.createUser(identifier.includes('@')
          ? { email: identifier, provider: 'otp', password: crypto.randomBytes(24).toString('hex') }
          : { mobile: identifier, provider: 'otp', password: crypto.randomBytes(24).toString('hex') });
      Otp.removeOtp(identifier);
      const session = createSession(user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      return sendJson(res, 200, { success: true, message: 'OTP login successful.', user });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/password/change') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 1024 * 1024);
      const currentPassword = String(input.currentPassword || '');
      const newPassword = String(input.newPassword || '');
      if (!currentPassword || !newPassword) return sendJson(res, 400, { error: 'Current password and new password are required.' });
      const identifier = user.email || user.mobile;
      if (!identifier) return sendJson(res, 400, { error: 'This account does not have a password login identifier.' });
      if (!authRateLimit(req, identifier, 5)) return sendJson(res, 429, { error: 'Too many password change attempts. Please try again later.' }, { 'Retry-After': '60' });
      verifyPasswordStrength(newPassword);
      changePassword(identifier, currentPassword, newPassword);
      return sendJson(res, 200, { success: true, message: 'Password changed successfully.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
      const input = await readBody(req, 1024 * 1024);
      if (!input.identifier) throw new Error('Email or mobile number is required.');
      if (!authRateLimit(req, input.identifier, 5)) return sendJson(res, 429, { error: 'Too many password reset requests. Please try again later.' }, { 'Retry-After': '60' });
      const exists = String(input.identifier).includes('@') ? Auth.findUserByEmail(input.identifier) : Auth.findUserByMobile(input.identifier);
      if (!exists) return sendJson(res, 200, { success: true, message: 'If an account exists, reset instructions will be sent through the configured channel.' });
      const otp = Otp.createOtp(input.identifier, 10 * 60 * 1000, 5);
      const response = { success: true, message: 'If an account exists, reset instructions will be sent through the configured channel.', expiresAt: otp.expiresAt };
      // Development-only helper: never return an OTP from a production server,
      // even if OTP_EXPOSE_CODE is accidentally left enabled in deployment settings.
      if (process.env.NODE_ENV !== 'production' && process.env.OTP_EXPOSE_CODE === 'true') {
        response.otp = otp.code;
        response.message = 'Development test OTP generated. No email/SMS was sent.';
      }
      return sendJson(res, 200, response);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/password/reset') {
      const input = await readBody(req, 1024 * 1024);
      if (!input.identifier || !input.newPassword || !input.otp) throw new Error('Identifier, OTP and new password are required.');
      const user = String(input.identifier).includes('@') ? Auth.findUserByEmail(input.identifier) : Auth.findUserByMobile(input.identifier);
      if (!user) throw new Error('Account not found.');
      const verified = Otp.verifyOtp(input.identifier, input.otp);
      if (!verified.success) throw new Error(verified.message);
      Auth.updatePassword(input.identifier, input.newPassword);
      Otp.removeOtp(input.identifier);
      return sendJson(res, 200, { success: true, message: 'Password reset successfully.' });
    }

    let match;

    if (req.method === 'GET' && url.pathname === '/api/projects') {
      const user = requireAuth(req, res); if (!user) return;
      const projects = ProjectStore.listProjects(PROJECT_DIR)
        .filter((p) => p.ownerId === user.id)
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return sendJson(res, 200, { success: true, projects });
    }

    if (req.method === 'POST' && url.pathname === '/api/projects') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 2 * 1024 * 1024);
      const project = ProjectStore.saveProject(ProjectStore.createProject({ ...input, ownerId: user.id }), PROJECT_DIR);
      return sendJson(res, 201, { success: true, project });
    }

    match = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (match && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const project = ProjectStore.loadProject(decodeURIComponent(match[1]), PROJECT_DIR);
      if (!project || project.ownerId !== user.id) return sendJson(res, 404, { error: 'Project not found.' });
      return sendJson(res, 200, { success: true, project });
    }

    if (match && req.method === 'PUT') {
      const user = requireAuth(req, res); if (!user) return;
      const id = decodeURIComponent(match[1]);
      const existing = ProjectStore.loadProject(id, PROJECT_DIR);
      if (!existing || existing.ownerId !== user.id) return sendJson(res, 404, { error: 'Project not found.' });
      const input = await readBody(req, 2 * 1024 * 1024);
      const project = ProjectStore.updateProject(id, { ...input, ownerId: user.id }, PROJECT_DIR);
      return sendJson(res, 200, { success: true, project });
    }

    if (match && req.method === 'DELETE') {
      const user = requireAuth(req, res); if (!user) return;
      const id = decodeURIComponent(match[1]);
      const existing = ProjectStore.loadProject(id, PROJECT_DIR);
      if (!existing || existing.ownerId !== user.id) return sendJson(res, 404, { error: 'Project not found.' });
      ProjectStore.deleteProject(id, PROJECT_DIR);
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && url.pathname === '/api/uploads/file') {
      const user = requireAuth(req, res); if (!user) return;
      const parts = await readMultipart(req, 100 * 1024 * 1024);
      const part = parts.find((p) => p.name === 'file' && p.filename);
      if (!part) throw new Error('File is required.');
      Uploads.validateUpload(part.filename, part.data.length, { maxFileSize: 100 * 1024 * 1024 });
      const saved = Uploads.saveUpload(part.data, UPLOAD_DIR, part.filename, { maxFileSize: 100 * 1024 * 1024 });
      MediaAccess.register(saved.fileName, user.id, { originalName: saved.originalName, createdAt: saved.createdAt });
      return sendJson(res, 201, { success: true, media: { id: saved.id, ownerId: user.id, originalName: saved.originalName, fileName: saved.fileName, size: saved.size, contentType: part.contentType, url: publicUrl(saved.fileName) } });
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/task/start') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 16 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try { return sendJson(res, 201, TaskProgress.createTask(user.id, input)); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not start task tracking.' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/task/update') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 8 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try { return sendJson(res, 200, TaskProgress.updateTask(user.id, input)); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not update task progress.' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/task/status') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 4 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try { return sendJson(res, 200, TaskProgress.getTask(user.id, input.taskId)); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not retrieve task status.' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/task/list') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 2 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try { return sendJson(res, 200, TaskProgress.listTasks(user.id, input)); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not list tasks.' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/task/resume') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 2 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try { return sendJson(res, 200, TaskProgress.resumeTask(user.id, input.taskId)); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not recover task.' }); }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/inspect') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 16 * 1024);
      let pageUrl;
      try { pageUrl = BrowserAutomation.validatePublicHttpUrl(input.url); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid website URL.' }); }
      try {
        const result = await BrowserAutomation.inspectPublicWebsite(pageUrl);
        return sendJson(res, 200, { ...result, requestedBy: user.id });
      } catch (error) {
        return sendJson(res, error.statusCode || 502, { success: false, error: error.message || 'Website inspection failed.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/prepare') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 16 * 1024);
      let pageUrl;
      try { pageUrl = BrowserAutomation.validatePublicHttpUrl(input.url); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid website URL.' }); }
      try {
        const result = await BrowserAutomation.inspectInteractiveWebsite(pageUrl);
        return sendJson(res, 200, { ...result, requestedBy: user.id });
      } catch (error) {
        return sendJson(res, error.statusCode || 502, { success: false, error: error.message || 'Website preparation failed.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/review') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 8 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try {
        const result = ActionReview.createActionReview(user.id, input);
        return sendJson(res, 200, result);
      } catch (error) {
        return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not create final-action review.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/approve') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 8 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      try {
        const result = ActionReview.approveActionReview(user.id, input);
        return sendJson(res, 200, result);
      } catch (error) {
        return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Could not record action approval.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/draft') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 64 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      let pageUrl;
      try { pageUrl = BrowserAutomation.validatePublicHttpUrl(input.url); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid website URL.' }); }
      try {
        const result = await BrowserAutomation.draftFormFill(pageUrl, input.values, input.formIndex);
        return sendJson(res, 200, { ...result, requestedBy: user.id });
      } catch (error) {
        return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Form draft preview failed.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/browser/execute-approved') {
      const user = requireAuth(req, res); if (!user) return;
      let input;
      try { input = await readBody(req, 8 * 1024); }
      catch (error) { return sendJson(res, 400, { success: false, error: error.message || 'Invalid request body.' }); }
      let approved;
      try { approved = ActionReview.consumeApprovedExecution(user.id, input); }
      catch (error) { return sendJson(res, error.statusCode || 400, { success: false, error: error.message || 'Approval ticket could not be used.' }); }
      try {
        const result = await BrowserAutomation.executeApprovedFormAction(approved.url, approved.values, approved.formIndex);
        return sendJson(res, 200, { ...result, requestedBy: user.id });
      } catch (error) {
        return sendJson(res, error.statusCode || 502, { success: false, error: error.message || 'Approved website action failed.' });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/chat') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.TNS_AI_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName) return sendJson(res, 503, { error: 'TNS AI provider is not configured yet.' });
      const provider = getProvider(providerName);
      if (!provider || typeof provider.chat !== 'function') return sendJson(res, 503, { error: 'Configured TNS AI provider does not support chat.' });
      const message = String(input.message || '').trim();
      if (!message) return sendJson(res, 400, { error: 'Message cannot be empty.' });
      if (message.length > 8000) return sendJson(res, 413, { error: 'Message is too long. Maximum is 8000 characters.' });
      const replyLanguage = input.preferRequestedLanguage && input.replyLanguage
        ? normalizeLanguage(input.replyLanguage)
        : detectReplyLanguage(message, String(input.replyLanguage || input.appLanguage || 'English'));
      const history = Array.isArray(input.history) ? input.history
        .filter(turn => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
        .slice(-12).map(turn => ({ role: turn.role, content: turn.content.slice(0, 12000) })) : [];
      let researchData = null;
      if (input.research) {
        try {
          researchData = await runWebResearch(message, replyLanguage);
        } catch (error) {
          return sendJson(res, error.statusCode || 502, { success: false, error: error.message || 'Live web research failed.' });
        }
      }
      const studySupportInstruction = `\n\nEDUCATION SUPPORT: If the user's request is about studying, homework, an academic subject, an exam, a concept, a problem, or learning any topic, act as a patient, accurate tutor for any subject and education level. First identify the subject and likely level from the question; if level matters and is unclear, give a useful general answer and ask what class/level they need. Answer the actual question, show the method step by step for calculations or problem-solving, explain why each step works, define key terms in simple language, and give a short example when helpful. For maths/science, show formulas, units, substitutions, and check the result. For languages/literature/history/social studies, explain context and distinguish facts from interpretations. For coding, give runnable examples and explain them. For homework, teach the reasoning rather than only giving an unexplained final answer. Do not invent facts, equations, citations, or certainty; state uncertainty and ask for a clearer question/image when needed. Match the user's requested language (${replyLanguage}) and requested detail level. If it is not an education request, answer normally.`;
      const websiteWorkInstruction = `\n\nMULTI-WEBSITE TASK WORKFLOW WITH EXPLICIT USER PERMISSION: When the user asks TNS to do a task across websites, take ownership of coordinating it but do not assume permission for sensitive or consequential actions. First restate the goal, list ordered steps and required websites, and identify which steps can be safely researched or prepared without further permission. Continue independent, reversible research/preparation where possible and keep a clear status of completed, pending, and blocked actions. BEFORE any action that needs the user's permission, stop and ask first in the user's language; clearly name the website, exact action, information/file that will be used or shared, and likely consequence. This permission checkpoint applies at minimum before signing in or creating an account on the user's behalf, sharing/uploading personal or private data, contacting another person, accepting legal terms or declarations, booking/ordering, paying, or final Submit/Publish/Send/Apply/Delete actions. Do not treat a vague request like 'do my task' as consent to every sensitive step. Ask one clear question and wait for an explicit affirmative response covering that specific action; if the user says no, is unclear, or changes the task, do not proceed with that action and offer a safe alternative. For payment, do not pay, enter payment details, or make a purchase; give the verified official payment/checkout link, amount and purpose when known, then wait for the user to pay independently and confirm. Never ask for card numbers, passwords, OTPs, or banking secrets in chat. Before final submission, prepare the draft and show a review/preview link or exact content, summarize what will be submitted and where, and ask: 'Is this correct, and do you authorize me to submit it?' Submit only after explicit confirmation for that exact final action; do not perform a consequential action until the user clearly approves that exact action. Afterward, report what actually happened, provide the resulting link/receipt/reference when available, and explain next steps; never claim success without evidence. After approval, perform an action only if an authorized website/browser-control tool is actually available. Web search or snippets alone do not mean TNS logged in, filled a form, uploaded a file, or operated a website. If browser control is unavailable, say so clearly and give the user the next safe steps instead of claiming the work is done. Never bypass CAPTCHA, access controls, site rules, or security checks; ask the user to complete those steps themselves. Match the user's language (${replyLanguage}).`;
      const providerMessage = researchData
        ? `${message}${studySupportInstruction}${websiteWorkInstruction}\n\nRESEARCH MODE: Answer in ${replyLanguage}. Act as a practical web researcher. Explain (1) what was found, (2) exactly which website/source has each useful piece of information, (3) what the user should click/open or search for on that site, and (4) clear step-by-step instructions for how to do the task when the question asks how. Compare sources, prefer official/primary sources where possible, distinguish verified facts from uncertainty, mention when search snippets are insufficient to verify a detail, and never claim you fully read a page if only its search snippet is available. Cite important claims inline using [Source N] and finish with a short “Where to go next” section when useful.\n\n${researchData.researchContext}`
        : `${message}${studySupportInstruction}${websiteWorkInstruction}`;
      const result = await provider.chat({ message: providerMessage, originalMessage: message, history, research: Boolean(input.research), researchSources: researchData?.sources || [], userId: user.id, replyLanguage, languageInstruction: languageInstruction(replyLanguage) });
      let reply = result?.reply || result?.text || '';
      if (researchData && providerName === 'mock') {
        reply = `Live web search completed, but TNS AI is currently in demo mode, so an AI-written synthesis is not available yet. Here are the search results to review:\n\n${researchData.sources.map((source, i) => `${i + 1}. ${source.title}\n${source.snippet}\nSource: ${source.url}`).join('\n\n')}`;
      }
      return sendJson(res, 200, { success: true, reply, replyLanguage: result?.replyLanguage || replyLanguage, provider: providerName, demo: providerName === 'mock', research: Boolean(researchData), sources: researchData?.sources || [] });
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/understand') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.TNS_AI_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName) return sendJson(res, 503, { error: 'TNS AI provider is not configured yet.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured TNS AI provider is unavailable.' });
      const message = String(input.message || 'Analyze the supplied file/image.');
      const replyLanguage = detectReplyLanguage(message, String(input.replyLanguage || input.appLanguage || 'English'));
      const languageContext = { replyLanguage, languageInstruction: languageInstruction(replyLanguage) };
      if (typeof provider.understand === 'function') { const result = await provider.understand({ ...input, ...languageContext, userId: user.id }); return sendJson(res, 200, { success: true, ...result, replyLanguage: result?.replyLanguage || replyLanguage, provider: providerName, demo: providerName === 'mock' }); }
      if (typeof provider.chat === 'function') { const result = await provider.chat({ message, file: input.file || null, ...languageContext, userId: user.id }); return sendJson(res, 200, { success: true, reply: result?.reply || result?.text || '', replyLanguage: result?.replyLanguage || replyLanguage }); }
      return sendJson(res, 503, { error: 'Configured TNS AI provider does not support file understanding.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/voice/jobs') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.VOICE_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName || (process.env.NODE_ENV === 'production' && providerName === 'mock')) return sendJson(res, 503, { error: 'A real voice provider is not configured for production.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured voice provider is unavailable.' });
      const job = await createVoiceJob(providerName, { ...input, ownerId: user.id });
      if (provider && typeof provider.createVoice === 'function') {
        try {
          job.providerJob = await provider.createVoice(input);
          if (job.providerJob?.status === 'completed') { job.status = 'completed'; job.result = job.providerJob.result; }
        } catch (error) { job.status = 'failed'; job.error = error.message; }
      }
      return sendJson(res, 202, job);
    }

    match = url.pathname.match(/^\/api\/voice\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      const user = requireAuth(req, res); if (!user) return;
      const job = await getVoiceJob(decodeURIComponent(match[1]));
      if (!job || job.ownerId !== user.id) return sendJson(res, 404, { error: 'Voice job not found.' });
      const provider = getProvider(job.provider);
      const refreshed = await refreshProviderJob(provider, job, 'voice', require('./jobs/voice-job').update);
      return sendJson(res, 200, refreshed || job);
    }

    if (req.method === 'GET' && url.pathname === '/api') return sendJson(res, 200, { name: 'TNS API', version: '3.0.0' });

    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      const user = requireAuth(req, res); if (!user) return;
      const fileName = decodeURIComponent(url.pathname.slice('/uploads/'.length));
      if (!fileName || fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) return sendJson(res, 404, { error: 'Media not found.' });
      if (!MediaAccess.canAccess(fileName, user.id)) return sendJson(res, 404, { error: 'Media not found.' });
      const target = path.resolve(UPLOAD_DIR, fileName);
      const root = path.resolve(UPLOAD_DIR) + path.sep;
      if (!target.startsWith(root) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return sendJson(res, 404, { error: 'Media not found.' });
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'private, no-store' });
      return fs.createReadStream(target).pipe(res);
    }

    if (req.method === 'GET') {
      const file = safePublicFile(url.pathname);
      if (!file) return sendJson(res, 403, { error: 'Forbidden.' });
      let target = file;
      if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) target = path.join(PUBLIC_DIR, 'index.html');
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      return fs.createReadStream(target).pipe(res);
    }

    return sendJson(res, 404, { error: 'Not found.' });
  } catch (error) {
    console.error(error);
    const status = /authentication required/i.test(error.message) ? 401 : 400;
    return sendJson(res, status, { error: error.message || 'Request failed.' });
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(key);
  Otp.clearExpiredOtps();
  clearExpiredSessions();
  GoogleAuth.cleanupStates();
}, 60 * 1000).unref();

server.listen(PORT, () => console.log(`TNS running on port ${PORT}`));
