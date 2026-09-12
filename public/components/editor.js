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

      trimStart:
        Number(item.trimStart) || 0,

      trimEnd:
        Number(item.trimEnd) || 0,

      volume:
        typeof item.volume === "number"
          ? item.volume
          : 1,

      muted:
        item.muted === true,

      visible:
        item.visible !== false,

      locked:
        item.locked === true
    };

    this.state.timeline.push(
      newItem
    );

    this.state.selectedItemId =
      newItem.id;

    this.emitChange();

    return newItem;
  },

  updateItem(itemId, updates = {}) {
    const index =
      this.state.timeline.findIndex(
        (item) =>
          item.id === itemId
      );

    if (index === -1) {
      return null;
    }

    this.state.timeline[index] = {
      ...this.state.timeline[index],
      ...updates,
      id:
        this.state.timeline[index].id
    };

    this.emitChange();

    return this.state.timeline[index];
  },

  removeItem(itemId) {
    const oldLength =
      this.state.timeline.length;

    this.state.timeline =
      this.state.timeline.filter(
        (item) =>
          item.id !== itemId
      );

    if (
      this.state.selectedItemId ===
      itemId
    ) {
      this.state.selectedItemId =
        null;
    }

    const removed =
      this.state.timeline.length !==
      oldLength;

    if (removed) {
      this.emitChange();
    }

    return removed;
  },

  selectItem(itemId) {
    const item =
      this.state.timeline.find(
        (entry) =>
          entry.id === itemId
      );

    if (!item) {
      return null;
    }

    this.state.selectedItemId =
      itemId;

    this.emitChange();

    return item;
  },

  getSelectedItem() {
    if (
      !this.state.selectedItemId
    ) {
      return null;
    }

    return (
      this.state.timeline.find(
        (item) =>
          item.id ===
          this.state.selectedItemId
      ) || null
    );
  },

  clearTimeline() {
    this.state.timeline = [];
    this.state.selectedItemId =
      null;
    this.state.currentTime = 0;
    this.state.isPlaying = false;

    this.emitChange();

    return true;
  },

  play() {
    this.state.isPlaying = true;

    this.emitChange();

    return true;
  },

  pause() {
    this.state.isPlaying = false;

    this.emitChange();

    return true;
  },

  togglePlay() {
    this.state.isPlaying =
      !this.state.isPlaying;

    this.emitChange();

    return this.state.isPlaying;
  },

  seek(time) {
    const safeTime =
      Number(time);

    if (
      !Number.isFinite(safeTime) ||
      safeTime < 0
    ) {
      return false;
    }

    this.state.currentTime =
      safeTime;

    this.emitChange();

    return true;
  },

  setVolume(itemId, volume) {
    const safeVolume =
      Math.max(
        0,
        Math.min(
          1,
          Number(volume)
        )
      );

    if (
      !Number.isFinite(
        safeVolume
      )
    ) {
      return false;
    }

    return Boolean(
      this.updateItem(
        itemId,
        {
          volume:
            safeVolume,
          muted:
            safeVolume === 0
        }
      )
    );
  },

  muteItem(itemId, muted = true) {
    return Boolean(
      this.updateItem(
        itemId,
        {
          muted:
            muted === true
        }
      )
    );
  },

  trimItem(
    itemId,
    trimStart = 0,
    trimEnd = 0
  ) {
    const start =
      Math.max(
        0,
        Number(trimStart) || 0
      );

    const end =
      Math.max(
        0,
        Number(trimEnd) || 0
      );

    return this.updateItem(
      itemId,
      {
        trimStart: start,
        trimEnd: end
      }
    );
  },

  moveItem(
    itemId,
    newStart
  ) {
    const start =
      Math.max(
        0,
        Number(newStart) || 0
      );

    return this.updateItem(
      itemId,
      {
        start
      }
    );
  },

  duplicateItem(itemId) {
    const item =
      this.state.timeline.find(
        (entry) =>
          entry.id === itemId
      );

    if (!item) {
      return null;
    }

    return this.addItem({
      ...item,
      id: null,
      name:
        `${item.name} Copy`,
      start:
        item.start +
        item.duration
    });
  },

  getTimelineDuration() {
    if (
      this.state.timeline.length ===
      0
    ) {
      return 0;
    }

    return Math.max(
      ...this.state.timeline.map(
        (item) =>
          Number(item.start) +
          Number(item.duration)
      )
    );
  },

  exportProject(
    options = {}
  ) {
    const payload = {
      projectId:
        this.state.currentProjectId,

      timeline:
        this.state.timeline,

      duration:
        this.getTimelineDuration(),

      options
    };

    return fetch(
      "/api/editor/export",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(payload)
      }
    ).then(
      async (response) => {
        let data = null;

        try {
          data =
            await response.json();
        } catch (error) {
          data = null;
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Editor export failed."
          );
        }

        return data;
      }
    );
  },

  reset() {
    this.state = {
      currentProjectId: null,
      timeline: [],
      selectedItemId: null,
      isPlaying: false,
      currentTime: 0
    };

    this.emitChange();

    return this.getState();
  },

  emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "tns:editor-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSEditorComponent =
  TNSEditorComponent;
