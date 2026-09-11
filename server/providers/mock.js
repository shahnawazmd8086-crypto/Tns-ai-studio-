class MockProvider {
  constructor() {
    this.name = "mock";
  }


  async create(input = {}) {
    return {
      provider: this.name,
      type: "video",
      status: "queued",
      message: "Mock video job created.",
      input
    };
  }


  async createImage(input = {}) {
    return {
      provider: this.name,
      type: "image",
      status: "queued",
      message: "Mock image job created.",
      input
    };
  }


  async createVoice(input = {}) {
    return {
      provider: this.name,
      type: "voice",
      status: "queued",
      message: "Mock voice job created.",
      input
    };
  }


  async getStatus(providerJob) {
    return {
      provider: this.name,
      status: "queued",
      providerJob
    };
  }
}


module.exports = MockProvider;
