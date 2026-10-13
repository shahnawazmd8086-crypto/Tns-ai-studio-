# TNS Studio — Checkpoint 16: Voice Dictation Hardening

## Baseline and scope
- Source ZIP: Checkpoint 15 (Voice Playback Status Fix).
- Checkpoint 13 remains the locked baseline and was not edited.
- This checkpoint changes only the home chat speech-recognition status/error handling and adds a focused source audit test.

## Changes
- Inner mic still uses speech recognition in dictation mode.
- Recognized words are appended to existing composer text, trimmed, and do not auto-send.
- Explicit status for microphone permission denial, no-speech, unrecognized speech, unsupported browser, and recognition start failures.
- Listening indicator is cleared on recognition end and start failure.
- Added `tests/voice-dictation-audit.js` for source-level checks.

## Automated verification
- `node tests/syntax.js` — PASS (`JS_SYNTAX_OK`).
- `node tests/smoke.js` — PASS (`SMOKE_TESTS_OK`, exit code 0; expected invalid-login-path errors are logged by the test).
- `node tests/ui-audit.js` — PASS (`UI_AUDIT_OK`).
- `node tests/voice-dictation-audit.js` — PASS (`VOICE_DICTATION_AUDIT_OK`).
- ZIP integrity — checked after packaging.
- Checkpoint 13 lock SHA-256 — rechecked and unchanged.

## Limits
- These are code and automated source tests, not a real-device microphone test.
- Speech recognition availability and permission behavior vary by browser/device.
- Actual TNS AI replies still require a configured provider.
