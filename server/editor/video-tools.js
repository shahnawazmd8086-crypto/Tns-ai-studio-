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
  runCustom
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
  customFFmpeg,
  getSupportedTools
};
