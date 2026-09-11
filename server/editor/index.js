const timeline = require("./timeline");
const videoTools = require("./video-tools");
const exportTools = require("./export");


function getEditorInfo() {
  return {
    name: "TNS AI Studio Editor",
    version: "1.0.0",
    status: "ready",
    modules: {
      timeline: true,
      videoTools: true,
      exportTools: true
    }
  };
}


function createProject(input = {}) {
  return timeline.createTimeline(input);
}


function getProject(id) {
  return timeline.getTimeline(id);
}


function updateProject(id, patch = {}) {
  return timeline.updateTimeline(id, patch);
}


function addVideoClip(id, clip = {}) {
  return timeline.addClip(id, {
    ...clip,
    type: "video"
  });
}


function addImageClip(id, clip = {}) {
  return timeline.addClip(id, {
    ...clip,
    type: "image"
  });
}


function addText(id, text = {}) {
  return timeline.addText(id, text);
}


function addAudio(id, audio = {}) {
  return timeline.addAudio(id, audio);
}


function removeClip(id, clipId) {
  return timeline.removeClip(id, clipId);
}


function clearProject(id) {
  return timeline.clearTimeline(id);
}


function deleteProject(id) {
  return timeline.deleteTimeline(id);
}


function getVideoTools() {
  return videoTools.getSupportedTools();
}


function getExportPresets() {
  return exportTools.getExportPresets();
}


function getExportInfo() {
  return exportTools.getExportInfo();
}


module.exports = {
  getEditorInfo,

  createProject,
  getProject,
  updateProject,

  addVideoClip,
  addImageClip,
  addText,
  addAudio,
  removeClip,

  clearProject,
  deleteProject,

  getVideoTools,
  getExportPresets,
  getExportInfo,

  timeline,
  videoTools,
  exportTools
};
