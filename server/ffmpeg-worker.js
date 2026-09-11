const { spawn } = require("child_process");


function runFFmpeg(args = [], options = {}) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(args)) {
      reject(new Error("FFmpeg arguments must be an array."));
      return;
    }

    if (!args.length) {
      reject(new Error("FFmpeg arguments are required."));
      return;
    }

    const ffmpegPath =
      options.ffmpegPath ||
      process.env.FFMPEG_PATH ||
      "ffmpeg";

    const processArgs = args.map((value) => String(value));

    const child = spawn(
      ffmpegPath,
      processArgs,
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();

      if (typeof options.onProgress === "function") {
        options.onProgress(data.toString());
      }
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `FFmpeg could not start: ${error.message}`
        )
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          code,
          stdout,
          stderr
        });
        return;
      }

      const message =
        stderr.trim() ||
        `FFmpeg exited with code ${code}.`;

      reject(new Error(message));
    });
  });
}


/* =========================
   COMMON VIDEO OPERATIONS
========================= */

async function convertVideo(
  input,
  output,
  options = {}
) {
  const args = [
    "-y",
    "-i",
    input,
    ...buildVideoOptions(options),
    output
  ];

  return runFFmpeg(args, options);
}


function buildVideoOptions(options = {}) {
  const args = [];

  if (options.width && options.height) {
    args.push(
      "-vf",
      `scale=${Number(options.width)}:${Number(options.height)}:force_original_aspect_ratio=decrease,pad=${Number(options.width)}:${Number(options.height)}:(ow-iw)/2:(oh-ih)/2`
    );
  }

  if (options.fps) {
    args.push(
      "-r",
      String(Number(options.fps))
    );
  }

  if (options.videoCodec) {
    args.push(
      "-c:v",
      String(options.videoCodec)
    );
  } else {
    args.push(
      "-c:v",
      "libx264"
    );
  }

  if (options.audioCodec) {
    args.push(
      "-c:a",
      String(options.audioCodec)
    );
  } else {
    args.push(
      "-c:a",
      "aac"
    );
  }

  if (options.videoBitrate) {
    args.push(
      "-b:v",
      String(options.videoBitrate)
    );
  }

  if (options.audioBitrate) {
    args.push(
      "-b:a",
      String(options.audioBitrate)
    );
  }

  args.push(
    "-movflags",
    "+faststart"
  );

  return args;
}


/* =========================
   TRIM / CUT
========================= */

async function trimVideo(
  input,
  output,
  start = 0,
  duration = null
) {
  const args = [
    "-y",
    "-ss",
    String(Number(start) || 0),
    "-i",
    input
  ];

  if (
    duration !== null &&
    duration !== undefined
  ) {
    args.push(
      "-t",
      String(Number(duration))
    );
  }

  args.push(
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    output
  );

  return runFFmpeg(args);
}


/* =========================
   RESIZE / FORMAT
========================= */

async function resizeVideo(
  input,
  output,
  width,
  height
) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);

  if (
    !Number.isFinite(safeWidth) ||
    !Number.isFinite(safeHeight) ||
    safeWidth <= 0 ||
    safeHeight <= 0
  ) {
    throw new Error(
      "Valid width and height are required."
    );
  }

  const args = [
    "-y",
    "-i",
    input,
    "-vf",
    `scale=${Math.floor(safeWidth)}:${Math.floor(safeHeight)}:force_original_aspect_ratio=decrease,pad=${Math.floor(safeWidth)}:${Math.floor(safeHeight)}:(ow-iw)/2:(oh-ih)/2`,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    output
  ];

  return runFFmpeg(args);
}


/* =========================
   AUDIO NORMALIZATION
========================= */

async function normalizeAudio(
  input,
  output
) {
  const args = [
    "-y",
    "-i",
    input,
    "-af",
    "loudnorm",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    output
  ];

  return runFFmpeg(args);
}


/* =========================
   EXTRACT AUDIO
========================= */

async function extractAudio(
  input,
  output
) {
  const args = [
    "-y",
    "-i",
    input,
    "-vn",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    output
  ];

  return runFFmpeg(args);
}


/* =========================
   MUTE VIDEO
========================= */

async function muteVideo(
  input,
  output
) {
  const args = [
    "-y",
    "-i",
    input,
    "-an",
    "-c:v",
    "copy",
    output
  ];

  return runFFmpeg(args);
}


/* =========================
   EXPORT MP4
========================= */

async function exportMP4(
  input,
  output,
  options = {}
) {
  const args = [
    "-y",
    "-i",
    input,
    ...buildVideoOptions(options),
    output
  ];

  return runFFmpeg(args, options);
}


/* =========================
   CONCATENATE VIDEOS
========================= */

async function concatVideos(
  listFile,
  output
) {
  const args = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    output
  ];

  return runFFmpeg(args);
}


/* =========================
   CUSTOM COMMAND
========================= */

async function runCustom(args, options = {}) {
  return runFFmpeg(args, options);
}


module.exports = {
  runFFmpeg,
  convertVideo,
  trimVideo,
  resizeVideo,
  normalizeAudio,
  extractAudio,
  muteVideo,
  exportMP4,
  concatVideos,
  runCustom
};
