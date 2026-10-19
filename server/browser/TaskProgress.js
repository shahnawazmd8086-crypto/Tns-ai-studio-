'use strict';
const { randomUUID } = require('node:crypto');
const { validatePublicHttpUrl } = require('./BrowserAutomation');
const fs = require('node:fs');
const path = require('node:path');

// Durable, user-bound task progress. Only task metadata is accepted; never store credentials or form values.
const STORE_FILE = process.env.TNS_TASK_PROGRESS_FILE
  ? path.resolve(process.env.TNS_TASK_PROGRESS_FILE)
  : path.join(__dirname, '..', 'Data', 'browser-tasks.json');
const tasks = new Map();
function loadStore() {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid task store format.');
    for (const task of parsed) {
      if (task && typeof task.id === 'string' && typeof task.userId === 'string' && Number.isFinite(task.expiresAt) && Array.isArray(task.steps)) tasks.set(task.id, task);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      // Fail closed rather than silently replacing a damaged store with an empty one.
      throw new Error(`Could not load task progress store: ${error.message}`);
    }
  }
}
function saveStore() {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true, mode: 0o700 });
  const temp = `${STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify([...tasks.values()]), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, STORE_FILE);
}
loadStore();
const TTL_MS = 24 * 60 * 60 * 1000;
const STATES = new Set(['pending', 'in_progress', 'waiting_for_user', 'blocked', 'completed', 'failed']);
const SECRET = /(password|passcode|otp|one.?time|secret|token|card|cvv|cvc|bank|cookie|authorization|session)/i;
function clean(value, max, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  const s = value.trim();
  if (s.length > max) throw new Error(`${label} is too long.`);
  if (SECRET.test(s)) throw new Error(`${label} must not contain credentials or secrets.`);
  return s;
}
function prune() {
  const now = Date.now();
  let changed = false;
  for (const [id, task] of tasks) if (task.expiresAt <= now) { tasks.delete(id); changed = true; }
  if (changed) saveStore();
}
function createTask(userId, input = {}) {
  prune();
  if (!userId) throw new Error('Sign in is required to track a task.');
  const goal = clean(input.goal, 500, 'Task goal');
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 30) throw new Error('Provide between 1 and 30 task steps.');
  const steps = input.steps.map((step, i) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) throw new Error(`Step ${i + 1} is invalid.`);
    const title = clean(step.title, 200, `Step ${i + 1} title`);
    const status = step.status || 'pending';
    if (!STATES.has(status)) throw new Error(`Step ${i + 1} has an unsupported status.`);
    let website = null;
    if (step.website) website = validatePublicHttpUrl(step.website);
    const needsApproval = Boolean(step.needsApproval);
    return { id: randomUUID(), title, status, website, needsApproval, updatedAt: new Date().toISOString(), note: '' };
  });
  const id = randomUUID();
  const task = { id, userId: String(userId), goal, status: 'in_progress', steps, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), expiresAt: Date.now() + TTL_MS };
  tasks.set(id, task);
  saveStore();
  return { success: true, task: publicTask(task), note: 'Task progress is saved to the server task store. It expires after 24 hours; deployment storage must be persistent to survive host replacement.' };
}
function publicTask(task) {
  const { userId, expiresAt, ...safe } = task;
  return JSON.parse(JSON.stringify(safe));
}
function ownedTask(userId, taskId) {
  prune();
  const task = tasks.get(String(taskId || ''));
  if (!task) { const e = new Error('Task was not found or has expired.'); e.statusCode = 404; throw e; }
  if (task.userId !== String(userId || '')) { const e = new Error('This task belongs to a different signed-in user.'); e.statusCode = 403; throw e; }
  return task;
}
function updateTask(userId, input = {}) {
  const task = ownedTask(userId, input.taskId);
  const step = task.steps.find(s => s.id === String(input.stepId || ''));
  if (!step) { const e = new Error('Step was not found in this task.'); e.statusCode = 404; throw e; }
  if (!STATES.has(input.status)) throw new Error('Choose a supported step status.');
  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > 500 || SECRET.test(input.note))) throw new Error('Step note is invalid or may contain a secret.');
  // Do not allow marking a consequential step complete without an explicit recorded approval marker.
  if (['completed'].includes(input.status) && step.needsApproval && input.approvalRecorded !== true) throw new Error('This step requires an explicit approval record before it can be marked completed.');
  step.status = input.status;
  step.note = String(input.note || '').trim();
  step.updatedAt = new Date().toISOString();
  task.status = task.steps.every(s => s.status === 'completed') ? 'completed' : task.steps.some(s => s.status === 'failed') ? 'failed' : task.steps.some(s => s.status === 'blocked') ? 'blocked' : task.steps.some(s => s.status === 'waiting_for_user') ? 'waiting_for_user' : 'in_progress';
  task.updatedAt = new Date().toISOString();
  saveStore();
  return { success: true, task: publicTask(task), note: 'Progress status only; this endpoint does not operate a website or execute the step.' };
}
function listTasks(userId, input = {}) {
  prune();
  if (!userId) throw new Error('Sign in is required to list tasks.');
  const limit = Number.isInteger(input.limit) ? Math.max(1, Math.min(input.limit, 50)) : 20;
  const activeOnly = input.activeOnly === true;
  const requestedStatus = input.status === undefined || input.status === '' ? null : input.status;
  if (requestedStatus !== null && !STATES.has(requestedStatus)) throw new Error('Choose a supported task status filter.');
  const owned = [...tasks.values()].filter(task => task.userId === String(userId));
  const filtered = owned.filter(task => (!activeOnly || task.status !== 'completed') && (!requestedStatus || task.status === requestedStatus));
  const items = filtered
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map(publicTask);
  return {
    success: true,
    tasks: items,
    filters: { activeOnly, status: requestedStatus, limit },
    counts: {
      totalOwned: owned.length,
      active: owned.filter(task => task.status !== 'completed').length,
      completed: owned.filter(task => task.status === 'completed').length,
      matched: filtered.length,
      returned: items.length
    },
    note: 'Only your task metadata is listed. Filters do not open websites or execute actions.'
  };
}
function resumeTask(userId, taskId) {
  const task = ownedTask(userId, taskId);
  const safe = publicTask(task);
  const nextStep = safe.steps.find(step => step.status !== 'completed') || null;
  const completedSteps = safe.steps.filter(step => step.status === 'completed');
  const remainingSteps = safe.steps.filter(step => step.status !== 'completed');
  const approvalRequiredSteps = remainingSteps.filter(step => step.needsApproval);
  const statusCounts = safe.steps.reduce((counts, step) => {
    counts[step.status] = (counts[step.status] || 0) + 1;
    return counts;
  }, {});
  return {
    success: true,
    task: safe,
    summary: {
      goal: safe.goal,
      taskStatus: safe.status,
      totalSteps: safe.steps.length,
      completedCount: completedSteps.length,
      remainingCount: remainingSteps.length,
      statusCounts,
      approvalRequiredSteps: approvalRequiredSteps.map(step => ({ id: step.id, title: step.title, status: step.status, website: step.website })),
      nextAction: nextStep ? (nextStep.needsApproval ? 'request_fresh_user_approval_before_action' : 'recheck_website_then_continue_safely') : 'task_already_completed'
    },
    completedSteps: completedSteps.map(step => ({ id: step.id, title: step.title, status: step.status })),
    remainingSteps: remainingSteps.map(step => ({ id: step.id, title: step.title, status: step.status, website: step.website, needsApproval: step.needsApproval })),
    resumeAt: nextStep ? { id: nextStep.id, title: nextStep.title, status: nextStep.status, website: nextStep.website, needsApproval: nextStep.needsApproval } : null,
    requiresFreshWebsiteCheck: true,
    approvalTicketsReused: false,
    actionExecuted: false,
    note: 'Recovery is read-only: verify the website and current state again. No browser action is replayed and prior approval tickets are not reused; ask the user again before any consequential action.'
  };
}
function getTask(userId, taskId) { return { success: true, task: publicTask(ownedTask(userId, taskId)) }; }
module.exports = { createTask, updateTask, getTask, listTasks, resumeTask, STORE_FILE };
