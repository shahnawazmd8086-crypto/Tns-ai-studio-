const TNSEditorConfig = {
  default: {
    quality: "HD",
    aspectRatio: "16:9",
    frameRate: 30,
    audioSampleRate: 48000,
    videoCodec: "h264",
    audioCodec: "aac",
    format: "mp4"
  },

  qualityPresets: {
    SD: {
      width: 854,
      height: 480,
      bitrate: "2M"
    },

    HD: {
      width: 1280,
      height: 720,
      bitrate: "5M"
    },

    "Full HD": {
      width: 1920,
      height: 1080,
      bitrate: "8M"
    },

    "4K": {
      width: 3840,
      height: 2160,
      bitrate: "20M"
    }
  },

  aspectRatios: {
    "16:9": {
      widthRatio: 16,
      heightRatio: 9,
      label: "Landscape"
    },

    "9:16": {
      widthRatio: 9,
      heightRatio: 16,
      label: "Portrait"
    },

    "1:1": {
      widthRatio: 1,
      heightRatio: 1,
      label: "Square"
    },

    "4:5": {
      widthRatio: 4,
      heightRatio: 5,
      label: "Portrait"
    },

    "4:3": {
      widthRatio: 4,
      heightRatio: 3,
      label: "Standard"
    }
  },

  tools: {
    trim: true,
    split: true,
    crop: true,
    resize: true,
    rotate: true,
    flip: true,
    speed: true,
    volume: true,
    mute: true,
    audioFade: true,
    transitions: true,
    text: true,
    subtitles: true,
    filters: true,
    effects: true,
    images: true,
    overlays: true,
    voiceOver: true,
    music: true,
    merge: true,
    export: true
  },

  export: {
    supportedFormats: [
      "mp4",
      "webm"
    ],

    defaultFormat: "mp4",

    supportedFrameRates: [
      24,
      25,
      30,
      50,
      60
    ],

    maxDurationSeconds: 3600,

    preserveQuality: true,

    includeAudio: true
  },

  timeline: {
    minimumClipDuration: 0.1,
    defaultTransitionDuration: 0.5,
    snapToTimeline: true,
    allowOverlappingTracks: true,
    maximumTracks: 32
  },

  ai: {
    sceneGeneration: true,
    scriptToVideo: true,
    scriptToImage: true,
    characterConsistency: true,
    longVideo: true,
    automaticSceneStitching: true
  },

  getQualityPreset(
    quality
  ) {
    return (
      this.qualityPresets[
        quality
      ] ||
      this.qualityPresets.HD
    );
  },

  getAspectRatio(
    ratio
  ) {
    return (
      this.aspectRatios[
        ratio
      ] ||
      this.aspectRatios["16:9"]
    );
  },

  isToolEnabled(tool) {
    return Boolean(
      this.tools[tool]
    );
  },

  isFormatSupported(format) {
    return this.export
      .supportedFormats
      .includes(
        String(format || "")
          .toLowerCase()
      );
  }
};


window.TNSEditorConfig =
  TNSEditorConfig;
