
const TNSLanguageConfig = {
  defaultLanguage: "en",

  supportedLanguages: (window.TNSLanguageRegistry || []).map((language) => ({ code: language.code, name: language.name, nativeName: language.nativeName, rtl: language.rtl })),


  getLanguage(code) {
    const languageCode =
      String(code || "").trim();

    return (
      this.supportedLanguages.find(
        (language) =>
          language.code ===
          languageCode
      ) || null
    );
  },

  getAllLanguages() {
    return [
      ...this.supportedLanguages
    ];
  },

  isSupported(code) {
    return Boolean(
      this.getLanguage(code)
    );
  },

  isRTL(code) {
    const language =
      this.getLanguage(code);

    return Boolean(
      language &&
      language.rtl === true
    );
  },

  getNativeName(code) {
    const language =
      this.getLanguage(code);

    return language
      ? language.nativeName
      : null;
  },

  getDisplayName(code) {
    const language =
      this.getLanguage(code);

    return language
      ? language.name
      : null;
  }
};


window.TNSLanguageConfig =
  TNSLanguageConfig;
