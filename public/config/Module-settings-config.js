window.TNS_MODULE_SETTINGS_CONFIG = {
  "ai-video": {
    title: "AI Video Settings",
    fields: {
      defaultWorkflow: ["Script → Video","Single Scene","Multi-Scene Story","Image → Video","Upload & Animate","Storyboard → Video"],
      duration: ["5","10","15","30","60","120"],
      quality: ["HD","Full HD","2K","4K"],
      defaultStyle: ["Photorealistic","Cinematic","Realistic Smartphone","Anime","3D Animation"],
      autoSave: "boolean",
      characterConsistency: ["Standard","Locked Character","Reference Character"],
      audio: ["None","AI Voice","Voice + Music","Voice + Music + SFX"]
    }
  },
  "ai-image": {
    title: "AI Image Settings",
    fields: {
      defaultStyle: ["Photorealistic","Cinematic","Illustration","Anime","3D"],
      aspectRatio: ["9:16","16:9","1:1","4:5","4:3"],
      quality: ["HD","Full HD","2K","4K"],
      variations: ["1","2","4"],
      autoSave: "boolean",
      characterConsistency: ["Standard","Locked Character","Reference Character"]
    }
  },
  "edit-video": {
    title: "Edit Video Settings",
    fields: {
      autoSave: "boolean",
      previewQuality: ["Auto","720p","1080p","2K"],
      timelineMode: ["Simple","Pro","Compact"],
      timelineSnap: "boolean",
      rippleEditing: "boolean",
      confirmDelete: "boolean",
      showSafeZones: "boolean",
      showAudioMeters: "boolean",
      defaultAspectRatio: ["9:16","16:9","1:1","4:5"],
      exportQuality: ["720","1080","1440","2160"],
      frameRate: ["24","30","60"],
      exportFormat: ["MP4","MOV"],
      audioDefault: ["AAC 192k","AAC 320k","Original"],
      hardwareAcceleration: "boolean",
      proxyPreview: "boolean",
      autoRecover: "boolean",
      keepVersionHistory: "boolean",
      reduceMotion: "boolean"
    }
  },
  "contact": {
    title: "TNS Contact Settings",
    fields: {
      notifications: "boolean",
      privateNotifications: "boolean",
      chatLock: "boolean",
      hiddenChats: "boolean",
      mediaAutoDownload: ["Wi‑Fi","Wi‑Fi + Mobile","Off"],
      callPrivacy: ["Everyone","Contacts","Nobody"],
      readReceipts: "boolean",
      typingIndicators: "boolean",
      autoSaveMedia: "boolean"
    }
  },
  "projects": {
    title: "Projects Settings",
    fields: {
      autoSave: "boolean",
      cloudSync: "boolean",
      privacy: ["Private","Shared"],
      defaultFormat: ["9:16","16:9","1:1"],
      projectVersions: "boolean"
    }
  },
  "tns-ai": {
    title: "TNS AI Settings",
    fields: {
      history: "boolean",
      voiceMode: "boolean",
      fileUnderstanding: "boolean",
      imageUnderstanding: "boolean",
      researchMode: "boolean",
      responseLanguage: ["Auto","English","Hindi","Kannada"],
      speechOutput: "boolean",
      saveConversations: "boolean"
    }
  },
  "tns-ai-voice": {
    title: "TNS AI Voice Settings",
    fields: {
      language: ["Auto","English","Hindi","Kannada"],
      voice: ["Default","Male","Female","Narrator"],
      speed: ["0.75x","1x","1.25x","1.5x","2x"],
      quality: ["Standard","HD"],
      autoSpeak: "boolean"
    }
  },
  "help": {
    title: "Help & Support Settings",
    fields: { tips: "boolean", notifications: "boolean", diagnostics: "boolean" }
  },
  "premium": {
    title: "Premium Settings",
    fields: { plan: ["Current","Monthly","Yearly"], renewal: "boolean", credits: ["Auto","Manual"], storage: ["Standard","High"] }
  },
  "premium-details": {title:"Premium Details Settings", fields:{notifications:"boolean"}},
  "app-settings": {title:"App Settings", fields:{autoSave:"boolean",wifiOnly:"boolean",confirmDelete:"boolean"}},
  "language-inside": {title:"Language Settings", fields:{autoDetect:"boolean"}},
  "contact-inside": {title:"TNS Contact Privacy Settings", fields:{privateNotifications:"boolean",chatLock:"boolean",hiddenChats:"boolean"}},
  "editor-tools": {title:"Editor Tools Settings", fields:{showAdvanced:"boolean",confirmDestructive:"boolean",autoSave:"boolean"}},
  "export-video": {title:"Export Settings", fields:{quality:["720","1080","1440","2160"],fps:["24","30","60"],format:["MP4","MOV","WebM"],audio:["AAC 192k","AAC 320k"]}},
  "app-icon": {title:"Brand Settings", fields:{showBrandName:"boolean"}},
  "final-edit": {title:"Final View Settings", fields:{autoplay:"boolean",showProjectSummary:"boolean"}}
};