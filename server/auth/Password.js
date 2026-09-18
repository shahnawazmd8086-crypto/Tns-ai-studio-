const {
  findUserByEmail,
  findUserByMobile,
  hashPassword,
  verifyHash,
  validatePassword
} = require('./Auth');

function validateNewPassword(password) {
  if (!validatePassword(String(password || ''))) {
    throw new Error('Password must be at least 8 characters long.');
  }
  return true;
}

function changePassword(identifier, currentPassword, newPassword) {
  const value = String(identifier || '').trim();
  const user = value.includes('@') ? findUserByEmail(value) : findUserByMobile(value);
  if (!user) throw new Error('User not found.');
  if (!verifyHash(currentPassword, user.passwordHash)) throw new Error('Current password is incorrect.');
  validateNewPassword(newPassword);

  const Auth = require('./Auth');
  Auth.updatePassword(value, newPassword);
  return { success: true, message: 'Password changed successfully.' };
}

function verifyPasswordStrength(password) {
  const value = String(password || '');
  const checks = {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecialCharacter: /[^A-Za-z0-9]/.test(value)
  };
  return { strong: Object.values(checks).every(Boolean), checks };
}

function isPasswordValid(password) { return validatePassword(String(password || '')); }

module.exports = { validateNewPassword, changePassword, verifyPasswordStrength, isPasswordValid };
