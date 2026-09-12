const TNSProjectStorage = {
  storageKey: "tns_ai_studio_projects",

  getAll() {
    try {
      const data =
        localStorage.getItem(
          this.storageKey
        );

      if (!data) {
        return [];
      }

      const projects =
        JSON.parse(data);

      return Array.isArray(projects)
        ? projects
        : [];
    } catch (error) {
      return [];
    }
  },

  save(project = {}) {
    const projects =
      this.getAll();

    const now =
      new Date().toISOString();

    const item = {
      id:
        project.id ||
        crypto.randomUUID(),

      name:
        project.name ||
        "Untitled Project",

      description:
        project.description || "",

      type:
        project.type || "video",

      thumbnail:
        project.thumbnail || "",

      duration:
        Number(project.duration) || 0,

      aspectRatio:
        project.aspectRatio ||
        "16:9",

      quality:
        project.quality ||
        "HD",

      timeline:
        Array.isArray(project.timeline)
          ? project.timeline
          : [],

      media:
        Array.isArray(project.media)
          ? project.media
          : [],

      createdAt:
        project.createdAt || now,

      updatedAt:
        project.updatedAt || now
    };

    projects.push(item);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(projects)
    );

    return item;
  },

  getById(id) {
    if (!id) {
      return null;
    }

    return (
      this.getAll().find(
        (project) =>
          project.id === String(id)
      ) || null
    );
  },

  update(id, changes = {}) {
    if (!id) {
      return null;
    }

    const projects =
      this.getAll();

    const index =
      projects.findIndex(
        (project) =>
          project.id === String(id)
      );

    if (index === -1) {
      return null;
    }

    projects[index] = {
      ...projects[index],
      ...changes,
      id: projects[index].id,
      updatedAt:
        new Date().toISOString()
    };

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(projects)
    );

    return projects[index];
  },

  remove(id) {
    if (!id) {
      return false;
    }

    const projects =
      this.getAll();

    const filtered =
      projects.filter(
        (project) =>
          project.id !== String(id)
      );

    if (
      filtered.length ===
      projects.length
    ) {
      return false;
    }

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(filtered)
    );

    return true;
  },

  duplicate(id) {
    const project =
      this.getById(id);

    if (!project) {
      return null;
    }

    const now =
      new Date().toISOString();

    const copy = {
      ...project,
      id: crypto.randomUUID(),
      name:
        `${project.name} Copy`,
      createdAt: now,
      updatedAt: now,
      timeline:
        Array.isArray(project.timeline)
          ? [...project.timeline]
          : [],
      media:
        Array.isArray(project.media)
          ? [...project.media]
          : []
    };

    const projects =
      this.getAll();

    projects.push(copy);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(projects)
    );

    return copy;
  },

  count() {
    return this.getAll().length;
  },

  clear() {
    localStorage.removeItem(
      this.storageKey
    );

    return true;
  },

  exists(id) {
    return Boolean(
      this.getById(id)
    );
  }
};


window.TNSProjectStorage =
  TNSProjectStorage;
