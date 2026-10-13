const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');

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
console.log('CHAT_INPUT_EDGE_CASES_AUDIT_OK');
