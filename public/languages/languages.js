const TNSLanguages = {
  defaultLanguage: "en",

  languages: {
    en: {
      code: "en",
      name: "English",
      nativeName: "English",
      direction: "ltr",
      file: "/languages/en.js"
    },

    hi: {
      code: "hi",
      name: "Hindi",
      nativeName: "हिन्दी",
      direction: "ltr",
      file: "/languages/hi.js"
    }
  },

  getLanguage(code) {
    const languageCode =
      String(code || "").trim().toLowerCase();

    return (
      this.languages[languageCode] ||
      null
    );
  },

  getAllLanguages() {
    return Object.values(
      this.languages
    );
  },

  isSupported(code) {
    return Boolean(
      this.getLanguage(code)
    );
  },

  getDefaultLanguage() {
    return this.defaultLanguage;
  },

  getDirection(code) {
    const language =
      this.getLanguage(code);

    return language
      ? language.direction
      : "ltr";
  },

  getFile(code) {
    const language =
      this.getLanguage(code);

    return language
      ? language.file
      : null;
  },

  setDefaultLanguage(code) {
    if (!this.isSupported(code)) {
      return false;
    }

    this.defaultLanguage =
      String(code)
        .trim()
        .toLowerCase();

    return true;
  }
};

window.TNSLanguages =
  TNSLanguages;
