const path = require("path");

const {
  convertVideo,
  trimVideo,
  resizeVideo,
  normalizeAudio,
  extractAudio,
  muteVideo,
  exportMP4,
  concatVideos,
  mixAudioIntoVideo,
  splitVideo,
  cropVideo,
  flipVideo,
  reverseVideo,
  freezeFrame,
  blurVideo,
  stabilizeVideo,
  cleanNoise: cleanNoiseFFmpeg,
  chromaKeyVideo,
  textOverlay,
  autoReframe,
  runCustom,
  synthesizeSpeech, backgroundReplace,
  filterVideo, filterAudio, transitionVideo, addDrawText, addShape, addVignette, colorAdjust, colorBalance, panZoom, keyframeZoom, silenceRemove, voiceEnhance, enhanceVideo, faceBlur, objectRemove, rotateVideo, audioFade, beatSync, sceneDetect, smartCut, sceneExtend
} = require("../ffmpeg-worker");


function getOutputPath(output) {
  if (!output) {
    throw new Error("Output file path is required.");
  }

  return path.resolve(String(output));
}


async function convert(input, output, options = {}) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return convertVideo(
    path.resolve(String(input)),
    getOutputPath(output),
    options
  );
}


async function trim(
  input,
  output,
  start = 0,
  duration = null
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return trimVideo(
    path.resolve(String(input)),
    getOutputPath(output),
    start,
    duration
  );
}


async function resize(
  input,
  output,
  width,
  height
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return resizeVideo(
    path.resolve(String(input)),
    getOutputPath(output),
    width,
    height
  );
}


async function normalizeSound(
  input,
  output
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return normalizeAudio(
    path.resolve(String(input)),
    getOutputPath(output)
  );
}


async function extractSound(
  input,
  output
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return extractAudio(
    path.resolve(String(input)),
    getOutputPath(output)
  );
}


async function mute(
  input,
  output
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return muteVideo(
    path.resolve(String(input)),
    getOutputPath(output)
  );
}


async function exportVideo(
  input,
  output,
  options = {}
) {
  if (!input) {
    throw new Error("Input video path is required.");
  }

  return exportMP4(
    path.resolve(String(input)),
    getOutputPath(output),
    options
  );
}


async function mergeVideos(
  listFile,
  output
) {
  if (!listFile) {
    throw new Error("Video list file is required.");
  }

  return concatVideos(
    path.resolve(String(listFile)),
    getOutputPath(output)
  );
}


async function mixAudio(inputVideo, inputAudio, output, options = {}) {
  if (!inputVideo || !inputAudio) throw new Error("Video and audio input paths are required.");
  return mixAudioIntoVideo(path.resolve(String(inputVideo)), path.resolve(String(inputAudio)), getOutputPath(output), options);
}

async function split(input, outputA, outputB, splitAt) {
  return splitVideo(path.resolve(String(input)), getOutputPath(outputA), getOutputPath(outputB), splitAt);
}
async function crop(input, output, options = {}) { return cropVideo(path.resolve(String(input)), getOutputPath(output), options); }
async function flip(input, output, direction = 'horizontal') { return flipVideo(path.resolve(String(input)), getOutputPath(output), direction); }
async function reverse(input, output) { return reverseVideo(path.resolve(String(input)), getOutputPath(output)); }
async function freeze(input, output, duration = 2) { return freezeFrame(path.resolve(String(input)), getOutputPath(output), duration); }
async function blur(input, output, strength = 8) { return blurVideo(path.resolve(String(input)), getOutputPath(output), strength); }
async function stabilize(input, output) { return stabilizeVideo(path.resolve(String(input)), getOutputPath(output)); }
async function cleanNoise(input, output, amount = 12) { return cleanNoiseFFmpeg(path.resolve(String(input)), getOutputPath(output), amount); }
async function chromaKey(input, output, options = {}) { return chromaKeyVideo(path.resolve(String(input)), getOutputPath(output), options); }
async function addText(input, output, text, options = {}) { return textOverlay(path.resolve(String(input)), getOutputPath(output), text, options); }
async function reframe(input, output, width, height) { return autoReframe(path.resolve(String(input)), getOutputPath(output), width, height); }


async function customFFmpeg(
  args = [],
  options = {}
) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error("FFmpeg arguments are required.");
  }

  return runCustom(
    args,
    options
  );
}


async function applyFilter(input, output, filter, options = {}) { return filterVideo(path.resolve(String(input)), getOutputPath(output), filter, options); }
async function applyAudioFilter(input, output, filter, options = {}) { return filterAudio(path.resolve(String(input)), getOutputPath(output), filter, options); }
async function transition(inputA, inputB, output, options = {}) { return transitionVideo(path.resolve(String(inputA)), path.resolve(String(inputB)), getOutputPath(output), options); }
async function drawText(input, output, text, options = {}) { return addDrawText(path.resolve(String(input)), getOutputPath(output), text, options); }
async function shape(input, output, options = {}) { return addShape(path.resolve(String(input)), getOutputPath(output), options); }
async function vignette(input, output, strength) { return addVignette(path.resolve(String(input)), getOutputPath(output), strength); }
async function color(input, output, options = {}) { return colorAdjust(path.resolve(String(input)), getOutputPath(output), options); }
async function balance(input, output, options = {}) { return colorBalance(path.resolve(String(input)), getOutputPath(output), options); }
async function panZoomTool(input, output, options = {}) { return panZoom(path.resolve(String(input)), getOutputPath(output), options); }
async function keyframes(input, output, options = {}) { return keyframeZoom(path.resolve(String(input)), getOutputPath(output), options); }
async function silenceRemoval(input, output, options = {}) { return silenceRemove(path.resolve(String(input)), getOutputPath(output), options); }
async function enhanceVoice(input, output) { return voiceEnhance(path.resolve(String(input)), getOutputPath(output)); }
async function enhance(input, output, options = {}) { return enhanceVideo(path.resolve(String(input)), getOutputPath(output), options); }
async function blurFace(input, output, options = {}) { return faceBlur(path.resolve(String(input)), getOutputPath(output), options); }
async function removeObject(input, output, options = {}) { return objectRemove(path.resolve(String(input)), getOutputPath(output), options); }
async function rotate(input, output, degrees) { return rotateVideo(path.resolve(String(input)), getOutputPath(output), degrees); }
async function fadeAudio(input, output, options = {}) { return audioFade(path.resolve(String(input)), getOutputPath(output), options); }
async function syncBeats(input, output, options = {}) { return beatSync(path.resolve(String(input)), getOutputPath(output), options); }
async function detectScenes(input, output, options = {}) { return sceneDetect(path.resolve(String(input)), getOutputPath(output), options); }
async function smartCutTool(input, output, options = {}) { return smartCut(path.resolve(String(input)), getOutputPath(output), options); }
async function extendScene(input, output, duration) { return sceneExtend(path.resolve(String(input)), getOutputPath(output), duration); }

async function tts(text, output, options = {}) { return synthesizeSpeech(text, getOutputPath(output), options); }
async function replaceBackground(input, background, output, options = {}) { return backgroundReplace(path.resolve(String(input)), path.resolve(String(background)), getOutputPath(output), options); }


function getSupportedTools() {
  return [
    "Trim","Cut","Split","Merge","Ripple Delete","Duplicate Clip","Freeze Frame","Reverse","Speed","Speed Curves","Time Remap","Scene Detection",
    "Crop","Resize","Rotate","Flip","Mirror","Auto Reframe","Pan & Zoom","Keyframes","Motion Tracking","Stabilization","Perspective",
    "Text","Fonts","Templates","Captions","AI Captions","Subtitles","Karaoke Captions","Text Animation","Stickers","Shapes",
    "Effects","Transitions","Blur","Vignette","Glitch","Glow","Film Grain","Lens","Light Leak","Blend Modes",
    "Brightness","Contrast","Saturation","HSL","Curves","Sharpness","Temperature","Tint","Exposure","Highlights","Shadows","Colour Match","LUT",
    "Music","SFX","Extract Audio","Voice Over","Voice Recorder","TTS","Volume","Normalize Audio","Noise Cleanup","Silence Removal","Audio Fade","Voice Enhance",
    "Background Removal","Background Replace","AI Enhance","AI Upscale","AI Voice","Object Removal","Smart Cut","Beat Sync","Scene Extend","Face Blur","Auto Highlight",
    "Masks","Chroma Key","Opacity","Shadow","Proxy Preview","Project Versions","Safe Zones","Export Presets"
  ];
}

module.exports = {
  convert,
  trim,
  resize,
  normalizeSound,
  extractSound,
  mute,
  exportVideo,
  mergeVideos,
  mixAudio,
  split,
  crop,
  flip,
  reverse,
  freeze,
  blur,
  stabilize,
  cleanNoise,
  chromaKey,
  addText,
  reframe,
  customFFmpeg,
  tts, replaceBackground,
  applyFilter, applyAudioFilter, transition, drawText, shape, vignette, color, balance, panZoomTool, keyframes, silenceRemoval, enhanceVoice, enhance, blurFace, removeObject, rotate, fadeAudio, syncBeats, detectScenes, smartCutTool, extendScene,
  getSupportedTools
};
