# TNS Studio Checkpoint 33 — Voice Language and Device Voice Selection

## Scope

Continues from Checkpoint 32. Adds language, available device voice, and speech-rate controls to the existing TNS AI Voice screen. Login, chat submission, attachments, and other modules were not intentionally changed.

## Changes

- Added explicit English (India), Hindi, and Auto (app language) selection.
- Speech recognition now uses the selected language instead of always forcing English (India).
- Added a device voice selector populated from browser speech-synthesis voices, including refresh when the browser fires `voiceschanged`.
- Remembers the selected device voice URI in local storage where available.
- Added speech-rate options and clamps the applied rate to a safe browser-supported range.
- Playback selects the chosen available voice; if that voice is unavailable, it tries a voice matching the selected language and otherwise lets the browser choose.
- Added an automated source audit for these behaviours.

## Verification

- `npm test`: PASS (all 15 test/audit checks, including `VOICE_LANGUAGE_CHOICE_AUDIT_OK`).
- `npm run syntax`: PASS (`JS_SYNTAX_OK`).
- ZIP integrity: verified after packaging.
- Checkpoint 32 source ZIP: SHA-256 verified unchanged.

## Limitations

These are automated source and server checks. Live Android/iPhone microphone and speaker tests have not been performed. The list of voices depends on each device/browser and its installed speech voices; a selected voice may not be available on every device.
