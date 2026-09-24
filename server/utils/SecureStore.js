const crypto = require('crypto');

function getKey() {
  const raw = String(process.env.TNS_DATA_ENCRYPTION_KEY || '');
  if (!raw) {
    if (process.env.NODE_ENV === 'production') throw new Error('TNS_DATA_ENCRYPTION_KEY is required in production.');
    return null;
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) throw new Error('TNS_DATA_ENCRYPTION_KEY must be 64 hexadecimal characters.');
  return Buffer.from(raw, 'hex');
}

function encode(value) {
  const key = getKey();
  const json = JSON.stringify(value);
  if (!key) return json;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ version: 1, alg: 'AES-256-GCM', iv: iv.toString('base64'), tag: tag.toString('base64'), data: encrypted.toString('base64') });
}

function decode(raw) {
  const key = getKey();
  if (!key) return JSON.parse(raw);
  const envelope = JSON.parse(raw);
  if (!envelope || envelope.version !== 1 || envelope.alg !== 'AES-256-GCM') throw new Error('Unsupported secure data format.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.data, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext);
}

module.exports = { encode, decode };
