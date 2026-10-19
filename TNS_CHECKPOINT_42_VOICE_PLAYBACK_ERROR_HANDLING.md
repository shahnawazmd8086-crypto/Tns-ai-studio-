# TNS Checkpoint 42 — Voice Playback Error Handling

## Scope
- Adds clearer UI status when no installed device voice matches the requested reply language.
- Handles browser speech errors for blocked playback, unavailable language, and unavailable selected voice with actionable messages.
- Keeps the text reply available and does not force a saved voice from a different language.
- Changes only `public/app.js`, `tests/voice-playback-error-handling-audit.js`, and the `package.json` test command.

## Verification
- Run `npm test`.
- Run `npm run syntax`.
- Run `unzip -t` against the produced ZIP.

## Limitation
This is source-level/automated verification. Real playback and device-specific speech error events require testing on physical browsers/devices with different installed voices.
