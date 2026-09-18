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
  const filters = [];

  const width = Number(options.width);
  const height = Number(options.height);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    filters.push(`scale=${Math.floor(width)}:${Math.floor(height)}:force_original_aspect_ratio=decrease,pad=${Math.floor(width)}:${Math.floor(height)}:(ow-iw)/2:(oh-ih)/2`);
  }

  const brightness = Number(options.brightness);
  const contrast = Number(options.contrast);
  if (Number.isFinite(brightness) && Math.abs(brightness) > 0.0001 || Number.isFinite(contrast) && Math.abs(contrast - 1) > 0.0001) {
    filters.push(`eq=brightness=${Number.isFinite(brightness) ? Math.max(-1, Math.min(1, brightness)) : 0}:contrast=${Number.isFinite(contrast) ? Math.max(0, Math.min(2, contrast)) : 1}`);
  }

  const filter = String(options.filter || 'none').toLowerCase();
  if (filter === 'grayscale') filters.push('hue=s=0');
  if (filter === 'sepia') filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');

  const rotate = Number(options.rotate) || 0;
  if (rotate === 90) filters.push('transpose=1');
  else if (rotate === 180) filters.push('transpose=1,transpose=1');
  else if (rotate === 270) filters.push('transpose=2');

  const speed = Number(options.speed);
  if (Number.isFinite(speed) && speed > 0 && Math.abs(speed - 1) > 0.0001) filters.push(`setpts=PTS/${Math.max(0.25, Math.min(4, speed))}`);

  if (filters.length) args.push('-vf', filters.join(','));
  if (options.fps) args.push('-r', String(Math.max(1, Math.min(120, Number(options.fps)))));
  args.push('-c:v', String(options.videoCodec || 'libx264'));
  args.push('-pix_fmt', 'yuv420p');
  args.push('-c:a', String(options.audioCodec || 'aac'));
  if (options.videoBitrate) args.push('-b:v', String(options.videoBitrate));
  if (options.audioBitrate) args.push('-b:a', String(options.audioBitrate));

  const volume = Number(options.volume);
  if (Number.isFinite(volume) && volume >= 0 && volume <= 1 && Math.abs(volume - 1) > 0.0001) {
    args.push('-af', `volume=${volume}`);
  }

  args.push('-movflags', '+faststart');
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
  const args = ['-y'];
  const start = Number(options.trimStart);
  if (Number.isFinite(start) && start > 0) args.push('-ss', String(start));
  args.push('-i', input);
  const duration = Number(options.trimDuration);
  if (Number.isFinite(duration) && duration > 0) args.push('-t', String(duration));

  const speed = Number(options.speed);
  if (Number.isFinite(speed) && speed > 0 && Math.abs(speed - 1) > 0.0001) {
    const safeSpeed = Math.max(0.25, Math.min(4, speed));
    const videoOptions = { ...options, speed: safeSpeed, volume: 1 };
    args.push(...buildVideoOptions(videoOptions));
    const atempo = [];
    let remaining = safeSpeed;
    while (remaining < 0.5) { atempo.push('atempo=0.5'); remaining /= 0.5; }
    while (remaining > 2) { atempo.push('atempo=2'); remaining /= 2; }
    atempo.push(`atempo=${remaining}`);
    const volume = Number(options.volume);
    if (Number.isFinite(volume) && volume >= 0 && volume <= 1 && Math.abs(volume - 1) > 0.0001) atempo.push(`volume=${volume}`);
    args.push('-af', atempo.join(','));
  } else {
    args.push(...buildVideoOptions(options));
  }
  args.push(output);
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
