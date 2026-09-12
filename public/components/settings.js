const TNSSettingsComponent = {
  STORAGE_KEY:
    "tns_ai_studio_settings",

  defaults: {
    theme: "system",
    language: "en",
    quality: "HD",
    autoSave: true,
    notifications: true,
    soundEffects: true,
    defaultAspectRatio: "16:9"
  },

  state: {},

  init() {
    this.state = {
      ...this.defaults
    };

    this.load();

    return this.getState();
  },

  getState() {
    return {
      ...this.state
    };
  },

  get(key) {
    if (
      !Object.prototype.hasOwnProperty.call(
        this.state,
        key
      )
    ) {
      return undefined;
    }

    return this.state[key];
  },

  set(key, value) {
    if (
      !Object.prototype.hasOwnProperty.call(
        this.defaults,
        key
      )
    ) {
      throw new Error(
        `Unknown setting: ${key}`
      );
    }

    this.state[key] = value;

    this.save();

    this.emitChange();

    return value;
  },

  update(settings = {}) {
    Object.keys(settings).forEach(
      (key) => {
        if (
          Object.prototype.hasOwnProperty.call(
            this.defaults,
            key
          )
        ) {
          this.state[key] =
            settings[key];
        }
      }
    );

    this.save();

    this.emitChange();

    return this.getState();
  },

  save() {
    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(
          this.state
        )
      );

      return true;
    } catch (error) {
      return false;
    }
  },

  load() {
    try {
      const saved =
        localStorage.getItem(
          this.STORAGE_KEY
        );

      if (!saved) {
        return this.getState();
      }

      const parsed =
        JSON.parse(saved);

      if (
        parsed &&
        typeof parsed ===
          "object"
      ) {
        this.state = {
          ...this.defaults,
          ...parsed
        };
      }

      return this.getState();
    } catch (error) {
      this.state = {
        ...this.defaults
      };

      return this.getState();
    }
  },

  reset() {
    this.state = {
      ...this.defaults
    };

    this.save();

    this.emitChange();

    return this.getState();
  },

  setTheme(theme) {
    const allowedThemes = [
      "system",
      "light",
      "dark"
    ];

    if (
      !allowedThemes.includes(
        theme
      )
    ) {
      throw new Error(
        "Invalid theme."
      );
    }

    return this.set(
      "theme",
      theme
    );
  },

  setQuality(quality) {
    const allowedQualities = [
      "SD",
      "HD",
      "Full HD",
      "4K"
    ];

    if (
      !allowedQualities.includes(
        quality
      )
    ) {
      throw new Error(
        "Invalid quality."
      );
    }

    return this.set(
      "quality",
      quality
    );
  },

  setAspectRatio(
    aspectRatio
  ) {
    const allowedRatios = [
      "16:9",
      "9:16",
      "1:1",
      "4:5",
      "4:3"
    ];

    if (
      !allowedRatios.includes(
        aspectRatio
      )
    ) {
      throw new Error(
        "Invalid aspect ratio."
      );
    }

    return this.set(
      "defaultAspectRatio",
      aspectRatio
    );
  },

  setAutoSave(enabled) {
    return this.set(
      "autoSave",
      Boolean(enabled)
    );
  },

  setNotifications(enabled) {
    return this.set(
      "notifications",
      Boolean(enabled)
    );
  },

  setSoundEffects(enabled) {
    return this.set(
      "soundEffects",
      Boolean(enabled)
    );
  },

  emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "tns:settings-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


TNSSettingsComponent.init();

window.TNSSettingsComponent =
  TNSSettingsComponent;
