const TNSAPIConfig = {
  baseURL: "",

  endpoints: {
    health:
      "/health",

    app:
      "/api",

    auth: {
      login:
        "/api/auth/login",

      signup:
        "/api/auth/signup",

      otpRequest:
        "/api/auth/otp/request",

      otpVerify:
        "/api/auth/otp/verify",

      forgotPassword:
        "/api/auth/forgot-password"
    },

    image: {
      create:
        "/api/image/jobs",

      status:
        "/api/image/jobs"
    },

    video: {
      create:
        "/api/video/jobs",

      status:
        "/api/video/jobs"
    },

    voice: {
      create:
        "/api/voice/jobs",

      status:
        "/api/voice/jobs"
    },

    editor: {
      export:
        "/api/editor/export"
    },

    projects: {
      list:
        "/api/projects",

      create:
        "/api/projects",

      item:
        "/api/projects"
    }
  },

  requestTimeout:
    120000,

  getURL(endpoint) {
    const path =
      String(endpoint || "");

    return `${this.baseURL}${path}`;
  },

  getEndpoint(
    category,
    action
  ) {
    const group =
      this.endpoints[category];

    if (!group) {
      return null;
    }

    if (
      typeof group ===
      "string"
    ) {
      return group;
    }

    return group[action] ||
      null;
  },

  getJobStatusURL(
    type,
    jobId
  ) {
    const base =
      this.getEndpoint(
        type,
        "status"
      );

    if (!base || !jobId) {
      return null;
    }

    return `${base}/${encodeURIComponent(
      String(jobId)
    )}`;
  }
};


window.TNSAPIConfig =
  TNSAPIConfig;
