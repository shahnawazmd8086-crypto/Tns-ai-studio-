'use strict';

const { randomUUID } = require('node:crypto');
const { validatePublicHttpUrl } = require('./BrowserAutomation');

// Short-lived, user-bound approval records. This module does not execute browser actions.
const reviews = new Map();
const approvedTickets = new Map();
const TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 2 * 60 * 1000;
const ACTIONS = new Set(['submit', 'send', 'publish', 'apply', 'book', 'order', 'delete', 'accept_terms']);
const forbidden = /(password|passcode|otp|one.?time|secret|token|card.?number|cvv|cvc|bank.?account|routing.?number)/i;

function cleanText(value, max, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${label} is too long (maximum ${max} characters).`);
  return result;
}

function prune() {
  const now = Date.now();
  for (const [id, item] of reviews) if (item.expiresAt <= now || item.used) reviews.delete(id);
  for (const [id, item] of approvedTickets) if (item.expiresAt <= now || item.used) approvedTickets.delete(id);
}

function validateExecution(input, url, action) {
  if (input.execution === undefined) return null;
  if (action !== 'submit') throw new Error('An executable browser ticket is supported only for a reviewed form submit action.');
  const execution = input.execution;
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) throw new Error('Execution details must be an object.');
  const targetUrl = validatePublicHttpUrl(execution.url || url);
  if (targetUrl !== url) throw new Error('Execution URL must exactly match the reviewed website.');
  const formIndex = Number(execution.formIndex ?? 0);
  if (!Number.isInteger(formIndex) || formIndex < 0 || formIndex > 14) throw new Error('formIndex must be an integer from 0 to 14.');
  const values = execution.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Execution field values must be an object.');
  const entries = Object.entries(values);
  if (!entries.length || entries.length > 30) throw new Error('Provide between 1 and 30 reviewed form fields.');
  const unsafe = /(pass(word)?|otp|one.?time|secret|token|auth|card|cvv|cvc|security.?code|bank|routing|ssn|social.?security|file|upload|agree|consent|accept|terms|signature|payment|checkout)/i;
  const cleanValues = {};
  for (const [key, value] of entries) {
    if (!key || key.length > 120 || unsafe.test(key) || !['string','number','boolean'].includes(typeof value)) throw new Error('Executable forms may include only ordinary non-sensitive text fields.');
    const text = String(value);
    if (text.length > 2000) throw new Error('A reviewed field value is too long.');
    cleanValues[key] = text;
  }
  return { url, formIndex, values: cleanValues };
}

function createActionReview(userId, input = {}) {
  prune();
  if (!userId) throw new Error('Sign in is required to create an action review.');
  const url = validatePublicHttpUrl(input.url);
  const action = String(input.action || '').trim().toLowerCase();
  if (!ACTIONS.has(action)) throw new Error('Choose a supported final action: submit, send, publish, apply, book, order, delete, or accept_terms.');
  const description = cleanText(input.description, 500, 'Action description');
  const dataSummary = cleanText(input.dataSummary, 2000, 'Data summary');
  if (forbidden.test(dataSummary)) throw new Error('Do not include passwords, OTPs, security tokens, or payment secrets in the review summary.');
  const execution = validateExecution(input, url, action);
  const id = randomUUID();
  const expiresAt = Date.now() + TTL_MS;
  reviews.set(id, { id, userId: String(userId), url, action, description, dataSummary, execution, expiresAt, used: false });
  return {
    success: true,
    mode: 'final_action_review_pending',
    reviewId: id,
    expiresAt: new Date(expiresAt).toISOString(),
    review: { website: url, action, description, dataSummary, ...(execution ? { execution: { formIndex: execution.formIndex, fields: Object.entries(execution.values).map(([key, value]) => ({ key, value })) } } : {}) },
    requiredConfirmation: `I approve ${action} on ${url}`,
    note: 'This is a review checkpoint only. No website button was clicked and nothing was submitted, sent, published, applied, booked, ordered, deleted, or paid for.'
  };
}

function approveActionReview(userId, input = {}) {
  prune();
  const id = String(input.reviewId || '');
  const item = reviews.get(id);
  if (!item || item.used || item.expiresAt <= Date.now()) {
    const error = new Error('This review is missing or expired. Create a fresh review before approval.'); error.statusCode = 410; throw error;
  }
  if (item.userId !== String(userId || '')) {
    const error = new Error('This review belongs to a different signed-in user.'); error.statusCode = 403; throw error;
  }
  const expected = `I approve ${item.action} on ${item.url}`;
  if (typeof input.confirmation !== 'string' || input.confirmation.trim() !== expected) {
    const error = new Error('Confirmation did not exactly match the reviewed website and action. No approval was recorded.'); error.statusCode = 400; throw error;
  }
  item.used = true;
  reviews.delete(id);
  let executionTicket = null;
  if (item.execution) {
    executionTicket = randomUUID();
    approvedTickets.set(executionTicket, { userId: item.userId, url: item.url, action: item.action, execution: item.execution, expiresAt: Date.now() + TICKET_TTL_MS, used: false });
  }
  return {
    success: true,
    mode: executionTicket ? 'approval_recorded_one_time_ticket_ready' : 'approval_recorded_action_not_executed',
    ...(executionTicket ? { executionTicket, executionTicketExpiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString() } : {}),
    approved: { website: item.url, action: item.action, description: item.description, dataSummary: item.dataSummary },
    note: executionTicket ? 'Explicit approval was recorded and a short-lived, user-bound, one-time ticket was issued for the reviewed public form. This ticket is not itself proof that the website action has executed.' : 'Explicit approval was recorded for this exact action, but TNS did not execute it. A supported website-action executor and a fresh browser session are still required. Approval cannot be reused.'
  };
}

function consumeApprovedExecution(userId, input = {}) {
  prune();
  const ticket = String(input.executionTicket || '');
  const item = approvedTickets.get(ticket);
  if (!item || item.used || item.expiresAt <= Date.now()) { const error = new Error('Execution ticket is missing, expired, or already used. Request fresh review and approval.'); error.statusCode = 410; throw error; }
  if (item.userId !== String(userId || '')) { const error = new Error('This execution ticket belongs to a different signed-in user.'); error.statusCode = 403; throw error; }
  item.used = true;
  approvedTickets.delete(ticket);
  return { url: item.url, action: item.action, formIndex: item.execution.formIndex, values: { ...item.execution.values } };
}

module.exports = { createActionReview, approveActionReview, consumeApprovedExecution };
