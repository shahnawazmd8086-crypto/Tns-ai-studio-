const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('public/app.js', 'utf8');
const start = app.indexOf("form.addEventListener('submit',async event=>{");
assert(start >= 0, 'Home chat submit handler must exist');
const end = app.indexOf("\n  });\n})();", start);
assert(end > start, 'Home chat submit handler should have a clear end');
const handler = app.slice(start, end);

assert(handler.includes('event.preventDefault();'), 'Chat form must prevent native form submission');
assert(handler.includes('if(isSending){'), 'A submit while sending must be ignored');
assert(handler.includes('retryingPreviousMessage=false;'), 'A blocked retry must clear its one-shot marker');
assert(handler.indexOf('if(isSending){') < handler.indexOf('const message=input.value.trim();'), 'Sending guard must run before reading another payload');
assert(handler.includes('setSending(true);'), 'Sending state must be enabled before the request');
assert(handler.indexOf('setSending(true);') < handler.indexOf('await json('), 'Sending state must be enabled before awaiting the network request');
assert(/finally\s*\{\s*setSending\(false\);/.test(handler), 'Sending state must reset after success or failure');
assert(handler.includes('if(retryStarted) return;') && handler.includes('retryStarted=true;'), 'Retry must have a duplicate-click guard');
console.log('CHAT_DUPLICATE_SUBMIT_AUDIT_OK');
