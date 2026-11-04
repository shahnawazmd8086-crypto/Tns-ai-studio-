# TNS  Checkpoint 46 — Per-reply voice playback

## Requested behavior
- A completed TNS assistant reply displays its own Listen button underneath.
- Tapping that button reads only that reply aloud.
- Playback language follows the reply language returned by the chat API; script-based detection is a fallback.
- Existing global voice settings and voice conversation controls are retained.
- Existing automatic voice-conversation playback is retained and speaks reply text only (not the new button label).

## Files changed
- public/app.js: reply-language normalization/detection, per-reply Listen button, optional language argument for speech playback.
- public/style.css: styling for the per-reply Listen button.

## Validation
- node --check public/app.js: PASS
- npm test: all chained audit scripts completed successfully.
- Physical Android/iOS device playback and installed voice availability: not tested in this environment.
