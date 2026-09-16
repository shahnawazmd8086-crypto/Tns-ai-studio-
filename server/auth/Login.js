const {
  normalizeEmail,
  normalizeMobile,
  validateEmail,
  validateMobile,
  validatePassword,
  findUserByEmail,
  findUserByMobile,
  verifyPassword,
  sanitizeUser
} = require("./Auth");

function validateLoginInput(input = {}) {
  const identifier = String(input.identifier || input.email || input.mobile || "").trim();
  const password = String(input.password || "");

  if (!identifier) {
    throw new Error("Email or mobile number is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (!validatePassword(password)) {
    throw new Error("Password must be at least 8 characters.");
  }

  const isEmail = identifier.includes("@");
  const normalized = isEmail ? normalizeEmail(identifier) : normalizeMobile(identifier);

  if (isEmail && !validateEmail(normalized)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!isEmail && !validateMobile(normalized)) {
    throw new Error("Please enter a valid mobile number.");
  }

  return {
    identifier: normalized,
    password
  };
}

function login(input = {}) {
  const { identifier, password } = validateLoginInput(input);
  const isEmail = identifier.includes("@");
  const user = isEmail ? findUserByEmail(identifier) : findUserByMobile(identifier);

  if (!user || !verifyPassword(identifier, password)) {
    throw new Error("Invalid email/mobile number or password.");
  }

  return {
    success: true,
    user: sanitizeUser(user)
  };
}

function canLogin(input = {}) {
  try {
    login(input);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  validateLoginInput,
  login,
  canLogin
};
