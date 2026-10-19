'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const html = fs.readFileSync('public/index.html', 'utf8');
const js = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const taskProgress = fs.readFileSync('server/browser/TaskProgress.js', 'utf8');
const server = fs.readFileSync('server/server.js', 'utf8');
// Menu -> screen -> authenticated API wiring.
assert.match(html, /data-menu-open="savedTasks"/);
assert.match(html, /id="savedTasks"/);
assert.match(js, /target==='savedTasks'\)\{showPanel\('savedTasks'\);loadSavedTasks\(\);\}/);
assert.match(server, /url\.pathname === '\/api\/tns-ai\/browser\/task\/list'[\s\S]*?requireAuth\(req, res\)/);
assert.match(server, /url\.pathname === '\/api\/tns-ai\/browser\/task\/resume'[\s\S]*?requireAuth\(req, res\)/);
// Filters, counts, empty/error states and refresh must exist.
for (const id of ['savedTaskStatusFilter','savedTaskActiveOnly','savedTaskRefresh','savedTaskCounts','savedTaskList','savedTaskStatus','savedTaskDetail']) assert.ok(html.includes(`id="${id}"`), `Missing ${id}`);
assert.match(js, /Total: <b>/);
assert.match(js, /Is filter mein koi saved task nahi mila/);
assert.match(js, /catch\(e\)\{status\.textContent=e\.message/);
assert.match(js, /addEventListener\('click',loadSavedTasks\)/);
// Task recovery must be read-only and scoped to the authenticated owner.
assert.match(taskProgress, /function resumeTask\(userId, taskId\)/);
assert.match(taskProgress, /userId/);
assert.match(js, /Task details ready\. Website action nahi chalaya gaya\./);
assert.match(html, /Recovery is read-only/);
assert.match(css, /@media\(max-width:560px\)/);
console.log('SAVED_TASKS_LIVE_READINESS_AUDIT_OK');
