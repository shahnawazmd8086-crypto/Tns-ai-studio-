const {
  normalizeEmail,
  normalizeMobile,
  validateEmail,
  validateMobile,
  findUserByEmail,
  findUserByMobile,
  verifyPassword,
  sanitizeUser
} = require("./Auth");

function validateLoginInput(input = {}) {
  const identifier = String(input.identifier || "").trim();
  const password = String(input.password || "");

  if (!identifier) {
    throw new Error("Email or mobile number is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const isEmail = identifier.includes("@");

  if (isEmail) {
    const email = normalizeEmail(identifier);

    if (!validateEmail(email)) {
      throw new Error("Please enter a valid email address.");
    }

    return {
      identifier: email,
      password
    };
  }

  const mobile = normalizeMobile(identifier);

  if (!validateMobile(mobile)) {
    throw new Error("Please enter a valid mobile number.");
  }

  return {
    identifier: mobile,
    password
  };
}

function login(input = {}) {
  const {
    identifier,
    password
  } = validateLoginInput(input);

  const isEmail = identifier.includes("@");

  const user = isEmail
    ? findUserByEmail(identifier)
    : findUserByMobile(identifier);

  if (!user) {
    throw new Error("Invalid email/mobile number or password.");
  }

  if (!verifyPassword(identifier, password)) {
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
