# TNS Studio Checkpoint 32 — Voice Playback Fallback

## Scope

This checkpoint continues from Checkpoint 31. It changes only the TNS AI speech-synthesis helper and its voice-generation status message, and adds an automated source audit for those behaviours. Login, chat submission, attachments, and other modules were not intentionally changed.

## Changes

- Trim reply text and report clearly if there is no text to read aloud.
- Detect browsers that lack Speech Synthesis or `SpeechSynthesisUtterance` and retain the readable text reply as fallback.
- Catch synchronous speech playback errors and report asynchronous utterance errors in the voice status.
- Avoid displaying a success status claiming voice playback was requested when browser speech support is missing.
- Add `tests/voice-playback-audit.js` to the `npm test` suite.

## Verification

Run `npm test` and `npm run syntax`. These are automated source and server checks; they do not replace live Android/iPhone microphone and speaker testing. A successful call to `speechSynthesis.speak()` means playback was requested, not that audio was physically heard.
