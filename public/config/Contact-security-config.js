const TNSContactSecurityConfig = {
  appLock: { enabled: true, pinOrPassword: true, biometricOrFaceUnlockWhenSupported: true, autoLock: true, privateNotifications: true },
  chatLock: { enabled: true, hideFromNormalList: true, hidePreview: true, biometricOrPinUnlock: true, relockOnExit: true, privateNotifications: true },
  monetization: { alwaysFree: true, ads: false, premiumPayment: false, chatCharges: false, callCharges: false }
};
window.TNSContactSecurityConfig = TNSContactSecurityConfig;
