const TNSVideoComponent = {
  state: {
    prompt: "",
    duration: 10,
    aspectRatio: "16:9",
    quality: "HD",
    style: "realistic",
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
      typeof options.duration ===
      "number" &&
      options.duration > 0
    ) {
      this.state.duration =
        options.duration;
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
      typeof options.style ===
      "string"
    ) {
      this.state.style =
        options.style;
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
        "Video prompt is required."
      );
    }

    if (value.length > 20000) {
      throw new Error(
        "Video prompt is too long."
      );
    }

    return value;
  },

  async generateVideo(
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
          "/api/video/jobs",
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
                duration:
                  this.state.duration,

                aspectRatio:
                  this.state
                    .aspectRatio,

                quality:
                  this.state.quality,

                style:
                  this.state.style
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
            "Video generation failed."
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
        "Video generation failed.";

      throw error;
    } finally {
      this.state.isGenerating =
        false;

      this.emitChange();
    }
  },

  async getJob(jobId) {
    const id =
      String(jobId || "").trim();

    if (!id) {
      throw new Error(
        "Video job ID is required."
      );
    }

    const response =
      await fetch(
        `/api/video/jobs/${encodeURIComponent(
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
          "Unable to get video job status."
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
        "Video job ID is required."
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
        ) || 180000
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
            "Video generation job failed."
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
      "Video generation timed out."
    );
  },

  cancelJob(jobId) {
    const id =
      String(jobId || "").trim();

    if (!id) {
      return Promise.reject(
        new Error(
          "Video job ID is required."
        )
      );
    }

    return fetch(
      `/api/video/jobs/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE"
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
              "Unable to cancel video job."
          );
        }

        return data;
      }
    );
  },

  reset() {
    this.state = {
      prompt: "",
      duration: 10,
      aspectRatio: "16:9",
      quality: "HD",
      style: "realistic",
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
        "tns:video-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSVideoComponent =
  TNSVideoComponent;
