const TNSLanguageComponent = {
  state: {
    currentLanguage: "en",
    availableLanguages: []
  },

  getState() {
    return {
      ...this.state,
      availableLanguages: [
        ...this.state.availableLanguages
      ]
    };
  },

  setLanguages(languages = []) {
    if (!Array.isArray(languages)) {
      throw new Error(
        "Languages must be provided as an array."
      );
    }

    this.state.availableLanguages =
      languages
        .filter(
          (language) =>
            language &&
            typeof language === "object"
        )
        .map(
          (language) => ({
            code:
              String(
                language.code || ""
              ).trim(),

            name:
              String(
                language.name || ""
              ).trim(),

            nativeName:
              String(
                language.nativeName ||
                  language.name ||
                  ""
              ).trim(),

            rtl:
              language.rtl === true
          })
        )
        .filter(
          (language) =>
            language.code &&
            language.name
        );

    this.emitChange();

    return this.getLanguages();
  },

  setLanguage(languageCode) {
    const code =
      String(
        languageCode || ""
      ).trim();

    if (!code) {
      throw new Error(
        "Language code is required."
      );
    }

    const exists =
      this.state.availableLanguages
        .some(
          (language) =>
            language.code === code
        );

    if (
      this.state.availableLanguages
        .length > 0 &&
      !exists
    ) {
      throw new Error(
        "Selected language is not available."
      );
    }

    this.state.currentLanguage =
      code;

    this.applyDocumentLanguage();

    this.emitChange();

    return code;
  },

  getLanguage() {
    return this.state.currentLanguage;
  },

  getLanguages() {
    return [
      ...this.state.availableLanguages
    ];
  },

  getLanguageByCode(
    languageCode
  ) {
    const code =
      String(
        languageCode || ""
      ).trim();

    return (
      this.state.availableLanguages
        .find(
          (language) =>
            language.code === code
        ) || null
    );
  },

  isRTL(languageCode) {
    const language =
      this.getLanguageByCode(
        languageCode ||
          this.state.currentLanguage
      );

    return Boolean(
      language &&
      language.rtl === true
    );
  },

  applyDocumentLanguage() {
    const language =
      this.getLanguageByCode(
        this.state.currentLanguage
      );

    if (
      !document.documentElement
    ) {
      return false;
    }

    document.documentElement.lang =
      this.state.currentLanguage;

    document.documentElement.dir =
      language &&
      language.rtl === true
        ? "rtl"
        : "ltr";

    return true;
  },

  savePreference() {
    try {
      localStorage.setItem(
        "tns_ai_studio_language",
        this.state.currentLanguage
      );

      return true;
    } catch (error) {
      return false;
    }
  },

  loadPreference() {
    try {
      const saved =
        localStorage.getItem(
          "tns_ai_studio_language"
        );

      if (!saved) {
        return null;
      }

      this.state.currentLanguage =
        saved;

      this.applyDocumentLanguage();

      return saved;
    } catch (error) {
      return null;
    }
  },

  bindSelector(selector) {
    const element =
      document.querySelector(
        selector
      );

    if (!element) {
      return false;
    }

    element.value =
      this.state.currentLanguage;

    element.addEventListener(
      "change",
      (event) => {
        try {
          this.setLanguage(
            event.target.value
          );

          this.savePreference();
        } catch (error) {
          console.error(
            error.message
          );
        }
      }
    );

    return true;
  },

  reset() {
    this.state.currentLanguage =
      "en";

    this.applyDocumentLanguage();

    this.emitChange();

    return this.getState();
  },

  emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "tns:language-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSLanguageComponent =
  TNSLanguageComponent;
