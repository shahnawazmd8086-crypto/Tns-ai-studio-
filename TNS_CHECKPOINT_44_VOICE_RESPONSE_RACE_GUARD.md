# TNS Checkpoint 44 — Voice/response race guard

## Scope
- Updated `public/app.js` only for voice-response race protection.
- Added `tests/voice-response-race-audit.js` and registered it in `npm test`.
- No login, dashboard layout, or unrelated feature changes intended.

## Changes
- Voice playback Stop broadcasts an event so pending home-chat auto-speech can be invalidated too.
- Home-chat captures the one-shot speak request at submit time rather than reading a mutable flag after the response returns.
- A speech generation token prevents a late response from auto-playing after Stop or a newer request generation.
- Old utterance start/end/error events cannot overwrite the current status after the generation changes.

## Verification
Run `npm test`, `npm run syntax`, and `unzip -t` on the generated ZIP.
This is a static/code-level race audit; no live AI provider or physical Android/iPhone speech synthesis test was performed.
