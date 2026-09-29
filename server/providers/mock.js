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




  async chat(input = {}) {
    const message = String(input.message || '').trim();
    if (!message) return { reply: 'Tell me what you would like help with.' };
    if (input.research) return { reply: `TNS AI research mode is ready. I received: “${message}”. A live web-search provider can be connected for current web results.` };
    return { reply: `TNS AI demo response: I understood your request — “${message}”. Your TNS AI provider can replace this development response with a real AI answer.` };
  }

  async understand(input = {}) {
    const file = input.file || {};
    const name = String(file.name || 'uploaded file');
    const type = String(file.type || 'unknown');
    return { reply: `TNS AI development analysis: “${name}” (${type}) was received successfully. The file-understanding pipeline is working; a real AI provider will perform semantic document/image analysis in production.` };
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
