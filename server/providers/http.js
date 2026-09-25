async function callJson(url, apiKey, payload, timeoutMs = 120000, method = 'POST') {
  if (!url) throw new Error('Provider endpoint is not configured.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(5000, Number(timeoutMs) || 120000));
  try {
    const headers = { Accept: 'application/json' };
    if (method !== 'GET') headers['Content-Type'] = 'application/json';
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetch(url, {
      method,
      headers,
      ...(method === 'GET' ? {} : { body: JSON.stringify(payload) }),
      signal: controller.signal
    });
    const text = await response.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(data.error || data.message || `Provider request failed (${response.status}).`);
    return data;
  } finally { clearTimeout(timer); }
}

function providerJobId(providerJob) {
  return providerJob?.id || providerJob?.jobId || providerJob?.job_id || providerJob?.requestId || providerJob?.request_id || null;
}

function statusTemplate(type) {
  return process.env[`TNS_${String(type).toUpperCase()}_PROVIDER_STATUS_URL`] || '';
}

function buildStatusUrl(type, providerJob) {
  const id = providerJobId(providerJob);
  const configured = statusTemplate(type);
  const returned = providerJob?.statusUrl || providerJob?.status_url || null;
  const template = returned || configured;
  if (!template || !id) return null;
  return template.replaceAll('{jobId}', encodeURIComponent(String(id))).replaceAll('{id}', encodeURIComponent(String(id)));
}

class HttpProvider {
  constructor(options = {}) {
    this.name = options.name || 'http';
    this.videoUrl = options.videoUrl || process.env.TNS_VIDEO_PROVIDER_URL;
    this.imageUrl = options.imageUrl || process.env.TNS_IMAGE_PROVIDER_URL;
    this.voiceUrl = options.voiceUrl || process.env.TNS_VOICE_PROVIDER_URL;
    this.apiKey = options.apiKey || process.env.TNS_AI_PROVIDER_API_KEY || '';
    this.timeoutMs = Number(options.timeoutMs || process.env.TNS_AI_PROVIDER_TIMEOUT_MS || 120000);
  }
  async create(input = {}) { return callJson(this.videoUrl, this.apiKey, { type: 'video', ...input }, this.timeoutMs); }
  async createImage(input = {}) { return callJson(this.imageUrl, this.apiKey, { type: 'image', ...input }, this.timeoutMs); }
  async createVoice(input = {}) { return callJson(this.voiceUrl, this.apiKey, { type: 'voice', ...input }, this.timeoutMs); }
  async getStatus(type, providerJob) {
    const url = buildStatusUrl(type, providerJob);
    if (!url) return providerJob || { status: 'processing' };
    return callJson(url, this.apiKey, null, this.timeoutMs, 'GET');
  }
}

module.exports = HttpProvider;
