# TNS Checkpoint 38 — Voice Language Matching

## Scope
This checkpoint only expands the TNS AI voice language choices and strengthens the automated voice-language audit. Login, dashboard layout, editor, and unrelated modules were not intentionally changed.

## Changes
- Added voice-language options for Odia, Arabic, Russian, Chinese (Mandarin), Japanese, Korean, Thai, Greek, and Hebrew.
- Extended automatic voice locale mapping for Marathi, Urdu, and the additional languages above.
- Expanded `tests/voice-language-choice-audit.js` to verify all 20 supported voice locale options and mappings.

## Verification
- `npm test` — PASS (all configured test scripts).
- `npm run syntax` — PASS (`JS_SYNTAX_OK`).
- ZIP integrity check — performed after packaging.
- Previous Checkpoint 37 ZIP SHA-256 verified unchanged.

## Limitations
- Speech recognition and speech synthesis depend on browser/device support and installed voices. Listing a language does not guarantee that a device has a voice or recognition engine for it.
- No live AI provider, physical Android/iPhone microphone, or device voice playback test was performed in this checkpoint.
