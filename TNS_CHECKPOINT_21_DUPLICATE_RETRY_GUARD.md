# TNS — Checkpoint 21: Duplicate Retry Guard

## Scope
Built from Checkpoint 20. Only the failed-chat Retry click guard and its audit test were changed.

## Change
- Added a per-retry `retryStarted` guard so a repeated click/event cannot trigger another submission from the same Retry button.
- Keeps the Retry button disabled once retry starts.
- Resets the guard only if there is no retained message/file to submit, allowing the button to be used if the payload is restored.
- Added a static audit assertion for the duplicate-retry guard.

## Verification
- `npm test`: PASS (all six audit/smoke scripts).
- `npm run syntax`: PASS (`JS_SYNTAX_OK`).
- ZIP integrity: checked after packaging.
- Browser/mobile live-server end-to-end test: NOT performed; static audits do not prove real-device behavior.
