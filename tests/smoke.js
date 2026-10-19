const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3187;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = path.join(ROOT, 'server', 'Data');
const CHAT_HISTORY_TEST_DIR = fs.mkdtempSync(path.join(require('os').tmpdir(), 'tns-smoke-chat-history-'));
const USER_FILE = path.join(DATA_DIR, 'users.json');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

function request(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE);
    const req = http.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, json: (() => { try { return JSON.parse(body); } catch { return null; } })() }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function jsonOptions(body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return { headers, body: JSON.stringify(body) };
}

async function waitForHealth() {
  for (let i = 0; i < 50; i++) {
    try { const r = await request('/health'); if (r.status === 200) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server did not become healthy.');
}

(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const backupUsers = fs.existsSync(USER_FILE) ? fs.readFileSync(USER_FILE) : null;
  const backupSessions = fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE) : null;
  fs.writeFileSync(USER_FILE, '[]');
  fs.writeFileSync(SESSION_FILE, '{}');

  const child = spawn(process.execPath, ['server/server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', SESSION_TIMEOUT_MINUTES: '1440', OTP_EXPOSE_CODE: 'true', CHAT_HISTORY_DIR: CHAT_HISTORY_TEST_DIR }, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });

  try {
    await waitForHealth();
    const health = await request('/health');
    assert.strictEqual(health.json.ok, true);
    assert.strictEqual(health.json.name, 'TNS API');

    const signup = await request('/api/auth/signup', { method: 'POST', ...jsonOptions({ email: 'test@example.com', mobile: '+919876543210', password: 'MyOwnPass8' }) });
    assert.strictEqual(signup.status, 201, signup.body);
    assert.ok(signup.headers['set-cookie']?.[0].includes('HttpOnly'));
    assert.ok(signup.headers['set-cookie']?.[0].includes('SameSite=Strict'));
    const cookie = signup.headers['set-cookie'][0].split(';')[0];
    assert.ok(signup.json.user.id);
    assert.ok(!('passwordHash' in signup.json.user));

    const me = await request('/api/auth/me', { headers: { Cookie: cookie } });
    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.json.user.mobile, '+919876543210');
    assert.strictEqual(me.json.user.email, 'test@example.com');

    const unauthChat = await request('/api/tns-ai/chat', { method: 'POST', ...jsonOptions({ message: 'Meri madad karo' }) });
    assert.strictEqual(unauthChat.status, 401, 'TNS AI chat must require a signed-in user.');
    const authChat = await request('/api/tns-ai/chat', { method: 'POST', ...jsonOptions({ message: 'Meri madad karo', research: true }, cookie) });
    if (process.env.TAVILY_API_KEY) {
      assert.ok([200, 429, 502].includes(authChat.status), authChat.body);
    } else {
      assert.strictEqual(authChat.status, 503, 'Research must clearly report missing live-search configuration instead of pretending it ran.');
      assert.match(authChat.json.error || '', /TAVILY_API_KEY/i);
    }

    const unauthHistory = await request('/api/tns-ai/conversations');
    assert.strictEqual(unauthHistory.status, 401, 'conversation history must require authentication');
    const createConversation = await request('/api/tns-ai/conversations', { method: 'POST', ...jsonOptions({ messages: [{ role: 'user', content: 'History test question' }, { role: 'assistant', content: 'History test answer' }] }, cookie) });
    assert.strictEqual(createConversation.status, 200, createConversation.body);
    const conversationId = createConversation.json.conversation.id;
    assert.strictEqual(createConversation.json.conversation.messages.length, 2, 'created conversation contains messages');
    const listConversations = await request('/api/tns-ai/conversations', { headers: { Cookie: cookie } });
    assert.strictEqual(listConversations.status, 200);
    assert.ok(listConversations.json.conversations.some(item => item.id === conversationId), 'new conversation appears in history list');
    const loadConversation = await request(`/api/tns-ai/conversations/${conversationId}`, { headers: { Cookie: cookie } });
    assert.strictEqual(loadConversation.status, 200);
    assert.strictEqual(loadConversation.json.conversation.messages[1].content, 'History test answer', 'saved conversation can be reopened');
    const badConversationId = await request('/api/tns-ai/conversations/%2E%2E%2Fusers', { headers: { Cookie: cookie } });
    assert.ok(!badConversationId.json?.conversation, 'unsafe conversation path must not return conversation data');
    const secondSignup = await request('/api/auth/signup', { method: 'POST', ...jsonOptions({ email: 'second-chat-test@example.com', password: 'SecondPass8' }) });
    assert.strictEqual(secondSignup.status, 201, secondSignup.body);
    const secondCookie = secondSignup.headers['set-cookie'][0].split(';')[0];
    const crossUserLoad = await request(`/api/tns-ai/conversations/${conversationId}`, { headers: { Cookie: secondCookie } });
    assert.strictEqual(crossUserLoad.status, 404, 'another account cannot load this conversation');
    const deleteConversation = await request(`/api/tns-ai/conversations/${conversationId}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.strictEqual(deleteConversation.status, 200, 'conversation can be deleted');
    const deletedConversation = await request(`/api/tns-ai/conversations/${conversationId}`, { headers: { Cookie: cookie } });
    assert.strictEqual(deletedConversation.status, 404, 'deleted conversation cannot be reopened');

    const badLogin = await request('/api/auth/login', { method: 'POST', ...jsonOptions({ identifier: '+919876543210', password: 'Wrong@2026' }) });
    assert.strictEqual(badLogin.status, 400);
    assert.match(badLogin.json.error, /Invalid email\/mobile number or password/i);

    const goodLogin = await request('/api/auth/login', { method: 'POST', ...jsonOptions({ identifier: '+919876543210', password: 'MyOwnPass8' }) });
    assert.strictEqual(goodLogin.status, 200);
    assert.strictEqual(goodLogin.json.success, true);
    assert.strictEqual(goodLogin.json.message, 'Login successful.');
    assert.ok(goodLogin.headers['set-cookie']?.[0].includes('HttpOnly'));

    const emailLogin = await request('/api/auth/login', { method: 'POST', ...jsonOptions({ identifier: 'test@example.com', password: 'MyOwnPass8' }) });
    assert.strictEqual(emailLogin.status, 200);
    assert.strictEqual(emailLogin.json.success, true);

    const forgot = await request('/api/auth/forgot-password', { method: 'POST', ...jsonOptions({ identifier: '+919876543210' }) });
    assert.strictEqual(forgot.status, 200);
    assert.ok(forgot.json.otp);
    const reset = await request('/api/auth/password/reset', { method: 'POST', ...jsonOptions({ identifier: '+919876543210', otp: forgot.json.otp, newPassword: 'MyNewPass9' }) });
    assert.strictEqual(reset.status, 200);
    const resetLogin = await request('/api/auth/login', { method: 'POST', ...jsonOptions({ identifier: '+919876543210', password: 'MyNewPass9' }) });
    assert.strictEqual(resetLogin.status, 200);

    const googleConfig = await request('/api/auth/google');
    assert.strictEqual(googleConfig.status, 302);
    assert.match(googleConfig.headers.location || '', /Google%20sign-in%20is%20not%20configured/i);

    const goodLoginOld = await request('/api/auth/login', { method: 'POST', ...jsonOptions({ identifier: '+919876543210', password: 'Tns@2026x' }) });
    assert.strictEqual(goodLoginOld.status, 400);
    const unauthUpload = await request('/api/uploads/video', { method: 'POST' });
    assert.strictEqual(unauthUpload.status, 401);

    const logout = await request('/api/auth/logout', { method: 'POST', ...jsonOptions({}, cookie) });
    assert.strictEqual(logout.status, 200);
    assert.ok(logout.headers['clear-site-data']?.includes('storage'));

    console.log('SMOKE_TESTS_OK');
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 100));
    if (backupUsers === null) { try { fs.unlinkSync(USER_FILE); } catch {} } else fs.writeFileSync(USER_FILE, backupUsers);
    if (backupSessions === null) { try { fs.unlinkSync(SESSION_FILE); } catch {} } else fs.writeFileSync(SESSION_FILE, backupSessions);
    fs.rmSync(CHAT_HISTORY_TEST_DIR, { recursive: true, force: true });
    if (stderr.trim()) process.stderr.write(stderr);
  }
})().catch((error) => { console.error(error); process.exit(1); });
