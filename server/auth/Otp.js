const crypto = require('crypto');

const otps = new Map();
const DEFAULT_EXPIRY_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 5;

function normalizeIdentifier(identifier) {
  const value = String(identifier || '').trim();
  return value.includes('@') ? value.toLowerCase() : value.replace(/[^0-9+]/g, '');
}

function generateOtp(length = 6) {
  const safeLength = Math.max(4, Math.min(8, Number(length) || 6));
  const min = 10 ** (safeLength - 1);
  const max = 10 ** safeLength;
  return String(crypto.randomInt(min, max));
}

function createOtp(identifier, expiresInMs = DEFAULT_EXPIRY_MS, maxAttempts = DEFAULT_MAX_ATTEMPTS) {
  const key = normalizeIdentifier(identifier);
  if (!key) throw new Error('Email or mobile number is required.');
  const code = generateOtp();
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(), identifier: key, code,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + Math.max(30_000, Number(expiresInMs) || DEFAULT_EXPIRY_MS)).toISOString(),
    attempts: 0, maxAttempts: Math.max(1, Number(maxAttempts) || DEFAULT_MAX_ATTEMPTS), verified: false
  };
  otps.set(key, record);
  return { id: record.id, identifier: record.identifier, expiresAt: record.expiresAt, code: record.code };
}

function getOtp(identifier) { const key = normalizeIdentifier(identifier); return key ? otps.get(key) || null : null; }

function verifyOtp(identifier, code) {
  const key = normalizeIdentifier(identifier);
  const record = getOtp(key);
  if (!record) return { success: false, message: 'OTP not found or expired.' };
  if (Date.now() >= Date.parse(record.expiresAt)) { otps.delete(key); return { success: false, message: 'OTP has expired.' }; }
  if (record.attempts >= record.maxAttempts) { otps.delete(key); return { success: false, message: 'Too many invalid OTP attempts. Please request a new OTP.' }; }

  record.attempts += 1;
  if (String(code || '').trim() !== record.code) {
    if (record.attempts >= record.maxAttempts) {
      otps.delete(key);
      return { success: false, message: 'Too many invalid OTP attempts. Please request a new OTP.' };
    }
    return { success: false, message: 'Invalid OTP.' };
  }
  record.verified = true;
  return { success: true, message: 'OTP verified successfully.' };
}

function removeOtp(identifier) { const key = normalizeIdentifier(identifier); return key ? otps.delete(key) : false; }
function clearExpiredOtps() { const now = Date.now(); let removed = 0; for (const [key, record] of otps.entries()) { if (now >= Date.parse(record.expiresAt)) { otps.delete(key); removed += 1; } } return removed; }

module.exports = { generateOtp, createOtp, getOtp, verifyOtp, removeOtp, clearExpiredOtps, normalizeIdentifier };
