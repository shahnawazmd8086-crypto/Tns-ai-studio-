const TNSStorage = {
  prefix: "tns_ai_studio_",

  set(key, value) {
    if (!key) {
      throw new Error("Storage key is required.");
    }

    localStorage.setItem(
      `${this.prefix}${key}`,
      JSON.stringify(value)
    );

    return value;
  },

  get(key, defaultValue = null) {
    if (!key) {
      return defaultValue;
    }

    try {
      const data =
        localStorage.getItem(
          `${this.prefix}${key}`
        );

      if (data === null) {
        return defaultValue;
      }

      return JSON.parse(data);
    } catch (error) {
      return defaultValue;
    }
  },

  has(key) {
    if (!key) {
      return false;
    }

    return (
      localStorage.getItem(
        `${this.prefix}${key}`
      ) !== null
    );
  },

  remove(key) {
    if (!key) {
      return false;
    }

    const storageKey =
      `${this.prefix}${key}`;

    if (
      localStorage.getItem(
        storageKey
      ) === null
    ) {
      return false;
    }

    localStorage.removeItem(
      storageKey
    );

    return true;
  },

  clear() {
    const keys = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        key.startsWith(this.prefix)
      ) {
        keys.push(key);
      }
    }

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });

    return true;
  },

  getKeys() {
    const keys = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key =
        localStorage.key(index);

      if (
        key &&
        key.startsWith(this.prefix)
      ) {
        keys.push(
          key.substring(
            this.prefix.length
          )
        );
      }
    }

    return keys;
  },

  setJSON(key, value) {
    return this.set(
      key,
      value
    );
  },

  getJSON(key, defaultValue = null) {
    return this.get(
      key,
      defaultValue
    );
  },

  setString(key, value) {
    if (!key) {
      throw new Error("Storage key is required.");
    }

    localStorage.setItem(
      `${this.prefix}${key}`,
      String(value)
    );

    return String(value);
  },

  getString(key, defaultValue = "") {
    if (!key) {
      return defaultValue;
    }

    const value =
      localStorage.getItem(
        `${this.prefix}${key}`
      );

    return value === null
      ? defaultValue
      : value;
  },

  setBoolean(key, value) {
    return this.set(
      key,
      Boolean(value)
    );
  },

  getBoolean(key, defaultValue = false) {
    return Boolean(
      this.get(
        key,
        defaultValue
      )
    );
  }
};


window.TNSStorage =
  TNSStorage;
