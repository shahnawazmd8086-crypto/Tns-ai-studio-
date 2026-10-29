const assert = require('assert');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runCase(nodeEnv, expectCode) {
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: nodeEnv, OTP_EXPOSE_CODE: 'true', PORT: String(port) },
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let logs = '';
  child.stderr.on('data', chunk => { logs += chunk.toString(); });
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
        if (r.ok) { ready = true; break; }
      } catch {}
      if (child.exitCode !== null) break;
      await sleep(100);
    }
    assert(ready, `Server did not start (${nodeEnv}): ${logs}`);
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/otp/request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: `otp-audit-${nodeEnv}-${Date.now()}@example.com` })
    });
    assert.strictEqual(response.status, 200);
    const body = await response.json();
    assert.strictEqual(Object.hasOwn(body, 'otp'), expectCode, `${nodeEnv} OTP exposure policy failed`);
    if (expectCode) assert(/^\d{6}$/.test(body.otp), 'Development OTP should be six digits');
  } finally {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(1500)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
(async () => {
  await runCase('development', true);
  await runCase('production', false);
  console.log('DEV_OTP_SAFETY_AUDIT_OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
