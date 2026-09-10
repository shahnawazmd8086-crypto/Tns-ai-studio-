// TNS AI Studio - Video Job Manager

const crypto = require("crypto");

const jobs = new Map();

async function create(provider, input = {}) {
  const id = crypto.randomUUID();

  const job = {
    id,
    provider: provider || "mock",
    status: "queued",
    input,
    createdAt: new Date().toISOString()
  };

  jobs.set(id, job);

  return job;
}

async function getJob(id) {
  return jobs.get(id) || null;
}

module.exports = {
  create,
  getJob
};
