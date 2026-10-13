const assert = require('assert');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk.toString(); });
  child.stderr.on('data', chunk => { logs += chunk.toString(); });

  try {
    let health;
    let lastError;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error(`Server exited early. ${logs}`);
      try {
        health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
        break;
      } catch (error) {
        lastError = error;
        await sleep(150);
      }
    }
    assert(health, `Server did not start: ${lastError || logs}`);
    assert.strictEqual(health.status, 200, '/health should return HTTP 200');
    const healthBody = await health.json();
    assert.strictEqual(healthBody.ok, true, '/health should report ok=true');
    assert.strictEqual(healthBody.name, 'TNS Studio API', '/health should identify TNS Studio');

    for (const [route, expectedType] of [
      ['/', 'text/html'],
      ['/app.js', 'application/javascript'],
      ['/style.css', 'text/css']
    ]) {
      const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(3000) });
      assert.strictEqual(response.status, 200, `${route} should return HTTP 200`);
      assert((response.headers.get('content-type') || '').includes(expectedType), `${route} should use ${expectedType}`);
      const body = await response.text();
      assert(body.length > 0, `${route} should not be empty`);
    }
    console.log('HTTP_SMOKE_OK');
  } finally {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      sleep(2000)
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
