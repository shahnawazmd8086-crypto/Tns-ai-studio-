const crypto = require("crypto");


const otps = new Map();


function normalizeIdentifier(identifier) {
  return String(identifier || "")
    .trim()
    .toLowerCase();
}


function generateOtp(length = 6) {
  const safeLength = Math.max(
    4,
    Math.min(8, Number(length) || 6)
  );

  const min = 10 ** (safeLength - 1);
  const max = 10 ** safeLength;

  return String(
    crypto.randomInt(min, max)
  );
}


function createOtp(
  identifier,
  expiresInMs = 5 * 60 * 1000
) {
  const key = normalizeIdentifier(identifier);

  if (!key) {
    throw new Error(
      "Email or mobile number is required."
    );
  }

  const code = generateOtp();

  const now = Date.now();

  const record = {
    id: crypto.randomUUID(),
    identifier: key,
    code,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(
      now + expiresInMs
    ).toISOString(),
    attempts: 0,
    verified: false
  };

  otps.set(key, record);

  return {
    id: record.id,
    identifier: record.identifier,
    expiresAt: record.expiresAt
  };
}


function getOtp(identifier) {
  const key = normalizeIdentifier(identifier);

  if (!key) {
    return null;
  }

  return otps.get(key) || null;
}


function verifyOtp(
  identifier,
  code
) {
  const key = normalizeIdentifier(identifier);
  const record = getOtp(key);

  if (!record) {
    return {
      success: false,
      message: "OTP not found or expired."
    };
  }

  if (Date.now() >= Date.parse(record.expiresAt)) {
    otps.delete(key);

    return {
      success: false,
      message: "OTP has expired."
    };
  }

  record.attempts += 1;

  if (
    String(code || "").trim() !==
    record.code
  ) {
    return {
      success: false,
      message: "Invalid OTP."
    };
  }

  record.verified = true;

  return {
    success: true,
    message: "OTP verified successfully."
  };
}


function removeOtp(identifier) {
  const key = normalizeIdentifier(identifier);

  if (!key) {
    return false;
  }

  return otps.delete(key);
}


function clearExpiredOtps() {
  const now = Date.now();
  let removed = 0;

  for (const [key, record] of otps.entries()) {
    if (
      now >= Date.parse(record.expiresAt)
    ) {
      otps.delete(key);
      removed += 1;
    }
  }

  return removed;
}


module.exports = {
  generateOtp,
  createOtp,
  getOtp,
  verifyOtp,
  removeOtp,
  clearExpiredOtps
};
