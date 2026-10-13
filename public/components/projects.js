const TNSProjectsComponent = {
  state: {
    projects: [],
    currentProjectId: null,
    isLoading: false,
    error: null
  },

  getState() {
    return {
      ...this.state,
      projects: [...this.state.projects]
    };
  },

  validateProjectName(name) {
    const value =
      String(name || "").trim();

    if (!value) {
      throw new Error(
        "Project name is required."
      );
    }

    if (value.length > 200) {
      throw new Error(
        "Project name is too long."
      );
    }

    return value;
  },

  async createProject(
    name,
    data = {}
  ) {
    const projectName =
      this.validateProjectName(name);

    this.state.isLoading = true;
    this.state.error = null;
    this.emitChange();

    try {
      const response =
        await fetch(
          "/api/projects",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              name: projectName,
              ...data
            })
          }
        );

      let result = null;

      try {
        result =
          await response.json();
      } catch (error) {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to create project."
        );
      }

      const project =
        result?.project ||
        result;

      if (project) {
        this.state.projects.push(
          project
        );

        this.state.currentProjectId =
          project.id || null;
      }

      return result;
    } catch (error) {
      this.state.error =
        error.message ||
        "Project creation failed.";

      throw error;
    } finally {
      this.state.isLoading = false;
      this.emitChange();
    }
  },

  async loadProjects() {
    this.state.isLoading = true;
    this.state.error = null;
    this.emitChange();

    try {
      const response =
        await fetch(
          "/api/projects"
        );

      let result = null;

      try {
        result =
          await response.json();
      } catch (error) {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            "Unable to load projects."
        );
      }

      this.state.projects =
        Array.isArray(
          result?.projects
        )
          ? result.projects
          : Array.isArray(result)
            ? result
            : [];

      return this.state.projects;
    } catch (error) {
      this.state.error =
        error.message ||
        "Unable to load projects.";

      throw error;
    } finally {
      this.state.isLoading = false;
      this.emitChange();
    }
  },

  async getProject(
    projectId
  ) {
    const id =
      String(projectId || "").trim();

    if (!id) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `/api/projects/${encodeURIComponent(
          id
        )}`
      );

    let result = null;

    try {
      result =
        await response.json();
    } catch (error) {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to load project."
      );
    }

    return (
      result?.project ||
      result
    );
  },

  async updateProject(
    projectId,
    updates = {}
  ) {
    const id =
      String(projectId || "").trim();

    if (!id) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `/api/projects/${encodeURIComponent(
          id
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json"
          },
          body:
            JSON.stringify(updates)
        }
      );

    let result = null;

    try {
      result =
        await response.json();
    } catch (error) {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to update project."
      );
    }

    const updatedProject =
      result?.project ||
      result;

    const index =
      this.state.projects.findIndex(
        (project) =>
          project.id === id
      );

    if (index !== -1) {
      this.state.projects[index] =
        updatedProject;
    }

    this.emitChange();

    return updatedProject;
  },

  async deleteProject(
    projectId
  ) {
    const id =
      String(projectId || "").trim();

    if (!id) {
      throw new Error(
        "Project ID is required."
      );
    }

    const response =
      await fetch(
        `/api/projects/${encodeURIComponent(
          id
        )}`,
        {
          method: "DELETE"
        }
      );

    let result = null;

    try {
      result =
        await response.json();
    } catch (error) {
      result = null;
    }

    if (!response.ok) {
      throw new Error(
        result?.message ||
          "Unable to delete project."
      );
    }

    this.state.projects =
      this.state.projects.filter(
        (project) =>
          project.id !== id
      );

    if (
      this.state.currentProjectId ===
      id
    ) {
      this.state.currentProjectId =
        null;
    }

    this.emitChange();

    return (
      result || {
        success: true
      }
    );
  },

  selectProject(projectId) {
    const id =
      String(projectId || "").trim();

    const project =
      this.state.projects.find(
        (item) =>
          item.id === id
      );

    if (!project) {
      return null;
    }

    this.state.currentProjectId =
      id;

    this.emitChange();

    return project;
  },

  getCurrentProject() {
    if (
      !this.state.currentProjectId
    ) {
      return null;
    }

    return (
      this.state.projects.find(
        (project) =>
          project.id ===
          this.state.currentProjectId
      ) || null
    );
  },

  clearSelection() {
    this.state.currentProjectId =
      null;

    this.emitChange();

    return true;
  },

  reset() {
    this.state = {
      projects: [],
      currentProjectId: null,
      isLoading: false,
      error: null
    };

    this.emitChange();

    return this.getState();
  },

  emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "tns:projects-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSProjectsComponent =
  TNSProjectsComponent;
