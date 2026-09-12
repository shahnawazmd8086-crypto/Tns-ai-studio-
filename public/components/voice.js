const TNSVoiceComponent = {
  state: {
    text: "",
    language: "en",
    voice: "",
    speed: 1,
    pitch: 1,
    volume: 1,
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

  setText(text) {
    this.state.text =
      String(text || "").trim();

    return this.state.text;
  },

  setOptions(options = {}) {
    if (
      typeof options.language ===
      "string"
    ) {
      this.state.language =
        options.language;
    }

    if (
      typeof options.voice ===
      "string"
    ) {
      this.state.voice =
        options.voice;
    }

    if (
      typeof options.speed ===
      "number" &&
      options.speed > 0
    ) {
      this.state.speed =
        options.speed;
    }

    if (
      typeof options.pitch ===
      "number"
    ) {
      this.state.pitch =
        options.pitch;
    }

    if (
      typeof options.volume ===
      "number" &&
      options.volume >= 0
    ) {
      this.state.volume =
        options.volume;
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

  validateText(text) {
    const value =
      String(text || "").trim();

    if (!value) {
      throw new Error(
        "Voice text is required."
      );
    }

    if (value.length > 50000) {
      throw new Error(
        "Voice text is too long."
      );
    }

    return value;
  },

  async generateVoice(
    text,
    options = {}
  ) {
    const safeText =
      this.validateText(text);

    this.setText(
      safeText
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
          "/api/voice/jobs",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              text:
                safeText,

              provider:
                this.state.provider,

              options: {
                language:
                  this.state.language,

                voice:
                  this.state.voice,

                speed:
                  this.state.speed,

                pitch:
                  this.state.pitch,

                volume:
                  this.state.volume
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
            "Voice generation failed."
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
        "Voice generation failed.";

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
        "Voice job ID is required."
      );
    }

    const response =
      await fetch(
        `/api/voice/jobs/${encodeURIComponent(
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
          "Unable to get voice job status."
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
        "Voice job ID is required."
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
            "Voice generation job failed."
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
      "Voice generation timed out."
    );
  },

  reset() {
    this.state = {
      text: "",
      language: "en",
      voice: "",
      speed: 1,
      pitch: 1,
      volume: 1,
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
        "tns:voice-change",
        {
          detail:
            this.getState()
        }
      )
    );
  }
};


window.TNSVoiceComponent =
  TNSVoiceComponent;
