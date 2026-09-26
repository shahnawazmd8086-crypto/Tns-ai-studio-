const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { signup } = require('./auth/Signup');
const { login } = require('./auth/Login');
const Auth = require('./auth/Auth');
const { createSession, getSession, destroySession, clearExpiredSessions } = require('./auth/Sessions');
const Otp = require('./auth/Otp');
const { create: createVideoJob, getJob: getVideoJob } = require('./jobs/video-job');
const { create: createImageJob, getJob: getImageJob } = require('./jobs/image-job');
const { create: createVoiceJob, getJob: getVoiceJob } = require('./jobs/voice-job');
const { registerProvider, getProvider } = require('./providers/provider');
const MockProvider = require('./providers/mock');
const HttpProvider = require('./providers/http');
const Uploads = require('./storage/Uploads');
const Contact = require('./contact');
const ProjectStore = require('./storage/Projects');
const MediaAccess = require('./storage/MediaAccess');
const GlobalConfig = require('./config/Global-config');

registerProvider('mock', new MockProvider());
registerProvider('http', new HttpProvider({ name: 'http' }));

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');
const PROJECT_DIR = path.join(__dirname, 'Data', 'projects');
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
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
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

function safeUploadPathFromUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Input video is required.');
  let pathname;
  try { pathname = new URL(raw, 'http://localhost').pathname; } catch { throw new Error('Invalid media URL.'); }
  const prefix = '/uploads/';
  if (!pathname.startsWith(prefix)) throw new Error('Only uploaded media can be edited.');
  const fileName = decodeURIComponent(pathname.slice(prefix.length));
  if (!fileName || fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) throw new Error('Invalid media file.');
  const full = path.resolve(UPLOAD_DIR, fileName);
  const root = path.resolve(UPLOAD_DIR) + path.sep;
  if (!full.startsWith(root) || !fs.existsSync(full) || !fs.statSync(full).isFile()) throw new Error('Uploaded media file was not found.');
  return full;
}

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

    if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, name: 'TNS Studio API' });

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
      const session = createSession(result.user.id, { expiresInMs: SESSION_TIMEOUT_MINUTES * 60 * 1000 });
      setSessionCookie(req, res, session);
      return sendJson(res, 200, { success: true, message: 'Login successful.', user: result.user });
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
      if (process.env.OTP_EXPOSE_CODE === 'true') response.otp = otp.code;
      return sendJson(res, 200, response);
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/otp/verify') {
      const input = await readBody(req, 1024 * 1024);
      return sendJson(res, 200, Otp.verifyOtp(input.identifier, input.code));
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

    if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
      const input = await readBody(req, 1024 * 1024);
      if (!input.identifier) throw new Error('Email or mobile number is required.');
      if (!authRateLimit(req, input.identifier, 5)) return sendJson(res, 429, { error: 'Too many password reset requests. Please try again later.' }, { 'Retry-After': '60' });
      const exists = String(input.identifier).includes('@') ? Auth.findUserByEmail(input.identifier) : Auth.findUserByMobile(input.identifier);
      if (!exists) return sendJson(res, 200, { success: true, message: 'If an account exists, reset instructions will be sent through the configured channel.' });
      const otp = Otp.createOtp(input.identifier, 10 * 60 * 1000, 5);
      const response = { success: true, message: 'If an account exists, reset instructions will be sent through the configured channel.', expiresAt: otp.expiresAt };
      if (process.env.OTP_EXPOSE_CODE === 'true') response.otp = otp.code;
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

    if (req.method === 'GET' && url.pathname === '/api/contact/users') {
      const me = requireAuth(req, res); if (!me) return;
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const users = Auth.listUsers().filter((u) => u.id !== me.id && (!q || String(u.email || '').toLowerCase().includes(q) || String(u.mobile || '').includes(q) || String(u.name || '').toLowerCase().includes(q)));
      return sendJson(res, 200, { success: true, users });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/match') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      const numbers = Array.isArray(input.numbers) ? input.numbers.map(Auth.normalizeMobile).filter(Boolean) : [];
      const users = Auth.listUsers().filter((u) => u.id !== me.id && u.mobile && numbers.includes(u.mobile));
      return sendJson(res, 200, { success: true, users });
    }

    if (req.method === 'GET' && url.pathname === '/api/contact/settings') {
      const me = requireAuth(req, res); if (!me) return;
      const other = String(url.searchParams.get('with') || '');
      if (!other || !Auth.getUserById(other) || other === me.id) throw new Error('Valid contact is required.');
      return sendJson(res, 200, { success: true, settings: Contact.getContactSettings(me.id, other) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/settings') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      const other = String(input.contactId || '');
      if (!other || !Auth.getUserById(other) || other === me.id) throw new Error('Valid contact is required.');
      if (!Auth.verifyPassword(me.email || me.mobile, String(input.password || ''))) throw new Error('Incorrect TNS Studio password.');
      if (input.action === 'unlockCheck') return sendJson(res, 200, { success: true, unlocked: true });
      if (!['toggleLock','toggleHide'].includes(input.action)) throw new Error('Invalid contact security action.');
      return sendJson(res, 200, { success: true, ...Contact.updateContactSettings(me.id, other, input.action) });
    }

    if (req.method === 'GET' && url.pathname === '/api/contact/chats') {
      const me = requireAuth(req, res); if (!me) return;
      const other = String(url.searchParams.get('with') || '');
      if (!other || !Auth.getUserById(other) || other === me.id) throw new Error('Valid contact is required.');
      return sendJson(res, 200, { success: true, messages: Contact.listMessages(me.id, other) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/chats') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      if (!input.to || !Auth.getUserById(input.to) || String(input.to) === me.id) throw new Error('Valid contact is required.');
      return sendJson(res, 201, { success: true, message: Contact.addMessage(me.id, input.to, input.text) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/status') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      return sendJson(res, 200, { success: true, status: Contact.setStatus(me.id, input.text) });
    }

    if (req.method === 'GET' && url.pathname === '/api/contact/status') {
      const me = requireAuth(req, res); if (!me) return;
      return sendJson(res, 200, { success: true, status: Contact.getStatus(me.id) });
    }

    if (req.method === 'POST' && url.pathname === '/api/uploads/video') {
      const user = requireAuth(req, res); if (!user) return;
      const parts = await readMultipart(req, 500 * 1024 * 1024);
      const part = parts.find((p) => p.name === 'video' && p.filename);
      if (!part) throw new Error('Video file is required.');
      Uploads.validateUpload(part.filename, part.data.length, { maxFileSize: 500 * 1024 * 1024 });
      if (!part.contentType.startsWith('video/') && !Uploads.isAllowedExtension(part.filename)) throw new Error('Unsupported video format.');
      const saved = Uploads.saveUpload(part.data, UPLOAD_DIR, part.filename, { maxFileSize: 500 * 1024 * 1024 });
      MediaAccess.register(saved.fileName, user.id, { originalName: saved.originalName, createdAt: saved.createdAt });
      return sendJson(res, 201, { success: true, media: { id: saved.id, ownerId: user.id, originalName: saved.originalName, fileName: saved.fileName, size: saved.size, url: publicUrl(saved.fileName) } });
    }

    if (req.method === 'POST' && url.pathname === '/api/editor/export') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 2 * 1024 * 1024);
      const inputPath = safeUploadPathFromUrl(input.inputPath);
      const inputFileName = path.basename(inputPath);
      if (!MediaAccess.canAccess(inputFileName, user.id)) throw new Error('Media access denied.');
      const quality = [720, 1080, 1440].includes(Number(input.quality)) ? Number(input.quality) : 1080;
      const outputName = `${crypto.randomUUID()}-export.mp4`;
      const outputPath = path.join(UPLOAD_DIR, outputName);
      const { exportMP4 } = require('./editor/export');
      await exportMP4(inputPath, outputPath, {
        width: quality,
        height: Math.round(quality * 16 / 9),
        fps: 30,
        trimStart: Math.max(0, Number(input.trimStart) || 0),
        trimDuration: Number(input.trimDuration) > 0 ? Number(input.trimDuration) : null,
        brightness: Number(input.brightness) || 0,
        contrast: Number(input.contrast) || 1,
        filter: String(input.filter || 'none'),
        rotate: Number(input.rotate) || 0,
        speed: Number(input.speed) > 0 ? Number(input.speed) : 1,
        volume: Number.isFinite(Number(input.volume)) ? Math.max(0, Math.min(1, Number(input.volume))) : 1
      });
      MediaAccess.register(outputName, user.id, { originalName: 'TNS Studio export' });
      return sendJson(res, 200, { success: true, result: { fileName: outputName, url: publicUrl(outputName), ownerId: user.id } });
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/chat') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.TNS_AI_PROVIDER || '').toLowerCase();
      if (!providerName) return sendJson(res, 503, { error: 'TNS AI provider is not configured yet.' });
      const provider = getProvider(providerName);
      if (!provider || typeof provider.chat !== 'function') return sendJson(res, 503, { error: 'Configured TNS AI provider does not support chat.' });
      const result = await provider.chat({ message: String(input.message || ''), userId: user.id });
      return sendJson(res, 200, { success: true, reply: result?.reply || result?.text || '' });
    }

    if (req.method === 'POST' && url.pathname === '/api/video/jobs') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.VIDEO_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName || (process.env.NODE_ENV === 'production' && providerName === 'mock')) return sendJson(res, 503, { error: 'A real video provider is not configured for production.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured video provider is unavailable.' });
      const job = await createVideoJob(providerName, { ...input, ownerId: user.id });
      if (provider && typeof provider.create === 'function') {
        try {
          job.providerJob = await provider.create(input);
          if (job.providerJob?.status === 'completed') { job.status = 'completed'; job.result = job.providerJob.result; }
        } catch (error) { job.status = 'failed'; job.error = error.message; }
      }
      return sendJson(res, 202, job);
    }

    match = url.pathname.match(/^\/api\/video\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      const user = requireAuth(req, res); if (!user) return;
      const job = await getVideoJob(decodeURIComponent(match[1]));
      if (!job || job.ownerId !== user.id) return sendJson(res, 404, { error: 'Video job not found.' });
      const provider = getProvider(job.provider);
      const refreshed = await refreshProviderJob(provider, job, 'video', require('./jobs/video-job').update);
      return sendJson(res, 200, refreshed || job);
    }

    if (req.method === 'POST' && url.pathname === '/api/image/jobs') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.IMAGE_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName || (process.env.NODE_ENV === 'production' && providerName === 'mock')) return sendJson(res, 503, { error: 'A real image provider is not configured for production.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured image provider is unavailable.' });
      const job = await createImageJob(providerName, { ...input, ownerId: user.id });
      if (provider && typeof provider.createImage === 'function') {
        try {
          job.providerJob = await provider.createImage(input);
          if (job.providerJob?.status === 'completed') { job.status = 'completed'; job.result = job.providerJob.result; }
        } catch (error) { job.status = 'failed'; job.error = error.message; }
      }
      return sendJson(res, 202, job);
    }

    match = url.pathname.match(/^\/api\/image\/jobs\/([^/]+)$/);
    if (req.method === 'GET' && match) {
      const user = requireAuth(req, res); if (!user) return;
      const job = await getImageJob(decodeURIComponent(match[1]));
      if (!job || job.ownerId !== user.id) return sendJson(res, 404, { error: 'Image job not found.' });
      const provider = getProvider(job.provider);
      const refreshed = await refreshProviderJob(provider, job, 'image', require('./jobs/image-job').update);
      return sendJson(res, 200, refreshed || job);
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

    if (req.method === 'GET' && url.pathname === '/api') return sendJson(res, 200, { name: 'TNS Studio API', version: '3.0.0' });

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
}, 60 * 1000).unref();

server.listen(PORT, () => console.log(`TNS Studio running on port ${PORT}`));
