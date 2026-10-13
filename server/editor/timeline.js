const crypto = require("crypto");

const timelines = new Map();


function createTimeline(input = {}) {
  const id = crypto.randomUUID();

  const timeline = {
    id,
    name: input.name || "Untitled Timeline",
    format: input.format || "9:16",
    duration: Number(input.duration) || 0,
    clips: Array.isArray(input.clips) ? input.clips : [],
    audio: Array.isArray(input.audio) ? input.audio : [],
    text: Array.isArray(input.text) ? input.text : [],
    effects: Array.isArray(input.effects) ? input.effects : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  timelines.set(id, timeline);

  return timeline;
}


function getTimeline(id) {
  return timelines.get(id) || null;
}


function updateTimeline(id, patch = {}) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  Object.assign(timeline, patch, {
    updatedAt: new Date().toISOString()
  });

  return timeline;
}


function addClip(id, clip = {}) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  const newClip = {
    id: crypto.randomUUID(),
    type: clip.type || "video",
    source: clip.source || null,
    start: Number(clip.start) || 0,
    duration: Number(clip.duration) || 0,
    trimStart: Number(clip.trimStart) || 0,
    trimEnd: Number(clip.trimEnd) || 0
  };

  timeline.clips.push(newClip);
  timeline.updatedAt = new Date().toISOString();

  return newClip;
}


function removeClip(id, clipId) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  const index = timeline.clips.findIndex(
    (clip) => clip.id === clipId
  );

  if (index === -1) {
    return null;
  }

  const removed = timeline.clips.splice(index, 1)[0];

  timeline.updatedAt = new Date().toISOString();

  return removed;
}


function addText(id, textItem = {}) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  const item = {
    id: crypto.randomUUID(),
    text: String(textItem.text || ""),
    start: Number(textItem.start) || 0,
    duration: Number(textItem.duration) || 0,
    position: textItem.position || "center",
    style: textItem.style || "default"
  };

  timeline.text.push(item);
  timeline.updatedAt = new Date().toISOString();

  return item;
}


function addAudio(id, audioItem = {}) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  const item = {
    id: crypto.randomUUID(),
    source: audioItem.source || null,
    start: Number(audioItem.start) || 0,
    duration: Number(audioItem.duration) || 0,
    volume: Number(audioItem.volume ?? 1)
  };

  timeline.audio.push(item);
  timeline.updatedAt = new Date().toISOString();

  return item;
}


function clearTimeline(id) {
  const timeline = timelines.get(id);

  if (!timeline) {
    return null;
  }

  timeline.clips = [];
  timeline.audio = [];
  timeline.text = [];
  timeline.effects = [];
  timeline.duration = 0;
  timeline.updatedAt = new Date().toISOString();

  return timeline;
}


function deleteTimeline(id) {
  return timelines.delete(id);
}


module.exports = {
  createTimeline,
  getTimeline,
  updateTimeline,
  addClip,
  removeClip,
  addText,
  addAudio,
  clearTimeline,
  deleteTimeline
};
