const TNSFeatureSettingsConfig = {
  main: ['Account/Profile','Language','Appearance/Theme','Notifications','Privacy & Security','Permissions','Storage/Data','Downloads & Sharing','Help & Support','About TNS Studio','Logout'],
  features: {
    aiVideo: ['aspectRatio','duration','quality','model','referenceConsistency'],
    aiImage: ['aspectRatio','resolution','style','model','variations','referenceImage'],
    editor: ['canvas','resolution','fps','timeline','autoSave','exportFormat','audio','captions'],
    aiVoice: ['language','voice','style','speed','pitch','quality'],
    contact: ['chats','calls','status','contacts','groups','privacy','notifications','media'],
    projects: ['autoSave','storage','sortOrder','backup']
  },
  item: ['chat','group','project','generatedMedia']
};
window.TNSFeatureSettingsConfig = TNSFeatureSettingsConfig;
