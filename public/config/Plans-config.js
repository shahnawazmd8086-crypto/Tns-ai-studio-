// Central monetization/entitlement configuration. Prices are product defaults, not payment-provider integration.
const TNSPlansConfig = {
  free: { ads: true, premiumFeatures: false },
  premium: { ads: false, premiumFeatures: true, indiaTargetMonthlyINR: 199, indiaTargetYearlyINR: 1499 },
  ai: { video: { free: true, ads: true, premium: true }, voice: { free: true, ads: true, premium: true }, editor: { free: true, ads: true, premium: true } },
  pricing: { model: 'regional', indiaAffordableTarget: true, internationalLocalized: true },
  credits: { enabled: true, centrallyConfigured: true }
};
window.TNSPlansConfig = TNSPlansConfig;
