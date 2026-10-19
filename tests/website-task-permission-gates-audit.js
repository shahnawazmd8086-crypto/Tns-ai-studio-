'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.join(__dirname, '..', 'server/server.js'), 'utf8');
const start = server.indexOf('MULTI-WEBSITE TASK WORKFLOW WITH EXPLICIT USER PERMISSION');
assert(start >= 0, 'Explicit permission workflow must exist');
const end = server.indexOf('`;\n      const providerMessage', start);
assert(end > start, 'Permission workflow instruction must be complete');
const workflow = server.slice(start, end);
for (const phrase of [
  'BEFORE any action that needs the user\'s permission, stop and ask first',
  'sharing/uploading personal or private data',
  'accepting legal terms or declarations',
  'wait for an explicit affirmative response',
  'do not proceed with that action',
  'Is this correct, and do you authorize me to submit it?',
  'never claim success without evidence',
  'If browser control is unavailable, say so clearly',
]) assert(workflow.includes(phrase), `Missing permission safety requirement: ${phrase}`);
console.log('WEBSITE_TASK_PERMISSION_GATES_AUDIT_OK');
