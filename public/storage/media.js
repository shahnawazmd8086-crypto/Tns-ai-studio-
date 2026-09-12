const TNSMediaStorage = {
  storageKey: "tns_ai_studio_media",

  getAll() {
    try {
      const data =
        localStorage.getItem(
          this.storageKey
        );

      if (!data) {
        return [];
      }

      const media =
        JSON.parse(data);

      return Array.isArray(media)
        ? media
        : [];
    } catch (error) {
      return [];
    }
  },

  save(media) {
    if (!media) {
      throw new Error(
        "Media data is required."
      );
    }

    const items = this.getAll();

    const item = {
      id:
        media.id ||
        crypto.randomUUID(),
      type:
        media.type || "unknown",
      name:
        media.name || "Untitled Media",
      url:
        media.url || "",
      thumbnail:
        media.thumbnail || "",
      size:
        Number(media.size) || 0,
      mimeType:
        media.mimeType || "",
      createdAt:
        media.createdAt ||
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    items.push(item);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(items)
    );

    return item;
  },

  getById(id) {
    if (!id) {
      return null;
    }

    return (
      this.getAll().find(
        (item) =>
          item.id === String(id)
      ) || null
    );
  },

  update(id, changes = {}) {
    if (!id) {
      return null;
    }

    const items = this.getAll();

    const index =
      items.findIndex(
        (item) =>
          item.id === String(id)
      );

    if (index === -1) {
      return null;
    }

    items[index] = {
      ...items[index],
      ...changes,
      id: items[index].id,
      updatedAt:
        new Date().toISOString()
    };

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(items)
    );

    return items[index];
  },

  remove(id) {
    if (!id) {
      return false;
    }

    const items = this.getAll();

    const filtered =
      items.filter(
        (item) =>
          item.id !== String(id)
      );

    if (
      filtered.length ===
      items.length
    ) {
      return false;
    }

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(filtered)
    );

    return true;
  },

  clear() {
    localStorage.removeItem(
      this.storageKey
    );

    return true;
  },

  count() {
    return this.getAll().length;
  },

  filterByType(type) {
    if (!type) {
      return [];
    }

    return this.getAll().filter(
      (item) =>
        item.type === String(type)
    );
  }
};


window.TNSMediaStorage =
  TNSMediaStorage;
