'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const review = require('../server/browser/ActionReview');
const server = fs.readFileSync(path.join(__dirname, '..', 'server/server.js'), 'utf8');
const created = review.createActionReview('user-a', {
  url: 'https://example.com/form', action: 'submit',
  description: 'Submit the contact form', dataSummary: 'Name and message fields only'
});
assert.equal(created.success, true);
assert.equal(created.mode, 'final_action_review_pending');
assert.match(created.requiredConfirmation, /^I approve submit on https:\/\/example\.com\/form$/);
assert.match(created.note, /nothing was submitted/);
assert.throws(() => review.createActionReview('user-a', {
  url: 'https://example.com', action: 'submit', description: 'Submit form', dataSummary: 'password field'
}), /Do not include passwords/);
assert.throws(() => review.approveActionReview('user-b', { reviewId: created.reviewId, confirmation: created.requiredConfirmation }), /different signed-in user/);
assert.throws(() => review.approveActionReview('user-a', { reviewId: created.reviewId, confirmation: 'yes' }), /did not exactly match/);
const approved = review.approveActionReview('user-a', { reviewId: created.reviewId, confirmation: created.requiredConfirmation });
assert.equal(approved.mode, 'approval_recorded_action_not_executed');
assert.equal(approved.approved.action, 'submit');
assert.match(approved.note, /did not execute it/);
assert.throws(() => review.approveActionReview('user-a', { reviewId: created.reviewId, confirmation: created.requiredConfirmation }), /missing or expired/);
assert(server.includes("url.pathname === '/api/tns-ai/browser/review'"));
assert(server.includes("url.pathname === '/api/tns-ai/browser/approve'"));
assert(server.includes('ActionReview.approveActionReview(user.id, input)'));
console.log('BROWSER_ACTION_REVIEW_AUDIT_OK');
