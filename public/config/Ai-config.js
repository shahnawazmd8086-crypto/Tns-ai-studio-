const TNSAIConfig = {
  appName: "TNS",

  defaultProvider: "mock",

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

    voice: {
      enabled: true,
      providers: []
    }
  },

  features: { voiceGeneration: true },

  limits: { maxVoiceTextLength: 50000 },

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
