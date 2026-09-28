const fs = require("fs");
const path = require("path");
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const {
  exportVideo,
  mergeVideos,
  resize,
  normalizeSound,
  mute,
  customFFmpeg
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
        options.audioBitrate || "192k",
      trimStart: options.trimStart || 0,
      trimDuration: options.trimDuration || null,
      brightness: options.brightness || 0,
      contrast: options.contrast || 1,
      filter: options.filter || 'none',
      rotate: options.rotate || 0,
      speed: options.speed || 1,
      volume: options.volume ?? 1,
      saturation: options.saturation ?? 1,
      sharpness: options.sharpness || 0,
      fadeIn: options.fadeIn || 0,
      fadeOut: options.fadeOut || 0,
      totalDuration: options.trimDuration || 0
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


async function exportTimeline(timeline = {}, output, options = {}) {
  const rawClips = Array.isArray(timeline.clips) ? timeline.clips.filter(c => c && c.source && c.visible !== false) : [];
  const textLayers = Array.isArray(timeline.text) ? timeline.text.filter(t => t && t.visible !== false && String(t.text || '').trim()) : [];
  if (!rawClips.length && !textLayers.length) throw new Error('Timeline must contain at least one visible media or text layer.');

  const outputPath = ensureOutput(output);
  const width = Math.max(2, Number(options.width) || 1080);
  const height = Math.max(2, Number(options.height) || 1920);
  const fps = Math.max(1, Number(options.fps) || 30);
  const args = ['-y'];
  const clips = [...rawClips].sort((a, b) => (Number(a.start) || 0) - (Number(b.start) || 0));
  const filters = [];
  const audioLabels = [];
  const textFiles = [];
  let nextInput = clips.length;
  let totalDuration = 0;

  const safeNum = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const escapeFilterPath = pth => String(pth).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
  const escapeDrawText = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  // Every media clip is placed at its actual timeline start. Gaps remain gaps.
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const source = ensureFile(c.source, 'Timeline media');
    const duration = Math.max(0.1, safeNum(c.duration, 3));
    const trimStart = Math.max(0, safeNum(c.trimStart, 0));
    const trimEnd = Math.max(0, safeNum(c.trimEnd, 0));
    const sourceDuration = Math.max(0.1, duration - trimStart - trimEnd);
    const speed = Math.max(0.1, safeNum(c.speed, 1));
    const start = Math.max(0, safeNum(c.start, 0));
    const renderedDuration = sourceDuration / speed;
    totalDuration = Math.max(totalDuration, start + renderedDuration);

    if (c.type === 'image') {
      args.push('-loop', '1', '-t', String(sourceDuration), '-i', source);
    } else {
      if (trimStart > 0) args.push('-ss', String(trimStart));
      args.push('-t', String(sourceDuration), '-i', source);
    }

    const v = `clipv${i}`;
    const vf = [];
    const rotate = ((safeNum(c.rotate, 0) % 360) + 360) % 360;
    if (rotate === 90) vf.push('transpose=1');
    else if (rotate === 180) vf.push('hflip,vflip');
    else if (rotate === 270) vf.push('transpose=2');
    vf.push(
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      `fps=${fps}`
    );
    const brightness = safeNum(c.brightness, 0);
    const contrast = Math.max(0.1, safeNum(c.contrast, 1));
    const saturation = Math.max(0, safeNum(c.saturation, 1));
    const sharpness = Math.max(0, safeNum(c.sharpness, 0));
    if (Math.abs(brightness) > 0.001 || Math.abs(contrast - 1) > 0.001 || Math.abs(saturation - 1) > 0.001) {
      vf.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
    }
    if (sharpness > 0.001) vf.push(`unsharp=5:5:${Math.min(2, sharpness)}:5:5:0`);
    vf.push(`setpts=PTS-STARTPTS`, `setpts=${1 / speed}*PTS`, `trim=duration=${renderedDuration}`, `setpts=PTS-STARTPTS+${start}/TB`);
    filters.push(`[${i}:v]${vf.join(',')}[${v}]`);

    // Audio follows the same timeline position and speed as its video clip.
    if (c.type !== 'image') {
      let hasAudio = false;
      try {
        const probe = await execFileAsync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index', '-of', 'csv=p=0', source]);
        hasAudio = String(probe.stdout || '').trim().length > 0;
      } catch { hasAudio = false; }
      if (hasAudio && c.muted !== true) {
        const a = `clipa${i}`;
        const vol = Math.max(0, Math.min(3, safeNum(c.volume, 1)));
        const af = [`volume=${vol}`, 'aresample=48000', 'asetpts=PTS-STARTPTS'];
        if (Math.abs(speed - 1) > 0.001) {
          let remain = speed;
          while (remain > 2) { af.push('atempo=2'); remain /= 2; }
          while (remain < 0.5) { af.push('atempo=0.5'); remain /= 0.5; }
          af.push(`atempo=${remain}`);
        }
        af.push(`atrim=duration=${renderedDuration}`, 'asetpts=PTS-STARTPTS');
        if (safeNum(c.fadeIn, 0) > 0) af.push(`afade=t=in:st=0:d=${safeNum(c.fadeIn, 0)}`);
        if (safeNum(c.fadeOut, 0) > 0) af.push(`afade=t=out:st=${Math.max(0, renderedDuration - safeNum(c.fadeOut, 0))}:d=${safeNum(c.fadeOut, 0)}`);
        af.push(`adelay=${Math.round(start * 1000)}:all=1`);
        filters.push(`[${i}:a]${af.join(',')}[${a}]`);
        audioLabels.push(`[${a}]`);
      }
    }
  }

  // Create a full-length canvas so timeline gaps and overlaps are preserved.
  const baseDuration = Math.max(0.1, totalDuration || 0.1);
  args.push('-f', 'lavfi', '-t', String(baseDuration), '-i', `color=c=black:s=${width}x${height}:r=${fps}`);
  let videoBase = `[${nextInput}:v]`;
  nextInput += 1;
  filters.push(`${videoBase}setpts=PTS-STARTPTS[base0]`);
  let currentBase = '[base0]';
  clips.forEach((c, i) => {
    const next = `[comp${i}]`;
    filters.push(`${currentBase}[clipv${i}]overlay=0:0:eof_action=pass:shortest=0${next}`);
    currentBase = next;
  });

  // Text layers are rendered after video layers, preserving their timeline start/duration.
  for (let i = 0; i < textLayers.length; i++) {
    const t = textLayers[i];
    const start = Math.max(0, safeNum(t.start, 0));
    const duration = Math.max(0.1, safeNum(t.duration, 3));
    const end = Math.min(baseDuration, start + duration);
    const file = path.join(require('os').tmpdir(), `tns-editor-text-${process.pid}-${Date.now()}-${i}.txt`);
    fs.writeFileSync(file, String(t.text || ''), 'utf8');
    textFiles.push(file);
    const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    const fontPart = fs.existsSync(font) ? `fontfile='${escapeFilterPath(font)}':` : '';
    const x = Math.max(0, safeNum(t.x, 40));
    const y = Math.max(0, safeNum(t.y, 40));
    const fontsize = Math.max(8, Math.min(240, safeNum(t.fontSize, 56)));
    const color = String(t.color || 'white').replace(/[^a-zA-Z0-9#@.,]/g, '');
    const textFilter = `${fontPart}textfile='${escapeFilterPath(file)}':x=${x}:y=${y}:fontsize=${fontsize}:fontcolor=${color || 'white'}:box=1:boxcolor=black@0.35:boxborderw=12:enable='between(t,${start},${end})'`;
    const next = `[text${i}]`;
    filters.push(`${currentBase}drawtext=${textFilter}${next}`);
    currentBase = next;
  }

  let audioMap = null;
  const extraAudio = Array.isArray(timeline.audio) ? timeline.audio.filter(a => a && a.source && a.visible !== false && a.muted !== true) : [];
  for (let i = 0; i < extraAudio.length; i++) {
    const a = extraAudio[i];
    const source = ensureFile(a.source, 'Timeline audio');
    args.push('-i', source);
    const idx = nextInput++;
    const label = `extraa${i}`;
    const start = Math.max(0, safeNum(a.start, 0));
    const duration = Math.max(0.1, safeNum(a.duration, baseDuration - start));
    const vol = Math.max(0, Math.min(3, safeNum(a.volume, 1)));
    filters.push(`[${idx}:a]volume=${vol},aresample=48000,asetpts=PTS-STARTPTS,atrim=duration=${duration},adelay=${Math.round(start * 1000)}:all=1[${label}]`);
    audioLabels.push(`[${label}]`);
  }

  if (audioLabels.length) {
    filters.push(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:dropout_transition=2,aresample=48000,atrim=duration=${baseDuration},asetpts=PTS-STARTPTS[aout]`);
    audioMap = '[aout]';
  } else {
    args.push('-f', 'lavfi', '-t', String(baseDuration), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
    const silentIndex = nextInput++;
    filters.push(`[${silentIndex}:a]atrim=duration=${baseDuration},asetpts=PTS-STARTPTS[aout]`);
    audioMap = '[aout]';
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', currentBase,
    '-map', audioMap,
    '-t', String(baseDuration),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-b:v', String(options.videoBitrate || '8M'),
    '-c:a', 'aac',
    '-b:a', String(options.audioBitrate || '192k'),
    '-movflags', '+faststart',
    outputPath
  );

  try {
    return await customFFmpeg(args);
  } finally {
    for (const file of textFiles) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
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
  exportTimeline,
  merge,
  resizeVideo,
  normalizeAudio,
  removeAudio,
  getExportPresets,
  getExportInfo
};
