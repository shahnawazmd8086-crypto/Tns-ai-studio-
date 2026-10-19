# Checkpoint 46 — Dashboard Chat Microphone Active Feedback

## Scope
- Only Dashboard chat microphone visual state and stop-on-second-tap behavior.
- Kept the existing voice conversation path: spoken question is submitted to TNS chat and the existing voice-reply flow is requested.
- Kept dictation path: speech becomes draft text and is not auto-sent.

## Changes
- Both the main voice-conversation mic and inner dictation mic get a visible listening state.
- While active, the mic uses a strong red gradient, glow/ring, and animated waveform/mic; reduced-motion preference is respected.
- On activation, status text explicitly says the microphone is ON and invites the user to speak.
- Tapping either mic again stops current speech recognition and shows a stopped message.
- `aria-pressed` and `data-listening` reflect current listening UI state.
- Added `tests/voice-microphone-visual-state-audit.js` and wired it into `npm test`.

## Verification
- `npm test`: passed all tests, including `VOICE_MICROPHONE_VISUAL_STATE_AUDIT_OK` and `HTTP_SMOKE_OK`.
- `npm run syntax`: passed (`JS_SYNTAX_OK`).
- ZIP integrity checked after creation.

## Limitations
- Browser speech recognition availability and permission still depend on the browser/device. This is not a live physical microphone test; no Android/iPhone manual test was performed in this environment.
- Voice conversation replies continue to depend on the existing configured chat provider; this change does not add a paid AI provider.
