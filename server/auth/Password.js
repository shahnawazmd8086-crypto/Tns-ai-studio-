const {
  findUserByEmail,
  hashPassword,
  validatePassword
} = require("./Auth");


function validateNewPassword(password) {
  if (!validatePassword(password)) {
    throw new Error(
      "Password must be at least 8 characters long."
    );
  }

  return true;
}


function changePassword(
  email,
  currentPassword,
  newPassword
) {
  const user = findUserByEmail(email);

  if (!user) {
    throw new Error("User not found.");
  }

  if (
    user.passwordHash !==
    hashPassword(currentPassword)
  ) {
    throw new Error(
      "Current password is incorrect."
    );
  }

  validateNewPassword(newPassword);

  user.passwordHash =
    hashPassword(newPassword);

  user.updatedAt =
    new Date().toISOString();

  return {
    success: true,
    message: "Password changed successfully."
  };
}


function verifyPasswordStrength(password) {
  const value = String(password || "");

  const checks = {
    minLength: value.length >= 8,
    hasUppercase: /[A-Z]/.test(value),
    hasLowercase: /[a-z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecialCharacter:
      /[^A-Za-z0-9]/.test(value)
  };

  const strong =
    Object.values(checks).every(Boolean);

  return {
    strong,
    checks
  };
}


function isPasswordValid(password) {
  return verifyPasswordStrength(password).strong;
}


module.exports = {
  validateNewPassword,
  changePassword,
  verifyPasswordStrength,
  isPasswordValid
};
