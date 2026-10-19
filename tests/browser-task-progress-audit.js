'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const progress = require('../server/browser/TaskProgress');
const server = fs.readFileSync(path.join(__dirname, '..', 'server/server.js'), 'utf8');
const created = progress.createTask('user-a', { goal: 'Prepare a public contact form', steps: [
  { title: 'Inspect public form', website: 'https://example.com/contact' },
  { title: 'Review and approve final submit', website: 'https://example.com/contact', needsApproval: true }
] });
assert.equal(created.task.steps.length, 2);
assert.equal(created.task.status, 'in_progress');
const [first, second] = created.task.steps;
assert.equal(progress.updateTask('user-a', { taskId: created.task.id, stepId: first.id, status: 'completed', note: 'Form inspected' }).task.steps[0].status, 'completed');
assert.throws(() => progress.updateTask('user-a', { taskId: created.task.id, stepId: second.id, status: 'completed' }), /explicit approval record/);
assert.equal(progress.updateTask('user-a', { taskId: created.task.id, stepId: second.id, status: 'completed', approvalRecorded: true }).task.status, 'completed');
assert.throws(() => progress.getTask('user-b', created.task.id), /different signed-in user/);
assert.throws(() => progress.createTask('user-a', { goal: 'Store password token', steps: [{ title: 'safe' }] }), /credentials or secrets/);
assert.throws(() => progress.updateTask('user-a', { taskId: created.task.id, stepId: first.id, status: 'in_progress', note: 'OTP token here' }), /secret/);
assert(server.includes("url.pathname === '/api/tns-ai/browser/task/start'"));
assert(server.includes("url.pathname === '/api/tns-ai/browser/task/update'"));
assert(server.includes("url.pathname === '/api/tns-ai/browser/task/status'"));
console.log('BROWSER_TASK_PROGRESS_AUDIT_OK');
