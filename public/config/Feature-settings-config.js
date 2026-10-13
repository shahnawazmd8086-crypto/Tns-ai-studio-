const TNSFeatureSettingsConfig = {
  main: ['Language','Appearance/Theme','Storage/Data','Help & Support','About TNS Studio','Logout'],
  features: {
    aiVideo: ['aspectRatio','duration','quality','model','referenceConsistency'],
    editor: ['canvas','resolution','fps','timeline','autoSave','exportFormat','audio','captions'],
    projects: ['autoSave','storage','sortOrder','backup']
  },
  item: ['chat','group','project','generatedMedia']
};
window.TNSFeatureSettingsConfig = TNSFeatureSettingsConfig;
