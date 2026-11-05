'use strict';
const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const handlerStart = app.indexOf("$id('homeChatVoice')?.addEventListener('click',()=>{");
if (handlerStart < 0) throw new Error('Composer action click handler is missing.');
const handlerEnd = app.indexOf("$id('voiceOnlyClose')?.addEventListener", handlerStart);
const handler = app.slice(handlerStart, handlerEnd);
const checks = [
  ['typed text uses form submit', /if\(input\.value\.trim\(\) \|\| attachedFile\)[\s\S]*?form\.requestSubmit\(\)/.test(handler)],
  ['empty composer opens voice conversation', /showPanel\('voiceConversation'\)[\s\S]*?beginVoiceOnly\(\)/.test(handler)],
  ['send is guarded while request is active', /if\(!isSending\) form\.requestSubmit\(\)/.test(handler)],
  ['existing composer action button remains in place', html.includes('id="homeChatVoice"')]
];
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) process.exitCode = 1;
}
if (!process.exitCode) console.log('CHAT_COMPOSER_SEND_VOICE_TOGGLE_AUDIT_OK');
