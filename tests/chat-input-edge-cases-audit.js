const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

assert(html.includes('id="homeChatInput"') && html.includes('maxlength="8000"'), 'Chat input must expose an 8000-character limit');
const start = app.indexOf("form.addEventListener('submit',async event=>{");
assert(start >= 0, 'Home chat submit handler must exist');
const end = app.indexOf('\n  });\n})();', start);
assert(end > start, 'Home chat submit handler must have a clear end');
const handler = app.slice(start, end);
assert(handler.includes('const message=input.value.trim();'), 'Whitespace should be trimmed before submission');
assert(handler.includes('if(!message && !attachedFile)return;'), 'Empty text without attachment must not submit a request');
assert(handler.includes('const shownMessage=message || `Is file ko samajhne mein madad karein: ${attachedFile.name}`;'), 'Attachment-only submission must create a useful user bubble');
assert(handler.includes('message:message || `Please analyze this file and explain it in the selected language: ${fileToSend.name}`'), 'Attachment-only submission must send a non-empty analysis prompt');
assert(handler.includes('if(attachedFile && attachedFile.size>=MAX_FILE_BYTES)'), 'Oversize attachment must be blocked before request');
assert(handler.includes('if(isSending){'), 'Concurrent submit must be blocked');

const keyboardPositioner = app.slice(app.indexOf('const positionComposerAboveKeyboard'), app.indexOf("input.addEventListener('input'", app.indexOf('const positionComposerAboveKeyboard')));
assert(keyboardPositioner.includes('window.visualViewport'), 'Mobile chat composer must follow the visual viewport when the keyboard opens');
assert(keyboardPositioner.includes('form.style.bottom = `${keyboardGap}px`'), 'Keyboard positioner must set the composer bottom dynamically');
const composerCss = css.slice(css.lastIndexOf('/* TNS chat composer placement update'));
assert(composerCss.includes('bottom: calc(12px + env(safe-area-inset-bottom, 0px));'), 'Normal composer position must respect the device safe area');
assert(composerCss.includes('bottom: 8px;'), 'Typing state must provide a fallback bottom position');
assert(!composerCss.includes('bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important'), 'Normal bottom must not block the dynamic keyboard offset');
const typingComposerCss = composerCss.slice(composerCss.indexOf('body.tns-chat-typing #dashboard .home-chat-composer'), composerCss.indexOf('body.tns-chat-typing #dashboard .home-assistant-shell'));
assert(typingComposerCss.includes('bottom: 8px;') && !typingComposerCss.includes('bottom: 8px !important'), 'Typing bottom must not block the dynamic keyboard offset');

console.log('CHAT_INPUT_EDGE_CASES_AUDIT_OK');
