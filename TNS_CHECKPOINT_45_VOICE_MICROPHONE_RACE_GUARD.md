# TNS Checkpoint 45 — Voice microphone session race guard

## Pre-change audit
- Opened and tested Checkpoint 44 before editing.
- Checkpoint 44 already protects home-chat dictation from stale `onstart`, `onresult`, `onerror`, and `onend` events using recognition-object identity.
- Checkpoint 44 also protects late home-chat AI replies / speech playback from stale requests.
- The separate TNS AI voice-conversation recognizer did not have the same complete guard: a late `/api/tns-ai/chat` response could still update status and start speech after the user stopped or changed language, and stale recognizer events could clear or overwrite a newer session.

## Focused changes
- Updated `public/app.js` only for the separate TNS AI voice-conversation microphone lifecycle.
- Added a recognition generation token; stop and voice-language changes invalidate the current generation.
- Stale result/error/end/start events are ignored when they no longer belong to the active recognition session.
- A late AI response or error from an invalidated microphone session no longer updates the current status, result area, or speech playback.
- Added `tests/voice-conversation-mic-race-audit.js` and registered it in `npm test`.
- No login, dashboard layout, or unrelated modules intentionally changed.

## Verification
- Run `npm test`, `npm run syntax`, and `unzip -t` on the generated ZIP.
- This is a static/code-level regression audit. No live AI provider or physical Android/iPhone microphone test was performed.
