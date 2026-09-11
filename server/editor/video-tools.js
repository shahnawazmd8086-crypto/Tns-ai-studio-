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
    "convert",
    "trim",
    "resize",
    "normalizeSound",
    "extractSound",
    "mute",
    "exportVideo",
    "mergeVideos",
    "customFFmpeg"
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
