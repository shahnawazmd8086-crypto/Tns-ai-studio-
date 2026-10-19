# TNS Dashboard Chat — Step 4 Verification

## Scope
This step only improves Dashboard text-chat conversation/history reliability. The locked baseline and Step 3 ZIP are not modified.

## Changes
- Added a conversation-view generation guard so late chat responses from an older view are discarded rather than added to a different visible chat.
- Invalidated pending history-save timers when starting a new chat or opening another saved chat.
- Bound each history save to the conversation ID and view generation captured for that save, avoiding a stale save changing the currently selected conversation.
- Made history-list refresh failures visible to the user instead of silently swallowing them.
- Added a notice when reopening a conversation containing an attachment marker: the file itself is not persisted, only the message/filename is. User must reattach the file to analyze it again.
- Added a regression audit for these protections.

## Automated verification performed
- `npm test` — PASS, including `CHAT_HISTORY_RACE_RELIABILITY_AUDIT_OK` and HTTP smoke tests.
- `npm run syntax` — PASS (`JS_SYNTAX_OK`).
- ZIP integrity (`unzip -t`) — checked after packaging.
- Local HTTP server served the app HTML successfully on port 4179.

## Limitations (do not treat as completed)
- This environment did not complete a full interactive browser/mobile workflow. Android/iPhone real-device testing is still pending.
- The default provider is a demo/mock provider unless a real AI provider is configured; passing tests does not mean the app has a real AI service connected.
- Attached files themselves are not saved with chat history; the UI now states this limitation. Reattach the file to analyze it again.
- This is not a guarantee of zero defects; please test the ZIP in your own GitHub/deployment environment before public release.
