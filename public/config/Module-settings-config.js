window.TNS_MODULE_SETTINGS_CONFIG = {
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
  "premium": {
    title: "Premium Settings",
    fields: { plan: ["Current","Monthly","Yearly"], renewal: "boolean", credits: ["Auto","Manual"], storage: ["Standard","High"] }
  },
  "premium-details": {title:"Premium Details Settings", fields:{notifications:"boolean"}},
  "app-settings": {title:"App Settings", fields:{autoSave:"boolean",wifiOnly:"boolean",confirmDelete:"boolean"}},
  "language-inside": {title:"Language Settings", fields:{autoDetect:"boolean"}},
  "app-icon": {title:"Brand Settings", fields:{showBrandName:"boolean"}},
  "final-edit": {title:"Final View Settings", fields:{autoplay:"boolean",showProjectSummary:"boolean"}}
};