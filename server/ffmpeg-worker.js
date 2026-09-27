const { spawn, execFile } = require("child_process");


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




function synthesizeSpeech(text, output, options = {}) {
  return new Promise((resolve, reject) => {
    const clean = String(text || '').trim();
    if (!clean) return reject(new Error('TTS text is required.'));
    const voice = String(options.voice || 'en').replace(/[^a-zA-Z0-9_-]/g,'') || 'en';
    const speed = Math.max(80, Math.min(260, Number(options.speed)||165));
    execFile(options.espeakPath || process.env.ESPEAK_PATH || 'espeak', ['-v', voice, '-s', String(speed), '-w', output, clean], (error, stdout, stderr) => {
      if (error) return reject(new Error(`TTS failed: ${stderr || error.message}`));
      resolve({ code: 0, stdout, stderr });
    });
  });
}

async function backgroundReplace(input, background, output, options = {}) {
  const color = String(options.color || '0x00ff00').replace(/[^0-9a-fx]/gi,'') || '0x00ff00';
  const similarity = Math.max(0.01, Math.min(0.9, safeNumber(options.similarity,0.1)));
  const blend = Math.max(0, Math.min(1, safeNumber(options.blend,0.05)));
  return runFFmpeg(['-y','-i',background,'-i',input,'-filter_complex',`[0:v]scale=iw:ih[bg];[1:v]chromakey=${color}:${similarity}:${blend}[fg];[bg][fg]overlay=shortest=1[v]`,'-map','[v]','-map','1:a?','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',output],options);
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

  const saturation = Number(options.saturation);
  if (Number.isFinite(saturation) && Math.abs(saturation - 1) > 0.0001) filters.push(`eq=saturation=${Math.max(0, Math.min(2, saturation))}`);

  const sharpness = Number(options.sharpness);
  if (Number.isFinite(sharpness) && sharpness > 0) filters.push(`unsharp=5:5:${Math.max(0, Math.min(2, sharpness))}:5:5:0`);

  const fadeIn = Number(options.fadeIn);
  const fadeOut = Number(options.fadeOut);
  if (Number.isFinite(fadeIn) && fadeIn > 0) filters.push(`fade=t=in:st=0:d=${Math.min(30, fadeIn)}`);
  if (Number.isFinite(fadeOut) && fadeOut > 0 && Number.isFinite(options.totalDuration) && Number(options.totalDuration) > fadeOut) filters.push(`fade=t=out:st=${Math.max(0, Number(options.totalDuration)-fadeOut)}:d=${Math.min(30, fadeOut)}`);

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

async function mixAudioIntoVideo(inputVideo, inputAudio, output, options = {}) {
  const volume = Math.max(0, Math.min(3, safeNumber(options.volume, 1)));
  const originalVolume = Math.max(0, Math.min(3, safeNumber(options.originalVolume, 1)));
  const start = Math.max(0, safeNumber(options.start, 0));
  const args = ['-y', '-i', inputVideo];
  if (start > 0) args.push('-ss', String(start));
  args.push('-i', inputAudio);
  const filter = `[0:a]volume=${originalVolume}[base];[1:a]volume=${volume}[overlay];[base][overlay]amix=inputs=2:duration=first:dropout_transition=2,aresample=async=1[aud]`;
  args.push('-filter_complex', filter, '-map', '0:v:0', '-map', '[aud]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', String(options.audioBitrate || '192k'), '-movflags', '+faststart', output);
  return runFFmpeg(args);
}


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
   EDITOR PRO OPERATIONS
========================= */

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function escapeFilterText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

async function splitVideo(input, outputA, outputB, splitAt) {
  const point = Math.max(0.05, safeNumber(splitAt, 0));
  if (!point) throw new Error('A valid split time is required.');
  const first = ['-y', '-i', input, '-t', String(point), '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', outputA];
  await runFFmpeg(first);
  const second = ['-y', '-ss', String(point), '-i', input, '-c:v', 'libx264', '-c:a', 'aac', '-movflags', '+faststart', outputB];
  await runFFmpeg(second);
  return { outputA, outputB, splitAt: point };
}

async function cropVideo(input, output, options = {}) {
  const width = Math.max(2, Math.floor(safeNumber(options.width, 720)));
  const height = Math.max(2, Math.floor(safeNumber(options.height, 720)));
  const x = Math.max(0, Math.floor(safeNumber(options.x, 0)));
  const y = Math.max(0, Math.floor(safeNumber(options.y, 0)));
  return runFFmpeg(['-y', '-i', input, '-vf', `crop=${width}:${height}:${x}:${y}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function flipVideo(input, output, direction = 'horizontal') {
  const filter = String(direction).toLowerCase() === 'vertical' ? 'vflip' : 'hflip';
  return runFFmpeg(['-y', '-i', input, '-vf', filter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function reverseVideo(input, output) {
  return runFFmpeg(['-y', '-i', input, '-vf', 'reverse', '-af', 'areverse', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function freezeFrame(input, output, duration = 2) {
  const seconds = Math.max(0.1, Math.min(30, safeNumber(duration, 2)));
  return runFFmpeg(['-y', '-i', input, '-vf', `tpad=stop_mode=clone:stop_duration=${seconds}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-af', `apad=pad_dur=${seconds}`, '-t', `999999`, '-movflags', '+faststart', output]);
}

async function blurVideo(input, output, strength = 8) {
  const radius = Math.max(1, Math.min(32, Math.floor(safeNumber(strength, 8))));
  return runFFmpeg(['-y', '-i', input, '-vf', `boxblur=${radius}:1`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function stabilizeVideo(input, output) {
  return runFFmpeg(['-y', '-i', input, '-vf', 'deshake=x=-1:y=-1:w=0:h=0:rx=16:ry=16:edge=mirror', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function cleanNoise(input, output, amount = 12) {
  const strength = Math.max(0.1, Math.min(97, safeNumber(amount, 12)) / 100);
  return runFFmpeg(['-y', '-i', input, '-af', `afftdn=nr=${strength}:nf=-25`, '-c:v', 'copy', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function chromaKeyVideo(input, output, options = {}) {
  const color = String(options.color || '0x00ff00').replace(/[^0-9a-fx]/gi, '') || '0x00ff00';
  const similarity = Math.max(0.01, Math.min(0.9, safeNumber(options.similarity, 0.1)));
  const blend = Math.max(0, Math.min(1, safeNumber(options.blend, 0.05)));
  return runFFmpeg(['-y', '-i', input, '-vf', `chromakey=${color}:${similarity}:${blend}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function textOverlay(input, output, text, options = {}) {
  const safeText = escapeFilterText(text);
  if (!safeText.trim()) throw new Error('Text is required.');
  const size = Math.max(12, Math.min(180, Math.floor(safeNumber(options.fontSize, 48))));
  const x = options.x === undefined ? '(w-text_w)/2' : String(Math.max(0, Math.floor(safeNumber(options.x, 0))));
  const y = options.y === undefined ? 'h-text_h-60' : String(Math.max(0, Math.floor(safeNumber(options.y, 0))));
  const filter = `drawtext=text='${safeText}':fontcolor=white:fontsize=${size}:borderw=3:bordercolor=black:x=${x}:y=${y}`;
  return runFFmpeg(['-y', '-i', input, '-vf', filter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}

async function autoReframe(input, output, width, height) {
  const w = Math.max(2, Math.floor(safeNumber(width, 1080)));
  const h = Math.max(2, Math.floor(safeNumber(height, 1920)));
  const filter = `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`;
  return runFFmpeg(['-y', '-i', input, '-vf', filter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', output]);
}



/* =========================
   COMPLETE EDITOR TOOLKIT
========================= */

async function filterVideo(input, output, videoFilter, options = {}) {
  if (!videoFilter) throw new Error('Video filter is required.');
  return runFFmpeg(['-y','-i',input,'-vf',videoFilter,'-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',output], options);
}

async function filterAudio(input, output, audioFilter, options = {}) {
  if (!audioFilter) throw new Error('Audio filter is required.');
  return runFFmpeg(['-y','-i',input,'-af',audioFilter,'-c:v','copy','-c:a','aac','-movflags','+faststart',output], options);
}

async function transitionVideo(inputA, inputB, output, options = {}) {
  const duration = Math.max(0.1, Math.min(5, safeNumber(options.duration, 1)));
  const args=['-y','-i',inputA,'-i',inputB,'-filter_complex',`[0:v]fade=t=out:st=${Math.max(0, safeNumber(options.offset,1)-duration)}:d=${duration},setpts=PTS-STARTPTS[v0];[1:v]fade=t=in:st=0:d=${duration},setpts=PTS-STARTPTS[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]`,'-map','[v]','-map','[a]','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',output];
  return runFFmpeg(args, options);
}

async function addDrawText(input, output, text, options = {}) {
  const safeText = escapeFilterText(text);
  if (!safeText.trim()) throw new Error('Text is required.');
  const size = Math.max(10, Math.min(220, Math.floor(safeNumber(options.fontSize, 48))));
  const x = options.x === undefined ? '(w-text_w)/2' : String(options.x);
  const y = options.y === undefined ? '(h-text_h)/2' : String(options.y);
  const color = String(options.color || 'white').replace(/[^a-zA-Z0-9#]/g,'') || 'white';
  const border = Math.max(0, Math.min(20, Math.floor(safeNumber(options.borderWidth, 2))));
  const shadow = Math.max(0, Math.min(20, Math.floor(safeNumber(options.shadow, 2))));
  const start = Math.max(0, safeNumber(options.start, 0));
  const duration = safeNumber(options.duration, 0);
  const enable = duration > 0 ? `:enable='between(t,${start},${start+duration})'` : '';
  const filter = `drawtext=text='${safeText}':fontcolor=${color}:fontsize=${size}:borderw=${border}:bordercolor=black:shadowx=${shadow}:shadowy=${shadow}:x=${x}:y=${y}${enable}`;
  return filterVideo(input, output, filter, options);
}

async function addShape(input, output, options = {}) {
  const x = Math.max(0, Math.floor(safeNumber(options.x, 40)));
  const y = Math.max(0, Math.floor(safeNumber(options.y, 40)));
  const w = Math.max(2, Math.floor(safeNumber(options.width, 240)));
  const h = Math.max(2, Math.floor(safeNumber(options.height, 120)));
  const color = String(options.color || 'white@0.65').replace(/[^a-zA-Z0-9@#.,]/g,'') || 'white@0.65';
  const thickness = options.fill === false ? Math.max(1, Math.floor(safeNumber(options.thickness, 5))) : 'fill';
  return filterVideo(input, output, `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=${thickness}`);
}

async function addVignette(input, output, strength = 0.5) {
  const angle = Math.max(0.1, Math.min(1, safeNumber(strength, 0.5)));
  return filterVideo(input, output, `vignette=angle=${angle}:mode=forward`);
}

async function colorAdjust(input, output, options = {}) {
  const saturation = Math.max(0, Math.min(3, safeNumber(options.saturation, 1)));
  const brightness = Math.max(-1, Math.min(1, safeNumber(options.brightness, 0)));
  const contrast = Math.max(0, Math.min(3, safeNumber(options.contrast, 1)));
  const gamma = Math.max(0.1, Math.min(3, safeNumber(options.gamma, 1)));
  const hue = safeNumber(options.hue, 0);
  const filter = `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma=${gamma},hue=h=${hue}`;
  return filterVideo(input, output, filter);
}

async function colorBalance(input, output, options = {}) {
  const rs = Math.max(-1, Math.min(1, safeNumber(options.rs, 0)));
  const gs = Math.max(-1, Math.min(1, safeNumber(options.gs, 0)));
  const bs = Math.max(-1, Math.min(1, safeNumber(options.bs, 0)));
  return filterVideo(input, output, `colorbalance=rs=${rs}:gs=${gs}:bs=${bs}`);
}

async function panZoom(input, output, options = {}) {
  const scale = Math.max(1, Math.min(3, safeNumber(options.scale, 1.15)));
  return filterVideo(input, output, `scale=iw*${scale}:ih*${scale},crop=iw/${scale}:ih/${scale}:x=(iw-ow)/2:y=(ih-oh)/2`);
}

async function keyframeZoom(input, output, options = {}) {
  const zoom = Math.max(1, Math.min(2.5, safeNumber(options.zoom, 1.2)));
  return filterVideo(input, output, `zoompan=z='min(zoom+0.001,${zoom})':d=1:s=${Math.max(2, Math.floor(safeNumber(options.width,1080)))}x${Math.max(2,Math.floor(safeNumber(options.height,1920)))}:fps=${Math.max(1,Math.floor(safeNumber(options.fps,30)))}`);
}

async function silenceRemove(input, output, options = {}) {
  const start = Math.max(0, Math.min(1, safeNumber(options.startThreshold, 0.02)));
  const stop = Math.max(0, Math.min(1, safeNumber(options.stopThreshold, 0.02)));
  return filterAudio(input, output, `silenceremove=stop_periods=-1:stop_duration=${Math.max(0.05,safeNumber(options.minSilence,0.35))}:stop_threshold=${Math.max(0.0001,stop)}:start_periods=1:start_duration=${Math.max(0.02,safeNumber(options.minStartSilence,0.15))}:start_threshold=${Math.max(0.0001,start)}`);
}

async function voiceEnhance(input, output) {
  return filterAudio(input, output, 'highpass=f=70,lowpass=f=12000,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11');
}

async function enhanceVideo(input, output, options = {}) {
  const width = Math.max(2, Math.floor(safeNumber(options.width, 1920)));
  const height = Math.max(2, Math.floor(safeNumber(options.height, 1080)));
  return filterVideo(input, output, `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,unsharp=5:5:1.0:5:5:0`);
}

async function faceBlur(input, output, options = {}) {
  const w = Math.max(2, Math.floor(safeNumber(options.width, 240)));
  const h = Math.max(2, Math.floor(safeNumber(options.height, 240)));
  const x = Math.max(0, Math.floor(safeNumber(options.x, 40)));
  const y = Math.max(0, Math.floor(safeNumber(options.y, 40)));
  return filterVideo(input, output, `[0:v]split[base][blur];[blur]crop=${w}:${h}:${x}:${y},boxblur=12:2[face];[base][face]overlay=${x}:${y}`);
}

async function objectRemove(input, output, options = {}) {
  const w = Math.max(2, Math.floor(safeNumber(options.width, 120)));
  const h = Math.max(2, Math.floor(safeNumber(options.height, 120)));
  const x = Math.max(0, Math.floor(safeNumber(options.x, 0)));
  const y = Math.max(0, Math.floor(safeNumber(options.y, 0)));
  return filterVideo(input, output, `delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`);
}

async function rotateVideo(input, output, degrees = 0) {
  return filterVideo(input, output, `rotate=${safeNumber(degrees,0)}*PI/180:fillcolor=black@0`);
}

async function audioFade(input, output, options = {}) {
  const inD = Math.max(0, safeNumber(options.fadeIn, 1));
  const outD = Math.max(0, safeNumber(options.fadeOut, 1));
  const duration = Math.max(inD + outD + 0.1, safeNumber(options.totalDuration, 0));
  const filters=[];
  if(inD) filters.push(`afade=t=in:st=0:d=${inD}`);
  if(outD && duration) filters.push(`afade=t=out:st=${Math.max(0,duration-outD)}:d=${outD}`);
  return filterAudio(input, output, filters.join(','));
}

async function beatSync(input, output, options = {}) {
  const bpm = Math.max(40, Math.min(240, safeNumber(options.bpm, 120)));
  const beat = 60 / bpm;
  const factor = Math.max(0.5, Math.min(2, safeNumber(options.speed, 1)));
  return filterVideo(input, output, `setpts=PTS/${factor}`);
}

async function sceneDetect(input, output, options = {}) {
  const threshold = Math.max(0.05, Math.min(0.9, safeNumber(options.threshold, 0.35)));
  return filterVideo(input, output, `select='gt(scene,${threshold})',setpts=N/FRAME_RATE/TB`);
}

async function smartCut(input, output, options = {}) {
  return silenceRemove(input, output, options);
}

async function sceneExtend(input, output, duration = 2) {
  return freezeFrame(input, output, duration);
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
  mixAudioIntoVideo,
  splitVideo,
  cropVideo,
  flipVideo,
  reverseVideo,
  freezeFrame,
  blurVideo,
  stabilizeVideo,
  cleanNoise,
  chromaKeyVideo,
  textOverlay,
  autoReframe,
  filterVideo,
  filterAudio,
  transitionVideo,
  addDrawText,
  addShape,
  addVignette,
  colorAdjust,
  colorBalance,
  panZoom,
  keyframeZoom,
  silenceRemove,
  voiceEnhance,
  enhanceVideo,
  faceBlur,
  objectRemove,
  rotateVideo,
  audioFade,
  beatSync,
  sceneDetect,
  smartCut,
  sceneExtend,
  synthesizeSpeech,
  backgroundReplace,
  runCustom
};
