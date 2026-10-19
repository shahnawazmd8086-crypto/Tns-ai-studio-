'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const review = require('../server/browser/ActionReview');
const browser = require('../server/browser/BrowserAutomation');
const server = fs.readFileSync(path.join(__dirname, '..', 'server/server.js'), 'utf8');
assert.equal(typeof browser.executeApprovedFormAction, 'function');
const created = review.createActionReview('owner-1', {
  url: 'https://example.com/contact', action: 'submit',
  description: 'Submit public contact form', dataSummary: 'Name and message fields',
  execution: { url: 'https://example.com/contact', formIndex: 0, values: { name: 'A User', message: 'Hello' } }
});
assert.equal(created.mode, 'final_action_review_pending');
assert.deepEqual(created.review.execution.fields, [{ key: 'name', value: 'A User' }, { key: 'message', value: 'Hello' }]);
const approved = review.approveActionReview('owner-1', { reviewId: created.reviewId, confirmation: created.requiredConfirmation });
assert.equal(approved.mode, 'approval_recorded_one_time_ticket_ready');
assert.ok(approved.executionTicket);
assert.throws(() => review.consumeApprovedExecution('other-user', { executionTicket: approved.executionTicket }), /different signed-in user/);
const execution = review.consumeApprovedExecution('owner-1', { executionTicket: approved.executionTicket });
assert.deepEqual(execution.values, { name: 'A User', message: 'Hello' });
assert.throws(() => review.consumeApprovedExecution('owner-1', { executionTicket: approved.executionTicket }), /missing, expired, or already used/);
assert.throws(() => review.createActionReview('owner-1', {
  url: 'https://example.com', action: 'submit', description: 'Submit', dataSummary: 'safe',
  execution: { url: 'https://example.com', formIndex: 0, values: { password: 'secret' } }
}), /ordinary non-sensitive text fields/);
assert.throws(() => review.createActionReview('owner-1', {
  url: 'https://example.com', action: 'publish', description: 'Publish', dataSummary: 'safe',
  execution: { url: 'https://example.com', formIndex: 0, values: { name: 'x' } }
}), /only for a reviewed form submit action/);
assert(server.includes("url.pathname === '/api/tns-ai/browser/execute-approved'"));
assert(server.includes('ActionReview.consumeApprovedExecution(user.id, input)'));
assert(server.includes('BrowserAutomation.executeApprovedFormAction(approved.url, approved.values, approved.formIndex)'));
console.log('BROWSER_APPROVED_EXECUTION_AUDIT_OK');
