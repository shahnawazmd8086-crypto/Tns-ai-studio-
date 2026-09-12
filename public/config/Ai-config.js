const TNSAIConfig = {
  appName: "TNS AI Studio",

  defaultProvider: "mock",

  image: {
    enabled: true,
    endpoint: "/api/image/jobs",
    defaultStyle: "realistic",
    defaultQuality: "HD",
    defaultAspectRatio: "16:9"
  },

  video: {
    enabled: true,
    endpoint: "/api/video/jobs",
    defaultStyle: "realistic",
    defaultQuality: "HD",
    defaultAspectRatio: "16:9",
    defaultDuration: 10
  },

  voice: {
    enabled: true,
    endpoint: "/api/voice/jobs",
    defaultLanguage: "en",
    defaultSpeed: 1,
    defaultPitch: 1,
    defaultVolume: 1
  },

  providers: {
    mock: {
      enabled: true,
      name: "Mock Provider",
      type: "development"
    },

    image: {
      enabled: true,
      providers: []
    },

    video: {
      enabled: true,
      providers: []
    },

    voice: {
      enabled: true,
      providers: []
    }
  },

  features: {
    imageGeneration: true,
    videoGeneration: true,
    voiceGeneration: true,
    realisticGeneration: true,
    scriptToImage: true,
    scriptToVideo: true,
    longVideo: true,
    sceneGeneration: true,
    characterConsistency: true,
    hdExport: true,
    fullHdExport: true,
    fourKExport: true
  },

  limits: {
    maxImagePromptLength: 10000,
    maxVideoPromptLength: 20000,
    maxVoiceTextLength: 50000,
    maxVideoDuration: 3600
  },

  getImageConfig() {
    return {
      ...this.image
    };
  },

  getVideoConfig() {
    return {
      ...this.video
    };
  },

  getVoiceConfig() {
    return {
      ...this.voice
    };
  },

  getProvider(type) {
    const group =
      this.providers[type];

    if (!group) {
      return null;
    }

    return {
      ...group
    };
  },

  isFeatureEnabled(
    feature
  ) {
    return Boolean(
      this.features[feature]
    );
  }
};


window.TNSAIConfig =
  TNSAIConfig;
