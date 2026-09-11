const crypto = require("crypto");

const jobs = new Map();


async function create(provider = "mock", input = {}) {
  const id = crypto.randomUUID();

  const job = {
    id,
    provider,
    type: "image",
    status: "queued",
    progress: 0,
    input,
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


module.exports = {
  create,
  getJob,
  update
};
