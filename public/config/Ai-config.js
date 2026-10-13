const TNSAIConfig = {
  appName: "TNS Studio",

  defaultProvider: "mock",

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
    videoGeneration: true,
    voiceGeneration: true,
    realisticGeneration: true,
    scriptToVideo: true,
    longVideo: true,
    sceneGeneration: true,
    characterConsistency: true,
    hdExport: true,
    fullHdExport: true,
    fourKExport: true
  },

  limits: {
    maxVideoPromptLength: 20000,
    maxVoiceTextLength: 50000,
    maxVideoDuration: 3600
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
