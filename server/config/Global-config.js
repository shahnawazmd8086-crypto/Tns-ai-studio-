const TNSGlobalConfig = {
  brand: { name: 'TNS', origin: 'India', audience: 'worldwide' },
  auth: { minimumPasswordLength: 8, sessionTimeoutMinutes: 1440, mobileFormat: 'E.164' },
  monetization: { indiaPremiumTargetINR: 99, regionalPricing: true },
  security: { noPlaintextPasswords: true, httpOnlySessions: true, secureCookiesInProduction: true, rateLimitEnabled: true },
  production: { realOtpProviderRequired: true, persistentDatabaseRequired: true, realAiProvidersRequired: true }
};
module.exports = TNSGlobalConfig;
