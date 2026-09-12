const TNSAppConfig = {
  name: "TNS AI Studio",
  version: "1.0.0",
  environment: "development",

  app: {
    mode: "web",
    mobileFirst: true,
    supportedDevices: [
      "Android",
      "iOS",
      "Desktop"
    ],

    supportedBrowsers: [
      "Chrome",
      "Safari",
      "Firefox",
      "Edge"
    ]
  },

  media: {
    defaultQuality: "HD",
    defaultAspectRatio: "16:9",

    supportedQualities: [
      "SD",
      "HD",
      "Full HD",
      "4K"
    ],

    supportedAspectRatios: [
      "16:9",
      "9:16",
      "1:1",
      "4:5",
      "4:3"
    ]
  },

  features: {
    authentication: true,
    imageGeneration: true,
    videoGeneration: true,
    voiceGeneration: true,
    videoEditor: true,
    projects: true,
    languageSelection: true,
    mobileSupport: true,
    downloads: true,
    autoSave: true
  },

  storage: {
    localStorage: true,
    projectStorage: true,
    mediaStorage: true
  },

  security: {
    requireLogin: true,
    sessionEnabled: true,
    otpEnabled: true,
    googleLoginEnabled: true,
    mobileLoginEnabled: true
  },

  ui: {
    theme: "system",
    animations: true,
    responsive: true,
    showLoadingStates: true,
    showErrorMessages: true
  },

  limits: {
    maxProjectNameLength: 200,
    maxProjectsPerUser: 100,
    maxUploadSizeMB: 500
  },

  getFeature(
    feature
  ) {
    return Boolean(
      this.features[feature]
    );
  },

  isSupportedQuality(
    quality
  ) {
    return this.media
      .supportedQualities
      .includes(quality);
  },

  isSupportedAspectRatio(
    ratio
  ) {
    return this.media
      .supportedAspectRatios
      .includes(ratio);
  }
};


window.TNSAppConfig =
  TNSAppConfig;
