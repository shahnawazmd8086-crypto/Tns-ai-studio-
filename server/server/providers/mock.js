class MockProvider {
  async createJob(input) {
    return {
      id: "mock-" + Date.now(),
      status: "queued",
      provider: "mock",
      input
    };
  }

  async getJob(id) {
    return {
      id,
      status: "completed",
      provider: "mock"
    };
  }
}

module.exports = MockProvider;
