const {
  normalizeEmail,
  findUserByEmail,
  verifyPassword,
  sanitizeUser
} = require("./Auth");


function validateLoginInput(input = {}) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  return {
    email,
    password
  };
}


function login(input = {}) {
  const {
    email,
    password
  } = validateLoginInput(input);

  const user = findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (!verifyPassword(email, password)) {
    throw new Error("Invalid email or password.");
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
