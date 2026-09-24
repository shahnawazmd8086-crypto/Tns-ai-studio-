const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3187;
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = path.join(ROOT, 'server', 'Data');
const USER_FILE = path.join(DATA_DIR, 'users.json');
const SESSION_FILE = path.join(DATA_DIR, 'sessions.json');

function request(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, BASE);
    const req = http.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body,
        json: (() => {
          try {
            return JSON.parse(body);
          } catch {
            return null;
          }
        })()
      }));
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
    try {
      const r = await request('/health');
      if (r.status === 200) return;
    } catch {}

    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error('Server did not become healthy.');
}

(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const backupUsers = fs.existsSync(USER_FILE)
    ? fs.readFileSync(USER_FILE)
    : null;

  const backupSessions = fs.existsSync(SESSION_FILE)
    ? fs.readFileSync(SESSION_FILE)
    : null;

  fs.writeFileSync(USER_FILE, '[]');
  fs.writeFileSync(SESSION_FILE, '{}');

  const child = spawn(
    process.execPath,
    ['server/server.js'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        NODE_ENV: 'test',
        SESSION_TIMEOUT_MINUTES: '1440',
        OTP_EXPOSE_CODE: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  let stderr = '';

  child.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  try {
    await waitForHealth();

    const health = await request('/health');

    assert.strictEqual(health.json.ok, true);
    assert.strictEqual(health.json.name, 'TNS Studio API');

    const signup = await request('/api/auth/signup', {
      method: 'POST',
      ...jsonOptions({
        mobile: '+919876543210',
        password: 'Tns@2026x'
      })
    });

    assert.strictEqual(signup.status, 201, signup.body);

    assert.ok(
      signup.headers['set-cookie']?.[0].includes('HttpOnly')
    );

    assert.ok(
      signup.headers['set-cookie']?.[0].includes('SameSite=Strict')
    );

    const cookie = signup.headers['set-cookie'][0].split(';')[0];

    assert.ok(signup.json.user.id);
    assert.ok(!('passwordHash' in signup.json.user));

    const me = await request('/api/auth/me', {
      headers: {
        Cookie: cookie
      }
    });

    assert.strictEqual(me.status, 200);
    assert.strictEqual(me.json.user.mobile, '+919876543210');

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      ...jsonOptions({
        identifier: '+919876543210',
        password: 'Wrong@2026'
      })
    });

    assert.strictEqual(badLogin.status, 400);

    assert.match(
      badLogin.json.error,
      /Invalid email\/mobile number or password/i
    );

    const goodLogin = await request('/api/auth/login', {
      method: 'POST',
      ...jsonOptions({
        identifier: '+919876543210',
        password: 'Tns@2026x'
      })
    });

    assert.strictEqual(goodLogin.status, 200);

    const unauthUpload = await request('/api/uploads/video', {
      method: 'POST'
    });

    assert.strictEqual(unauthUpload.status, 401);

    const logout = await request('/api/auth/logout', {
      method: 'POST',
      ...jsonOptions({}, cookie)
    });

    assert.strictEqual(logout.status, 200);

    assert.ok(
      logout.headers['clear-site-data']?.includes('storage')
    );

    console.log('SMOKE_TESTS_OK');
  } finally {
    child.kill('SIGTERM');

    await new Promise((r) => setTimeout(r, 100));

    if (backupUsers === null) {
      try {
        fs.unlinkSync(USER_FILE);
      } catch {}
    } else {
      fs.writeFileSync(USER_FILE, backupUsers);
    }

    if (backupSessions === null) {
      try {
        fs.unlinkSync(SESSION_FILE);
      } catch {}
    } else {
      fs.writeFileSync(SESSION_FILE, backupSessions);
    }

    if (stderr.trim()) {
      process.stderr.write(stderr);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
