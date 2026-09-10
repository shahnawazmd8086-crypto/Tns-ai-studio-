// TNS AI Studio - Mock Video Provider

class MockProvider {
  constructor() {
    this.name = "mock";
  }

  async create(input = {}) {
    return {
      provider: this.name,
      status: "queued",
      input
    };
  }

  async getStatus(jobId) {
    return {
      provider: this.name,
      jobId,
      status: "queued"
    };
  }
}

module.exports = MockProvider;
