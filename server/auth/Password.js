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
  return { strong: value.length >= 8, checks: { minLength: value.length >= 8 } };
}

function isPasswordValid(password) { return validatePassword(String(password || '')); }

module.exports = { validateNewPassword, changePassword, verifyPasswordStrength, isPasswordValid };
