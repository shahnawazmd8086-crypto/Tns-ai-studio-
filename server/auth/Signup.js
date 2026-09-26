const {
  normalizeEmail,
  normalizeMobile,
  validateEmail,
  validateMobile,
  validatePassword,
  findUserByEmail,
  findUserByMobile,
  createUser,
  sanitizeUser
} = require('./Auth');

function validateSignupInput(input = {}) {
  const email = normalizeEmail(input.email);
  const mobile = normalizeMobile(input.mobile);
  const password = String(input.password || '');
  const name = String(input.name || '').trim();

  if (!email && !mobile) throw new Error('Email or mobile number is required.');
  if (email && !validateEmail(email)) throw new Error('Please enter a valid email address.');
  if (mobile && !validateMobile(mobile)) throw new Error('Please enter a valid mobile number in international format.');
  if (!password) throw new Error('Password is required.');
  if (!validatePassword(password)) throw new Error('Password must be at least 8 characters long.');

  return { email, mobile: mobile || null, password, name };
}

function signup(input = {}) {
  const data = validateSignupInput(input);
  if (findUserByEmail(data.email)) throw new Error('An account with this email already exists.');
  if (data.mobile && findUserByMobile(data.mobile)) throw new Error('An account with this mobile number already exists.');
  const user = createUser(data);
  return { success: true, user: sanitizeUser(user) };
}

module.exports = { validateSignupInput, signup };
