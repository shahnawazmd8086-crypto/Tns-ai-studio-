const crypto = require("crypto");

const jobs = new Map();


async function create(provider = "mock", input = {}) {
  const id = crypto.randomUUID();

  const job = {
    id,
    provider,
    type: "video",
    status: "queued",
    progress: 0,
    input,
    providerJob: null,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
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


async function setProgress(id, progress, status = "processing") {
  return update(id, {
    progress: Math.max(0, Math.min(100, Number(progress) || 0)),
    status
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
    error: error?.message || String(error || "Video job failed.")
  });
}


async function cancel(id) {
  return update(id, {
    status: "cancelled"
  });
}


module.exports = {
  create,
  getJob,
  update,
  setProgress,
  complete,
  fail,
  cancel
};
