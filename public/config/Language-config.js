
const TNSLanguageConfig = {
  defaultLanguage: "en",

  supportedLanguages: [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      rtl: false
    },
    {
      code: "hi",
      name: "Hindi",
      nativeName: "हिन्दी",
      rtl: false
    },
    {
      code: "bn",
      name: "Bengali",
      nativeName: "বাংলা",
      rtl: false
    },
    {
      code: "te",
      name: "Telugu",
      nativeName: "తెలుగు",
      rtl: false
    },
    {
      code: "mr",
      name: "Marathi",
      nativeName: "मराठी",
      rtl: false
    },
    {
      code: "ta",
      name: "Tamil",
      nativeName: "தமிழ்",
      rtl: false
    },
    {
      code: "gu",
      name: "Gujarati",
      nativeName: "ગુજરાતી",
      rtl: false
    },
    {
      code: "kn",
      name: "Kannada",
      nativeName: "ಕನ್ನಡ",
      rtl: false
    },
    {
      code: "ml",
      name: "Malayalam",
      nativeName: "മലയാളം",
      rtl: false
    },
    {
      code: "pa",
      name: "Punjabi",
      nativeName: "ਪੰਜਾਬੀ",
      rtl: false
    },
    {
      code: "ur",
      name: "Urdu",
      nativeName: "اردو",
      rtl: true
    },
    {
      code: "es",
      name: "Spanish",
      nativeName: "Español",
      rtl: false
    },
    {
      code: "fr",
      name: "French",
      nativeName: "Français",
      rtl: false
    },
    {
      code: "de",
      name: "German",
      nativeName: "Deutsch",
      rtl: false
    },
    {
      code: "it",
      name: "Italian",
      nativeName: "Italiano",
      rtl: false
    },
    {
      code: "pt",
      name: "Portuguese",
      nativeName: "Português",
      rtl: false
    },
    {
      code: "ru",
      name: "Russian",
      nativeName: "Русский",
      rtl: false
    },
    {
      code: "ja",
      name: "Japanese",
      nativeName: "日本語",
      rtl: false
    },
    {
      code: "ko",
      name: "Korean",
      nativeName: "한국어",
      rtl: false
    },
    {
      code: "zh",
      name: "Chinese",
      nativeName: "中文",
      rtl: false
    },
    {
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      rtl: true
    },
    {
      code: "tr",
      name: "Turkish",
      nativeName: "Türkçe",
      rtl: false
    },
    {
      code: "id",
      name: "Indonesian",
      nativeName: "Bahasa Indonesia",
      rtl: false
    },
    {
      code: "vi",
      name: "Vietnamese",
      nativeName: "Tiếng Việt",
      rtl: false
    },
    {
      code: "th",
      name: "Thai",
      nativeName: "ไทย",
      rtl: false
    }
  ],

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
