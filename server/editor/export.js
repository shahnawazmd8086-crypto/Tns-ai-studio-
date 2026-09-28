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
  const clips = Array.isArray(timeline.clips) ? timeline.clips.filter(c => c && c.source) : [];
  if (!clips.length) throw new Error('Timeline must contain at least one media clip.');
  const outputPath = ensureOutput(output);
  const width = Math.max(2, Number(options.width) || 1080);
  const height = Math.max(2, Number(options.height) || 1920);
  const fps = Math.max(1, Number(options.fps) || 30);
  const args = ['-y'];
  const active = [...clips].sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0));
  let previousEnd = 0;
  const inputMeta=[];
  for (const c of active) {
    const source = ensureFile(c.source, 'Timeline media');
    const start = Math.max(0, Number(c.start)||0);
    const gap = Math.max(0, start - previousEnd);
    const duration = Math.max(0.1, Number(c.duration)||3);
    const trimStart = Math.max(0, Number(c.trimStart)||0);
    const effectiveDuration = Math.max(0.1, duration - Math.max(0, Number(c.trimEnd)||0));
    let hasAudio=false;
    if (c.type !== 'image') {
      try { const probe=await execFileAsync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=index','-of','csv=p=0',source]); hasAudio=String(probe.stdout||'').trim().length>0; } catch { hasAudio=false; }
    }
    if (c.type === 'image') args.push('-loop','1','-t',String(effectiveDuration),'-i',source);
    else {
      if (trimStart > 0) args.push('-ss',String(trimStart));
      args.push('-t',String(effectiveDuration),'-i',source);
    }
    inputMeta.push({gap,effectiveDuration,hasAudio,type:c.type});
    previousEnd = Math.max(previousEnd, start + duration);
  }
  const filters=[]; const concatV=[]; const concatA=[]; let nextInput=active.length;
  active.forEach((c,i)=>{
    const meta=inputMeta[i];
    const videoLabel=`v${i}`, audioLabel=`a${i}`;
    const gapVideo=meta.gap>0?`,tpad=start_mode=add:start_duration=${meta.gap}`:'';
    filters.push(`[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps},setpts=PTS-STARTPTS,trim=duration=${meta.effectiveDuration}${gapVideo}[${videoLabel}]`);
    if (meta.type==='image' || !meta.hasAudio) {
      args.push('-f','lavfi','-t',String(meta.effectiveDuration),'-i','anullsrc=channel_layout=stereo:sample_rate=48000');
      const silentIndex=nextInput++;
      const delay=meta.gap>0?`,adelay=${Math.round(meta.gap*1000)}:all=1`:'';
      filters.push(`[${silentIndex}:a]asetpts=PTS-STARTPTS${delay},atrim=duration=${meta.effectiveDuration+meta.gap}[${audioLabel}]`);
    } else {
      const vol=Math.max(0,Math.min(3,Number(c.volume??1)));
      const delay=meta.gap>0?`,adelay=${Math.round(meta.gap*1000)}:all=1`:'';
      const mute=c.muted?'volume=0,':'';
      filters.push(`[${i}:a]${mute}volume=${vol},aresample=48000,asetpts=PTS-STARTPTS${delay},atrim=duration=${meta.effectiveDuration+meta.gap}[${audioLabel}]`);
    }
    concatV.push(`[${videoLabel}]`); concatA.push(`[${audioLabel}]`);
  });
  filters.push(`${concatV.join('')}concat=n=${active.length}:v=1:a=0,format=yuv420p[vout]`);
  filters.push(`${concatA.join('')}concat=n=${active.length}:v=0:a=1[aout]`);
  const audioItems=Array.isArray(timeline.audio)?timeline.audio.filter(a=>a&&a.source):[];
  const extraLabels=['[aout]'];
  audioItems.forEach((a,idx)=>{
    const inputIndex=nextInput++;
    args.push('-i',ensureFile(a.source,'Timeline audio'));
    const start=Math.max(0,Number(a.start)||0); const vol=Math.max(0,Math.min(3,Number(a.volume??1)));
    filters.push(`[${inputIndex}:a]volume=${vol},adelay=${Math.round(start*1000)}:all=1[a${idx+1}]`); extraLabels.push(`[a${idx+1}]`);
  });
  if(audioItems.length) filters.push(`${extraLabels.join('')}amix=inputs=${extraLabels.length}:duration=longest:dropout_transition=2[aoutfinal]`);
  args.push('-filter_complex',filters.join(';'),'-map','[vout]','-map',audioItems.length?'[aoutfinal]':'[aout]','-c:v','libx264','-pix_fmt','yuv420p','-r',String(fps),'-b:v',String(options.videoBitrate||'8M'),'-c:a','aac','-b:a',String(options.audioBitrate||'192k'),'-movflags','+faststart',outputPath);
  return customFFmpeg(args);
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
