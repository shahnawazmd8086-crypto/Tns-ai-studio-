const TNSImageComponent = {
  state: {
    prompt: "",
    style: "realistic",
    aspectRatio: "16:9",
    quality: "HD",
    provider: "mock",
    isGenerating: false,
    jobId: null,
    result: null,
    error: null
  },

  getState() {
    return {
      ...this.state
    };
  },

  setPrompt(prompt) {
    this.state.prompt =
      String(prompt || "").trim();

    return this.state.prompt;
  },

  setOptions(options = {}) {
    if (
      typeof options.style ===
      "string"
    ) {
      this.state.style =
        options.style;
    }

    if (
      typeof options.aspectRatio ===
      "string"
    ) {
      this.state.aspectRatio =
        options.aspectRatio;
    }

    if (
      typeof options.quality ===
      "string"
    ) {
      this.state.quality =
        options.quality;
    }

    if (
      typeof options.provider ===
      "string"
    ) {
      this.state.provider =
        options.provider;
    }

    return this.getState();
  },

  validatePrompt(prompt) {
    const value =
      String(prompt || "").trim();

    if (!value) {
      throw new Error(
        "Image prompt is required."
      );
    }

    if (value.length > 10000) {
      throw new Error(
        "Image prompt is too long."
      );
    }

    return value;
  },

  async generateImage(
    prompt,
    options = {}
  ) {
    const safePrompt =
      this.validatePrompt(prompt);

    this.setPrompt(
      safePrompt
    );

    this.setOptions(
      options
    );

    this.state.isGenerating =
      true;

    this.state.error =
      null;

    this.state.result =
      null;

    this.emitChange();

    try {
      const response =
        await fetch(
          "/api/image/jobs",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              prompt:
                safePrompt,

              provider:
                this.state.provider,

              options: {
                style:
                  this.state.style,

                aspectRatio:
                  this.state
                    .aspectRatio,

                quality:
                  this.state.quality
              }
            })
          }
        );

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
            "Image generation failed."
        );
      }

      this.state.jobId =
        data?.job?.id ||
        data?.id ||
        null;

      this.state.result =
        data;

      return data;
    } catch (error) {
      this.state.error =
        error.message ||
        "Image generation failed.";

      throw error;
    } finally {
      this.state.isGenerating =
        false;

      this.emitChange();
    }
  },

  async getJob(
    jobId
  ) {
    const id =
      String(jobId || "").trim();

    if (!id) {
      throw new Error(
        "Image job ID is required."
      );
    }

    const response =
      await fetch(
        `/api/image/jobs/${encodeURIComponent(
          id
        )}`
      );

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
          "Unable to get image job status."
      );
    }

    this.state.jobId =
      id;

    this.state.result =
      data;

    this.emitChange();

    return data;
  },

  async waitForJob(
    jobId,
    options = {}
  ) {
    const id =
      String(jobId || "").trim();

    if (!id) {
      throw new Error(
        "Image job ID is required."
      );
    }

    const interval =
      Math.max(
        500,
        Number(
          options.interval
        ) || 1500
      );

    const timeout =
      Math.max(
        interval,
        Number(
          options.timeout
        ) || 120000
      );

    const startedAt =
      Date.now();

    while (
      Date.now() -
        startedAt <
      timeout
    ) {
      const job =
        await this.getJob(id);

      const status =
        String(
          job?.status ||
            job?.job?.status ||
            ""
        ).toLowerCase();

      if (
        status ===
          "completed" ||
        status ===
          "complete" ||
        status ===
          "succeeded"
      ) {
        return job;
      }

      if (
        status ===
          "failed" ||
        status ===
          "error" ||
        status ===
          "cancelled" ||
        status ===
          "canceled"
      ) {
        throw new Error(
          job?.message ||
            job?.error ||
            "Image generation job failed."
        );
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            interval
          )
      );
    }

    throw new Error(
      "Image generation timed out."
    );
  },

  reset() {
    this.state = {
      prompt: "",
      style: "realistic",
      aspectRatio: "16:9",
      quality: "HD",
      provider: "mock",
      isGenerating: false,
      jobId: null,
      result: null,
      error: null
    };

    this.emitChange();

    return this.getState();
  },

  emitChange() {
    window.dispatchEvent(
      new CustomEvent(
        "tns:image-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSImageComponent =
  TNSImageComponent;
