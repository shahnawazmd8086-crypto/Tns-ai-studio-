const {
  normalizeEmail,
  normalizeMobile,
  validateEmail,
  validateMobile,
  findUserByEmail,
  findUserByMobile,
  createUser,
  sanitizeUser
} = require("./Auth");

function validateSignupInput(input = {}) {
  const email = normalizeEmail(input.email);
  const mobile = normalizeMobile(input.mobile);
  const password = String(input.password || "");
  const name = String(input.name || "").trim();

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!validateEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!mobile) {
    throw new Error("Mobile number is required.");
  }

  if (!validateMobile(mobile)) {
    throw new Error("Please enter a valid mobile number.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  return {
    email,
    mobile,
    password,
    name
  };
}

function signup(input = {}) {
  const {
    email,
    mobile,
    password,
    name
  } = validateSignupInput(input);

  if (findUserByEmail(email)) {
    throw new Error("An account with this email already exists.");
  }

  if (findUserByMobile(mobile)) {
    throw new Error("An account with this mobile number already exists.");
  }

  const user = createUser({
    email,
    mobile,
    password,
    name
  });

  return {
    success: true,
    user: sanitizeUser(user)
  };
}

module.exports = {
  validateSignupInput,
  signup
};
