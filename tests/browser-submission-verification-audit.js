'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const browser = require('../server/browser/BrowserAutomation');
assert.deepEqual(browser.classifySubmissionResult({text:'Thank you! Your message was sent.'}), {
  verification:'confirmation_detected', accepted:true,
  reason:'The resulting page contains text commonly used as a submission confirmation. This is evidence, not a guarantee of backend acceptance.'
});
assert.equal(browser.classifySubmissionResult({text:'Submission failed. Please try again.'}).verification, 'rejection_detected');
assert.equal(browser.classifySubmissionResult({status:500,text:'Server error'}).verification, 'rejection_detected');
assert.equal(browser.classifySubmissionResult({text:'Welcome to our site'}).verification, 'inconclusive');
const source = fs.readFileSync(path.join(__dirname, '..', 'server/browser/BrowserAutomation.js'), 'utf8');
assert.match(source, /finalResponse = result\[0\]/);
assert.match(source, /verification, note:data\.executed/);
console.log('BROWSER_SUBMISSION_VERIFICATION_AUDIT_OK');
