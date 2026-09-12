const {
  createUser,
  normalizeEmail,
  findUserByEmail,
  validatePassword
} = require("./Auth");


function validateSignupInput(input = {}) {
  const email = normalizeEmail(input.email);
  const password = String(input.password || "");

  if (!email) {
    throw new Error("Email is required.");
  }

  if (!validatePassword(password)) {
    throw new Error(
      "Password must be at least 8 characters long."
    );
  }

  return {
    email,
    password
  };
}


function signup(input = {}) {
  const {
    email,
    password
  } = validateSignupInput(input);

  if (findUserByEmail(email)) {
    throw new Error("User already exists.");
  }

  const user = createUser({
    email,
    password
  });

  return {
    success: true,
    user
  };
}


function isEmailAvailable(email) {
  const normalizedEmail =
    normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return !findUserByEmail(
    normalizedEmail
  );
}


module.exports = {
  validateSignupInput,
  signup,
  isEmailAvailable
};
