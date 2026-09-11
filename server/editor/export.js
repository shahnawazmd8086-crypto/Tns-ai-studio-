const fs = require("fs");
const path = require("path");

const {
  exportVideo,
  mergeVideos,
  resize,
  normalizeSound,
  mute
} = require("./video-tools");


function ensureFile(filePath, label = "File") {
  if (!filePath) {
    throw new Error(`${label} path is required.`);
  }

  const resolved = path.resolve(String(filePath));

  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} does not exist: ${resolved}`);
  }

  return resolved;
}


function ensureOutput(outputPath) {
  if (!outputPath) {
    throw new Error("Output file path is required.");
  }

  const resolved = path.resolve(String(outputPath));

  const directory = path.dirname(resolved);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }

  return resolved;
}


async function exportMP4(
  input,
  output,
  options = {}
) {
  const inputPath = ensureFile(
    input,
    "Input video"
  );

  const outputPath = ensureOutput(output);

  return exportVideo(
    inputPath,
    outputPath,
    {
      width: options.width || 1080,
      height: options.height || 1920,
      fps: options.fps || 30,
      videoCodec:
        options.videoCodec || "libx264",
      audioCodec:
        options.audioCodec || "aac",
      videoBitrate:
        options.videoBitrate || "8M",
      audioBitrate:
        options.audioBitrate || "192k"
    }
  );
}


async function exportHD(
  input,
  output,
  options = {}
) {
  return exportMP4(
    input,
    output,
    {
      width: 1920,
      height: 1080,
      fps: options.fps || 30,
      videoBitrate:
        options.videoBitrate || "10M",
      audioBitrate:
        options.audioBitrate || "192k"
    }
  );
}


async function exportShorts(
  input,
  output,
  options = {}
) {
  return exportMP4(
    input,
    output,
    {
      width: 1080,
      height: 1920,
      fps: options.fps || 30,
      videoBitrate:
        options.videoBitrate || "8M",
      audioBitrate:
        options.audioBitrate || "192k"
    }
  );
}


async function merge(
  listFile,
  output
) {
  const listPath = ensureFile(
    listFile,
    "Video list"
  );

  const outputPath = ensureOutput(output);

  return mergeVideos(
    listPath,
    outputPath
  );
}


async function resizeVideo(
  input,
  output,
  width,
  height
) {
  const inputPath = ensureFile(
    input,
    "Input video"
  );

  const outputPath = ensureOutput(output);

  return resize(
    inputPath,
    outputPath,
    width,
    height
  );
}


async function normalizeAudio(
  input,
  output
) {
  const inputPath = ensureFile(
    input,
    "Input video"
  );

  const outputPath = ensureOutput(output);

  return normalizeSound(
    inputPath,
    outputPath
  );
}


async function removeAudio(
  input,
  output
) {
  const inputPath = ensureFile(
    input,
    "Input video"
  );

  const outputPath = ensureOutput(output);

  return mute(
    inputPath,
    outputPath
  );
}


function getExportPresets() {
  return {
    shorts: {
      width: 1080,
      height: 1920,
      fps: 30,
      format: "mp4"
    },

    landscape: {
      width: 1920,
      height: 1080,
      fps: 30,
      format: "mp4"
    },

    square: {
      width: 1080,
      height: 1080,
      fps: 30,
      format: "mp4"
    },

    HD: {
      width: 1920,
      height: 1080,
      fps: 30,
      format: "mp4"
    }
  };
}


function getExportInfo() {
  return {
    format: "mp4",
    videoCodec: "libx264",
    audioCodec: "aac",
    fastStart: true,
    presets: getExportPresets()
  };
}


module.exports = {
  exportMP4,
  exportHD,
  exportShorts,
  merge,
  resizeVideo,
  normalizeAudio,
  removeAudio,
  getExportPresets,
  getExportInfo
};
