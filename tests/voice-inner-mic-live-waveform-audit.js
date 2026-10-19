const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const checks = [
  ['inner microphone only', app.includes("const button = dictationButton;")],
  ['real microphone stream', app.includes("getUserMedia({ audio: true })")],
  ['audio analyser', app.includes('createAnalyser()') && app.includes('getByteTimeDomainData(samples)')],
  ['volume-reactive waveform bars', app.includes("bar.style.setProperty('--voice-level'")],
  ['meter cleanup stops tracks', app.includes('dictationMeterStream.getTracks().forEach(track => track.stop())')],
  ['cancel control preserved', html.includes('id="homeChatRecordingCancel"')],
  ['stop control preserved', html.includes('id="homeChatRecordingStop"')],
  ['send control preserved', html.includes('id="homeChatRecordingSend"')],
  ['waveform styles preserved', css.includes('#dashboard .recording-wave i')]
];
for (const [name, ok] of checks) {
  if (!ok) { console.error(`FAIL: ${name}`); process.exitCode = 1; }
  else console.log(`PASS: ${name}`);
}
if (!process.exitCode) console.log('VOICE_INNER_MIC_LIVE_WAVEFORM_AUDIT_OK');
