const crypto = require("crypto");

const jobs = new Map();


async function create(provider = "mock", input = {}) {
  const id = crypto.randomUUID();

  const now = new Date().toISOString();

  const job = {
    id,
    provider,
    type: "voice",
    status: "queued",
    progress: 0,
    input,
    providerJob: null,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now
  };

  jobs.set(id, job);

  return job;
}


async function getJob(id) {
  return jobs.get(id) || null;
}


async function update(id, patch = {}) {
  const job = jobs.get(id);

  if (!job) {
    return null;
  }

  Object.assign(job, patch, {
    updatedAt: new Date().toISOString()
  });

  return job;
}


async function setProgress(
  id,
  progress,
  status = "processing"
) {
  const safeProgress = Math.max(
    0,
    Math.min(
      100,
      Number(progress) || 0
    )
  );

  return update(id, {
    progress: safeProgress,
    status
  });
}


async function start(id) {
  return update(id, {
    status: "processing",
    progress: 1,
    error: null
  });
}


async function complete(id, result = {}) {
  return update(id, {
    status: "completed",
    progress: 100,
    result,
    error: null
  });
}


async function fail(id, error) {
  return update(id, {
    status: "failed",
    error:
      error?.message ||
      String(error || "Voice job failed.")
  });
}


async function cancel(id) {
  return update(id, {
    status: "cancelled"
  });
}


async function remove(id) {
  return jobs.delete(id);
}


async function list() {
  return Array.from(jobs.values());
}


module.exports = {
  create,
  getJob,
  update,
  setProgress,
  start,
  complete,
  fail,
  cancel,
  remove,
  list
};
