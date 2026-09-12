const TNSEditorComponent = {
  state: {
    currentProjectId: null,
    timeline: [],
    selectedItemId: null,
    isPlaying: false,
    currentTime: 0
  },

  getState() {
    return {
      ...this.state,
      timeline: [...this.state.timeline]
    };
  },

  setProject(projectId) {
    this.state.currentProjectId =
      projectId || null;

    return this.state.currentProjectId;
  },

  addItem(item = {}) {
    const newItem = {
      id:
        item.id ||
        `editor-item-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      type:
        item.type ||
        "video",

      name:
        item.name ||
        "Untitled Item",

      src:
        item.src ||
        "",

      start:
        Number(item.start) || 0,

      duration:
        Number(item.duration) || 0,

      trim
