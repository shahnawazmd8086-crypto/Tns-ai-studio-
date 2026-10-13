const TNSSecurityConfig = {
  requireLogin: true,

  authentication: {
    email: true,
    google: true,
    mobile: true,
    password: true,
    otp: true
  },

  password: {
    minimumLength: 8,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSpecialCharacter: false
  },

  session: {
    enabled: true,
    rememberMe: true,
    timeoutMinutes: 1440
  },

  otp: {
    enabled: true,
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 5
  },

  uploads: {
    enabled: true,
    maxSizeMB: 500,
    allowImages: true,
    allowVideos: true,
    allowAudio: true
  },

  api: {
    timeoutMilliseconds: 120000,
    rateLimitEnabled: true,
    maxRequestsPerMinute: 120
  },

  headers: {
    contentSecurityPolicy: true,
    frameProtection: true,
    noSniff: true,
    referrerPolicy: true
  },

  storage: {
    secureProjectStorage: true,
    secureMediaStorage: true,
    validateFileNames: true
  },

  production: {
    httpsRequired: true,
    persistentDatabaseRequired: true,
    securePasswordHashRequired: true,
    secureSessionRequired: true,
    realOtpProviderRequired: true
  },

  isPasswordStrong(password) {
    return typeof password === 'string' && password.length >= this.password.minimumLength;
  },

  isUploadSizeAllowed(sizeInBytes) {
    if (
      typeof sizeInBytes !== "number" ||
      sizeInBytes < 0
    ) {
      return false;
    }

    const maxBytes =
      this.uploads.maxSizeMB *
      1024 *
      1024;

    return sizeInBytes <= maxBytes;
  },

  getSessionTimeoutMilliseconds() {
    return (
      this.session.timeoutMinutes *
      60 *
      1000
    );
  }
};


window.TNSSecurityConfig =
  TNSSecurityConfig;
