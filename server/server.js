const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { signup } = require('./auth/Signup');
const { login } = require('./auth/Login');
const Auth = require('./auth/Auth');
const { createSession, getSession, destroySession, clearExpiredSessions } = require('./auth/Sessions');
const Otp = require('./auth/Otp');
const GoogleAuth = require('./auth/Google');
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


function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `${command} failed with code ${code}`)));
  });
}

function aiVideoDimensions(format, quality) {
  const q = String(quality || 'HD').toLowerCase();
  const base = q === '4k' ? 2160 : q === '2k' ? 1440 : q === 'full hd' ? 1080 : 720;
  const ratio = String(format || '16:9');
  if (ratio === '9:16') return [Math.floor((base * 9 / 16) / 2) * 2, base];
  if (ratio === '1:1') return [base, base];
  if (ratio === '4:5') return [Math.floor((base * 4 / 5) / 2) * 2, base];
  return [base, Math.floor((base * 9 / 16) / 2) * 2];
}

async function generateLocalAIVideo(input = {}, userId) {
  const duration = Math.max(1, Math.min(120, Number(input.duration) || 10));
  const [width, height] = aiVideoDimensions(input.format, input.quality);
  const outputName = `${crypto.randomUUID()}-tns-ai-video.mp4`;
  const outputPath = path.join(UPLOAD_DIR, outputName);
  const prompt = String(input.prompt || 'TNS Studio AI Video').replace(/\s+/g, ' ').trim().slice(0, 180);
  const safeText = prompt.replace(/[:'\\]/g, ' ').replace(/%/g, '\%').replace(/,/g, '\,');
  const style = String(input.style || 'Photorealistic');
  const camera = String(input.camera || 'Auto');
  const workflow = String(input.workflow || 'Script → Video');
  const draw = `drawtext=text='TNS Studio':fontcolor=white:fontsize=${Math.max(28, Math.round(width/32))}:x=(w-text_w)/2:y=40:box=1:boxcolor=black@0.45:boxborderw=12,drawtext=text='${safeText}':fontcolor=white:fontsize=${Math.max(24, Math.round(width/48))}:x=(w-text_w)/2:y=h-text_h-70:box=1:boxcolor=black@0.5:boxborderw=10`;
  const args = ['-y','-f','lavfi','-i',`color=c=0x172033:s=${width}x${height}:r=30`,'-f','lavfi','-i',`sine=frequency=440:sample_rate=48000:duration=${duration}`, '-t', String(duration), '-vf', draw, '-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-b:v', width >= 3840 ? '20M' : width >= 2560 ? '12M' : width >= 1920 ? '8M' : '5M','-c:a','aac','-b:a','192k','-movflags','+faststart','-metadata',`comment=Local TNS Studio fallback | ${style} | ${camera} | ${workflow}` ,outputPath];
  await runCommand('ffmpeg', args);
  MediaAccess.register(outputName, userId, { originalName: 'TNS Studio AI Video', createdAt: new Date().toISOString() });
  return { url: publicUrl(outputName), fileName: outputName, duration, width, height, provider: 'mock', mode: 'local-fallback', prompt, style, camera, workflow };
}


function aiImageDimensions(ratio, quality) {
  const q = String(quality || 'HD').toLowerCase();
  const base = q === '4k' ? 2160 : q === '2k' ? 1440 : q === 'full hd' ? 1080 : 720;
  const r = String(ratio || '1:1');
  if (r === '9:16') return [Math.floor((base * 9 / 16) / 2) * 2, base];
  if (r === '16:9') return [base, Math.floor((base * 9 / 16) / 2) * 2];
  if (r === '4:5') return [Math.floor((base * 4 / 5) / 2) * 2, base];
  if (r === '4:3') return [base, Math.floor((base * 3 / 4) / 2) * 2];
  return [base, base];
}

async function generateLocalAIImage(input = {}, userId) {
  const [width, height] = aiImageDimensions(input.ratio, input.quality);
  const count = Math.max(1, Math.min(4, Number(input.variations) || 1));
  const prompt = String(input.prompt || 'TNS Studio AI Image').replace(/\s+/g, ' ').trim().slice(0, 220);
  const safeText = prompt.replace(/[:'\\]/g, ' ').replace(/%/g, '\\%').replace(/,/g, '\\,');
  const style = String(input.style || 'Photorealistic');
  const outputs = [];
  const backgrounds = ['0x172033','0x243447','0x1d2939','0x202938'];
  for (let i = 0; i < count; i += 1) {
    const outputName = `${crypto.randomUUID()}-tns-ai-image.jpg`;
    const outputPath = path.join(UPLOAD_DIR, outputName);
    const bg = backgrounds[i % backgrounds.length];
    const titleSize = Math.max(30, Math.round(width / 22));
    const bodySize = Math.max(22, Math.round(width / 42));
    const draw = `drawtext=text='TNS Studio':fontcolor=white:fontsize=${titleSize}:x=(w-text_w)/2:y=h*0.18:box=1:boxcolor=black@0.35:boxborderw=12,drawtext=text='${safeText}':fontcolor=white:fontsize=${bodySize}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.48:boxborderw=10,drawtext=text='${style}':fontcolor=white:fontsize=${Math.max(20, Math.round(width/50))}:x=(w-text_w)/2:y=h*0.78`;
    const args = ['-y','-f','lavfi','-i',`color=c=${bg}:s=${width}x${height}`,'-frames:v','1','-vf',draw,'-q:v','2','-metadata',`comment=Local TNS Studio fallback | ${style} | variation ${i+1}`,outputPath];
    await runCommand('ffmpeg', args);
    MediaAccess.register(outputName, userId, { originalName: 'TNS Studio AI Image', createdAt: new Date().toISOString() });
    outputs.push({ url: publicUrl(outputName), fileName: outputName, width, height, variation: i + 1 });
  }
  return { ...outputs[0], variations: outputs, provider: 'mock', mode: 'local-fallback', prompt, style };
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
      if (process.env.OTP_EXPOSE_CODE === 'true') response.otp = otp.code;
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

    if (req.method === 'GET' && url.pathname === '/api/contact/groups') {
      const me = requireAuth(req, res); if (!me) return;
      return sendJson(res, 200, { success: true, groups: Contact.listGroups(me.id) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/groups') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      const members = Array.isArray(input.members) ? input.members.filter(id => id !== me.id && Auth.getUserById(id)).slice(0, 99) : [];
      return sendJson(res, 201, { success: true, group: Contact.createGroup(me.id, input.name, members) });
    }

    if (req.method === 'GET' && url.pathname === '/api/contact/group-messages') {
      const me = requireAuth(req, res); if (!me) return;
      const groupId = String(url.searchParams.get('groupId') || '');
      return sendJson(res, 200, { success: true, messages: Contact.listGroupMessages(groupId, me.id) });
    }

    if (req.method === 'POST' && url.pathname === '/api/contact/group-messages') {
      const me = requireAuth(req, res); if (!me) return;
      const input = await readBody(req, 1024 * 1024);
      const group = Contact.getGroup(String(input.groupId || ''), me.id);
      if (!group) throw new Error('Group not found.');
      return sendJson(res, 201, { success: true, message: Contact.addGroupMessage(group.id, me.id, input.text, { type: input.type, attachment: input.attachment }) });
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
      return sendJson(res, 201, { success: true, message: Contact.addMessage(me.id, input.to, input.text, { type: input.type, attachment: input.attachment }) });
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

    if (req.method === 'POST' && url.pathname === '/api/editor/export') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 2 * 1024 * 1024);
      if (input.timeline && Array.isArray(input.timeline.clips)) {
        const timeline = JSON.parse(JSON.stringify(input.timeline));
        const allMedia = [];
        for (const clip of timeline.clips) { if (clip && clip.source) { const pth=safeUploadPathFromUrl(clip.source); if (!MediaAccess.canAccess(path.basename(pth), user.id)) throw new Error('Timeline media access denied.'); clip.source=pth; allMedia.push(pth); } }
        for (const audio of (timeline.audio||[])) { if (audio && audio.source) { const pth=safeUploadPathFromUrl(audio.source); if (!MediaAccess.canAccess(path.basename(pth), user.id)) throw new Error('Timeline audio access denied.'); audio.source=pth; } }
        for (const overlay of (timeline.overlays||[])) { if (overlay && overlay.source) { const pth=safeUploadPathFromUrl(overlay.source); if (!MediaAccess.canAccess(path.basename(pth), user.id)) throw new Error('Timeline overlay access denied.'); overlay.source=pth; } }
        const quality = [720,1080,1440,2160].includes(Number(input.quality)) ? Number(input.quality) : 1080;
        const outputName = `${crypto.randomUUID()}-timeline-export.mp4`;
        const outputPath = path.join(UPLOAD_DIR, outputName);
        const { exportTimeline } = require('./editor/export');
        const ratio = String(input.ratio || '9:16'); const ratioMap = {'9:16':[9,16],'16:9':[16,9],'1:1':[1,1],'4:5':[4,5]}; const dims=ratioMap[ratio]||ratioMap['9:16']; const width=ratio==='16:9'?Math.round(quality*dims[0]/dims[1]):quality; const height=ratio==='16:9'?quality:Math.round(quality*dims[1]/dims[0]); await exportTimeline(timeline, outputPath, { width, height, fps: Number(input.fps)||30, videoBitrate: input.videoBitrate, audioBitrate: input.audioBitrate });
        MediaAccess.register(outputName, user.id, { originalName: 'TNS Studio timeline export' });
        return sendJson(res, 200, { success: true, result: { fileName: outputName, url: publicUrl(outputName), ownerId: user.id, mode: 'timeline' } });
      }
      const inputPath = safeUploadPathFromUrl(input.inputPath);
      const inputFileName = path.basename(inputPath);
      if (!MediaAccess.canAccess(inputFileName, user.id)) throw new Error('Media access denied.');
      const quality = [720, 1080, 1440, 2160].includes(Number(input.quality)) ? Number(input.quality) : 1080;
      const outputName = `${crypto.randomUUID()}-export.mp4`;
      const outputPath = path.join(UPLOAD_DIR, outputName);
      const { exportMP4 } = require('./editor/export');
      await exportMP4(inputPath, outputPath, {
        width: String(input.ratio||'9:16')==='16:9'?Math.round(quality*16/9):quality,
        height: String(input.ratio||'9:16')==='16:9'?quality:(String(input.ratio||'9:16')==='1:1'?quality:(String(input.ratio||'9:16')==='4:5'?Math.round(quality*5/4):Math.round(quality*16/9))),
        fps: 30,
        trimStart: Math.max(0, Number(input.trimStart) || 0),
        trimDuration: Number(input.trimDuration) > 0 ? Number(input.trimDuration) : null,
        brightness: Number(input.brightness) || 0,
        contrast: Number(input.contrast) || 1,
        filter: String(input.filter || 'none'),
        rotate: Number(input.rotate) || 0,
        speed: Number(input.speed) > 0 ? Number(input.speed) : 1,
        volume: Number.isFinite(Number(input.volume)) ? Math.max(0, Math.min(1, Number(input.volume))) : 1,
        saturation: Number.isFinite(Number(input.saturation)) ? Math.max(0, Math.min(2, Number(input.saturation))) : 1,
        sharpness: Number.isFinite(Number(input.sharpness)) ? Math.max(0, Math.min(2, Number(input.sharpness))) : 0,
        fadeIn: Number.isFinite(Number(input.fadeIn)) ? Math.max(0, Math.min(30, Number(input.fadeIn))) : 0,
        fadeOut: Number.isFinite(Number(input.fadeOut)) ? Math.max(0, Math.min(30, Number(input.fadeOut))) : 0
      });
      MediaAccess.register(outputName, user.id, { originalName: 'TNS Studio export' });
      return sendJson(res, 200, { success: true, result: { fileName: outputName, url: publicUrl(outputName), ownerId: user.id } });
    }

    if (req.method === 'POST' && url.pathname === '/api/editor/tool') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req, 2 * 1024 * 1024);
      const inputPath = safeUploadPathFromUrl(input.inputPath);
      const inputFileName = path.basename(inputPath);
      if (!MediaAccess.canAccess(inputFileName, user.id)) throw new Error('Media access denied.');

      const tool = String(input.tool || '').trim().toLowerCase();
      const { split, crop, flip, reverse, freeze, blur, stabilize, cleanNoise, chromaKey, addText, reframe, trim, resize, normalizeSound, extractSound, mute, exportVideo, mergeVideos, mixAudio, transition, drawText, shape, vignette, color, balance, panZoomTool, keyframes, silenceRemoval, enhanceVoice, enhance, blurFace, removeObject, rotate, fadeAudio, syncBeats, detectScenes, smartCutTool, extendScene, tts, replaceBackground, applyFilter } = require('./editor/video-tools');
      const outputName = () => `${crypto.randomUUID()}-edit.mp4`;
      const outputPath = () => path.join(UPLOAD_DIR, outputName());
      const register = (name, originalName = 'TNS Studio edit') => {
        MediaAccess.register(name, user.id, { originalName, createdAt: new Date().toISOString() });
        return { fileName: name, url: publicUrl(name), ownerId: user.id };
      };

      if (tool === 'merge') {
        const paths = Array.isArray(input.inputPaths) ? input.inputPaths : [];
        if (paths.length < 2 || paths.length > 20) throw new Error('Merge requires 2 to 20 video clips.');
        const resolved = paths.map((value) => safeUploadPathFromUrl(value));
        for (const filePath of resolved) {
          const fileName = path.basename(filePath);
          if (!MediaAccess.canAccess(fileName, user.id)) throw new Error('Media access denied.');
        }
        const listName = `${crypto.randomUUID()}-concat.txt`;
        const listPath = path.join(UPLOAD_DIR, listName);
        const lines = resolved.map((filePath) => `file '${filePath.replace(/'/g, "'\''")}'`).join('\n') + '\n';
        await fs.promises.writeFile(listPath, lines, 'utf8');
        const mergedName = outputName();
        try {
          await mergeVideos(listPath, path.join(UPLOAD_DIR, mergedName));
        } finally {
          await fs.promises.rm(listPath, { force: true });
        }
        return sendJson(res, 200, { success: true, tool, result: register(mergedName, 'TNS Studio merged video') });
      }

      if (tool === 'music' || tool === 'sfx' || tool === 'voice over' || tool === 'voice recorder' || tool === 'audio overlay') {
        const audioPath = safeUploadPathFromUrl(input.audioPath || input.inputAudioPath);
        const audioFileName = path.basename(audioPath);
        if (!MediaAccess.canAccess(audioFileName, user.id)) throw new Error('Audio media access denied.');
        const name = outputName();
        await mixAudio(inputPath, audioPath, path.join(UPLOAD_DIR, name), { volume: input.volume, start: input.start, audioBitrate: input.audioBitrate });
        return sendJson(res, 200, { success: true, tool, result: register(name, `TNS Studio ${tool}`) });
      }



      if (tool === 'tts' || tool === 'text to speech') {
        const text = String(input.text || input.caption || '').trim();
        if (!text) throw new Error('TTS text is required.');
        const audioName = `${crypto.randomUUID()}-tts.wav`;
        const audioPath = path.join(UPLOAD_DIR, audioName);
        await tts(text, audioPath, { voice: input.voice || 'en', speed: input.speed || 165 });
        const name = outputName();
        await mixAudio(inputPath, audioPath, path.join(UPLOAD_DIR, name), { volume: input.volume || 1, start: input.start || 0 });
        await fs.promises.rm(audioPath, { force: true });
        return sendJson(res, 200, { success: true, tool, result: register(name, 'TNS Studio TTS') });
      }

      if (tool === 'transition') {
        const secondPath = safeUploadPathFromUrl(input.secondInputPath || input.inputPaths?.[1] || '');
        if (!secondPath || !MediaAccess.canAccess(path.basename(secondPath), user.id)) throw new Error('Second video access denied.');
        const name = outputName();
        await transition(inputPath, secondPath, path.join(UPLOAD_DIR, name), { transition: input.transition, duration: input.duration, offset: input.offset });
        return sendJson(res, 200, { success: true, tool, result: register(name, 'TNS Studio transition') });
      }


      if (tool === 'background replace') {
        const bgPath = safeUploadPathFromUrl(input.backgroundPath || input.backgroundImage || '');
        if (!bgPath || !MediaAccess.canAccess(path.basename(bgPath), user.id)) throw new Error('Background media access denied.');
        const name = outputName();
        await replaceBackground(inputPath, bgPath, path.join(UPLOAD_DIR, name), { color: input.color, similarity: input.similarity, blend: input.blend });
        return sendJson(res, 200, { success: true, tool, result: register(name, 'TNS Studio background replace') });
      }


      if (tool === 'ripple delete' || tool === 'speed curves' || tool === 'time remap') {
        const name = outputName();
        if (tool === 'ripple delete') await trim(inputPath, path.join(UPLOAD_DIR,name), Math.max(0,Number(input.start)||0), Number(input.duration)>0?Number(input.duration):null);
        else await exportVideo(inputPath, path.join(UPLOAD_DIR,name), { speed: Number(input.speed)>0?Number(input.speed):1.25, width: input.width||1080, height: input.height||1920 });
        return sendJson(res,200,{success:true,tool,result:register(name,`TNS Studio ${tool}`)});
      }
      if (tool === 'mirror' || tool === 'motion tracking') {
        const name=outputName();
        if(tool==='mirror') await flip(inputPath,path.join(UPLOAD_DIR,name),'horizontal');
        else await blurFace(inputPath,path.join(UPLOAD_DIR,name),{x:input.x,y:input.y,width:input.width||240,height:input.height||240});
        return sendJson(res,200,{success:true,tool,result:register(name,`TNS Studio ${tool}`)});
      }
      if (tool === 'templates' || tool === 'auto highlight') {
        const name=outputName();
        if(tool==='templates') await drawText(inputPath,path.join(UPLOAD_DIR,name),input.text||'TNS Studio',{fontSize:input.fontSize||48});
        else await smartCutTool(inputPath,path.join(UPLOAD_DIR,name),{minSilence:input.minSilence||0.35});
        return sendJson(res,200,{success:true,tool,result:register(name,`TNS Studio ${tool}`)});
      }
      if (tool === 'audio fade') { const name=outputName(); await fadeAudio(inputPath,path.join(UPLOAD_DIR,name),{fadeIn:input.fadeIn||1,fadeOut:input.fadeOut||1,totalDuration:input.totalDuration||10}); return sendJson(res,200,{success:true,tool,result:register(name,'TNS Studio audio fade')}); }
      if (tool === 'project versions' || tool === 'duplicate clip') {
        const name=outputName();
        await fs.promises.copyFile(inputPath,path.join(UPLOAD_DIR,name));
        return sendJson(res,200,{success:true,tool,result:register(name,`TNS Studio ${tool}`)});
      }
      if (tool === 'export presets') return sendJson(res,200,{success:true,tool,presets:require('./editor/export').getExportPresets()});

      const advanced = async (fn, originalName, args = []) => {
        const name = outputName();
        await fn(inputPath, path.join(UPLOAD_DIR, name), ...args);
        return sendJson(res, 200, { success: true, tool, result: register(name, originalName) });
      };

      if (tool === 'rotate') return advanced(rotate, 'TNS Studio rotate', [Number(input.degrees ?? input.rotate ?? 90)]);
      if (tool === 'pan & zoom') return advanced(panZoomTool, 'TNS Studio pan zoom', [{ scale: input.scale }]);
      if (tool === 'keyframes') return advanced(keyframes, 'TNS Studio keyframes', [{ zoom: input.zoom, width: input.width, height: input.height, fps: input.fps }]);
      if (tool === 'vignette') return advanced(vignette, 'TNS Studio vignette', [input.strength]);
      if (tool === 'hsl' || tool === 'curves' || tool === 'colour match' || tool === 'lut') return advanced(color, 'TNS Studio colour adjustment', [{ saturation: input.saturation, brightness: input.brightness, contrast: input.contrast, gamma: input.gamma, hue: input.hue }]);
      if (tool === 'temperature' || tool === 'tint') return advanced(balance, 'TNS Studio colour balance', [{ rs: input.red, gs: input.green, bs: input.blue }]);
      if (tool === 'exposure' || tool === 'highlights' || tool === 'shadows') return advanced(color, 'TNS Studio tonal adjustment', [{ brightness: input.amount ?? input.brightness, contrast: input.contrast, saturation: input.saturation }]);
      if (tool === 'captions' || tool === 'ai captions' || tool === 'subtitles' || tool === 'karaoke captions') return advanced(drawText, 'TNS Studio captions', [input.text || input.caption || 'TNS Studio', { fontSize: input.fontSize, x: input.x, y: input.y, start: input.start, duration: input.duration, color: input.color }]);
      if (tool === 'text animation') return advanced(drawText, 'TNS Studio text animation', [input.text || 'TNS Studio', { fontSize: input.fontSize, x: input.x, y: input.y, start: input.start, duration: input.duration }]);
      if (tool === 'stickers' || tool === 'shapes' || tool === 'mask' || tool === 'masks') return advanced(shape, 'TNS Studio shape/mask', [{ x: input.x, y: input.y, width: input.width, height: input.height, color: input.color, fill: input.fill, thickness: input.thickness }]);
      if (tool === 'opacity') return advanced(color, 'TNS Studio opacity', [{ saturation: 1, brightness: 0, contrast: 1 }]);
      if (tool === 'shadow') return advanced(drawText, 'TNS Studio shadow', [input.text || 'TNS Studio', { fontSize: input.fontSize, x: input.x, y: input.y, shadow: input.shadow || 6 }]);
      if (tool === 'blur face' || tool === 'face blur') return advanced(blurFace, 'TNS Studio face blur', [{ x: input.x, y: input.y, width: input.width, height: input.height }]);
      if (tool === 'object removal') return advanced(removeObject, 'TNS Studio object removal', [{ x: input.x, y: input.y, width: input.width, height: input.height }]);
      if (tool === 'background removal' || tool === 'background replace') return advanced(chromaKey, 'TNS Studio background removal', [{ color: input.color || '0x00ff00', similarity: input.similarity || 0.1, blend: input.blend || 0.05 }]);
      if (tool === 'ai enhance' || tool === 'ai upscale') return advanced(enhance, 'TNS Studio enhance', [{ width: input.width || 1920, height: input.height || 1080 }]);
      if (tool === 'voice enhance' || tool === 'ai voice') return advanced(enhanceVoice, 'TNS Studio voice enhancement');
      if (tool === 'silence removal') return advanced(silenceRemoval, 'TNS Studio silence removal', [{ minSilence: input.minSilence, stopThreshold: input.stopThreshold }]);
      if (tool === 'smart cut') return advanced(smartCutTool, 'TNS Studio smart cut', [{ minSilence: input.minSilence, stopThreshold: input.stopThreshold }]);
      if (tool === 'scene extend') return advanced(extendScene, 'TNS Studio scene extend', [input.duration || 2]);
      if (tool === 'beat sync' || tool === 'auto beat') return advanced(syncBeats, 'TNS Studio beat sync', [{ bpm: input.bpm, speed: input.speed }]);
      if (tool === 'scene detection') return advanced(detectScenes, 'TNS Studio scene detection', [{ threshold: input.threshold }]);
      if (tool === 'transitions') {
        const secondPath = safeUploadPathFromUrl(input.secondInputPath || input.inputPaths?.[1] || '');
        if (!secondPath || !MediaAccess.canAccess(path.basename(secondPath), user.id)) throw new Error('Second video access denied.');
        const name = outputName();
        await transition(inputPath, secondPath, path.join(UPLOAD_DIR, name), { transition: input.transition || 'fade', duration: input.duration || 1, offset: input.offset || 0 });
        return sendJson(res, 200, { success: true, tool, result: register(name, 'TNS Studio transition') });
      }


      if (['effects','filters','lens','light leak','glow','film grain','glitch','blend modes','perspective','safe zones','proxy preview','ai voice'].includes(tool)) {
        const name = outputName();
        let filter = 'null';
        if (tool === 'filters') filter = String(input.filter || 'hue=s=0');
        else if (tool === 'film grain') filter = 'noise=alls=12:allf=t+u';
        else if (tool === 'glow') filter = 'gblur=sigma=2';
        else if (tool === 'lens') filter = 'lenscorrection=k1=0.03:k2=0.01';
        else if (tool === 'light leak') filter = 'eq=brightness=0.08:saturation=1.15';
        else if (tool === 'glitch') filter = 'hue=h=10';
        else if (tool === 'perspective') filter = 'scale=iw*1.02:ih*1.02,crop=iw/1.02:ih/1.02';
        else if (tool === 'safe zones') filter = 'drawbox=x=iw*0.05:y=ih*0.05:w=iw*0.9:h=ih*0.9:color=white@0.35:t=3';
        else if (tool === 'proxy preview') filter = 'scale=640:-2';
        else if (tool === 'ai voice') filter = 'eq=contrast=1.05:saturation=1.05';
        await applyFilter(inputPath, path.join(UPLOAD_DIR, name), filter);
        return sendJson(res, 200, { success: true, tool, result: register(name, `TNS Studio ${tool}`) });
      }

      if (tool === 'split') {
        const point = Math.max(0.05, Number(input.splitAt) || 0);
        if (!point) throw new Error('Enter a split time greater than 0 seconds.');
        const a = outputName();
        const b = outputName();
        await split(inputPath, path.join(UPLOAD_DIR, a), path.join(UPLOAD_DIR, b), point);
        return sendJson(res, 200, { success: true, tool, results: [register(a, 'TNS Studio split part 1'), register(b, 'TNS Studio split part 2')] });
      }

      const name = outputName();
      const out = path.join(UPLOAD_DIR, name);
      if (tool === 'trim' || tool === 'cut') {
        await trim(inputPath, out, Math.max(0, Number(input.start) || 0), Number(input.duration) > 0 ? Number(input.duration) : null);
      } else if (tool === 'crop') {
        await crop(inputPath, out, { width: input.width, height: input.height, x: input.x, y: input.y });
      } else if (tool === 'resize') {
        await resize(inputPath, out, Number(input.width), Number(input.height));
      } else if (tool === 'flip') {
        await flip(inputPath, out, input.direction || 'horizontal');
      } else if (tool === 'reverse') {
        await reverse(inputPath, out);
      } else if (tool === 'freeze frame') {
        await freeze(inputPath, out, input.duration || 2);
      } else if (tool === 'blur') {
        await blur(inputPath, out, input.strength || 8);
      } else if (tool === 'stabilization') {
        await stabilize(inputPath, out);
      } else if (tool === 'noise cleanup') {
        await cleanNoise(inputPath, out, input.amount || 12);
      } else if (tool === 'chroma key' || tool === 'green screen') {
        await chromaKey(inputPath, out, { color: input.color || '0x00ff00', similarity: input.similarity, blend: input.blend });
      } else if (tool === 'text') {
        await addText(inputPath, out, input.text, { fontSize: input.fontSize, x: input.x, y: input.y });
      } else if (tool === 'auto reframe') {
        await reframe(inputPath, out, Number(input.width) || 1080, Number(input.height) || 1920);
      } else if (tool === 'normalize audio' || tool === 'audio normalize') {
        await normalizeSound(inputPath, out);
      } else if (tool === 'mute') {
        await mute(inputPath, out);
      } else if (tool === 'extract audio') {
        const audioName = `${crypto.randomUUID()}-audio.m4a`;
        const audioPath = path.join(UPLOAD_DIR, audioName);
        await extractSound(inputPath, audioPath);
        return sendJson(res, 200, { success: true, tool, result: register(audioName, 'TNS Studio extracted audio') });
      } else if (tool === 'export') {
        await exportVideo(inputPath, out, input.options || {});
      } else {
        return sendJson(res, 400, { error: `Editor tool '${input.tool}' is not implemented as a local media operation yet.` });
      }

      return sendJson(res, 200, { success: true, tool, result: register(name) });
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/chat') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.TNS_AI_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName) return sendJson(res, 503, { error: 'TNS AI provider is not configured yet.' });
      const provider = getProvider(providerName);
      if (!provider || typeof provider.chat !== 'function') return sendJson(res, 503, { error: 'Configured TNS AI provider does not support chat.' });
      const result = await provider.chat({ message: String(input.message || ''), research: Boolean(input.research), userId: user.id });
      return sendJson(res, 200, { success: true, reply: result?.reply || result?.text || '' });
    }

    if (req.method === 'POST' && url.pathname === '/api/tns-ai/understand') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.TNS_AI_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName) return sendJson(res, 503, { error: 'TNS AI provider is not configured yet.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured TNS AI provider is unavailable.' });
      if (typeof provider.understand === 'function') { const result = await provider.understand({ ...input, userId: user.id }); return sendJson(res, 200, { success: true, ...result }); }
      if (typeof provider.chat === 'function') { const result = await provider.chat({ message: String(input.message || 'Analyze the supplied file/image.'), file: input.file || null, userId: user.id }); return sendJson(res, 200, { success: true, reply: result?.reply || result?.text || '' }); }
      return sendJson(res, 503, { error: 'Configured TNS AI provider does not support file understanding.' });
    }

    if (req.method === 'POST' && url.pathname === '/api/video/jobs') {
      const user = requireAuth(req, res); if (!user) return;
      const input = await readBody(req);
      const providerName = String(process.env.VIDEO_PROVIDER || (process.env.NODE_ENV === 'production' ? '' : 'mock')).toLowerCase();
      if (!providerName || (process.env.NODE_ENV === 'production' && providerName === 'mock')) return sendJson(res, 503, { error: 'A real video provider is not configured for production.' });
      const provider = getProvider(providerName);
      if (!provider) return sendJson(res, 503, { error: 'Configured video provider is unavailable.' });
      const job = await createVideoJob(providerName, { ...input, ownerId: user.id });
      if (providerName === 'mock') {
        job.status = 'processing';
        job.progress = 5;
        generateLocalAIVideo(input, user.id).then(async result => {
          await require('./jobs/video-job').complete(job.id, result);
        }).catch(async error => {
          await require('./jobs/video-job').fail(job.id, error);
        });
      } else if (provider && typeof provider.create === 'function') {
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
      if (providerName === 'mock') {
        job.status = 'processing';
        job.progress = 5;
        generateLocalAIImage(input, user.id).then(async result => {
          await require('./jobs/image-job').update(job.id, { status: 'completed', progress: 100, result, error: null });
        }).catch(async error => {
          await require('./jobs/image-job').update(job.id, { status: 'failed', error: error.message });
        });
      } else if (provider && typeof provider.createImage === 'function') {
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
  GoogleAuth.cleanupStates();
}, 60 * 1000).unref();

server.listen(PORT, () => console.log(`TNS Studio running on port ${PORT}`));
