# TNS — Checkpoint 17: Attachment Retry Fix

## Base
Built as a new copy from Checkpoint 16. Do not overwrite Checkpoint 13 or Checkpoint 16.

## Changes
- Removing a selected attachment clears all photo/file/camera input elements, not only the generic file input.
- If a chat request fails after a file was selected, the selected attachment is restored in the composer preview for retry.
- If a text+file request fails, the original text is restored in the composer as well.
- Failure status explicitly tells the user that the file and question were kept for retry.
- Added `tests/attachment-retry-audit.js` for static checks of these behaviors.

## Automated verification
- `node tests/syntax.js` — PASS
- `node tests/smoke.js` — PASS (the smoke test logs expected invalid-login attempts during negative-path checks)
- `node tests/ui-audit.js` — PASS
- `node tests/voice-dictation-audit.js` — PASS
- `node tests/attachment-retry-audit.js` — PASS
- ZIP integrity — to be checked after archive creation.

## Limitations
These are code/static and project smoke tests. No real phone camera, file picker, microphone, authenticated provider request, or mobile browser visual test was performed in this environment. Actual TNS AI file analysis still requires login and a configured provider.
