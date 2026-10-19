# TNS Checkpoint 19 — Chat Retry Button

## Base and preservation
- Built from Checkpoint 18 source.
- Checkpoint 18 ZIP is kept unchanged; this is a new checkpoint.

## Change
- A failed chat request now shows an explicit “Dobara koshish karein” button.
- The existing error recovery continues restoring typed text and selected attachment.
- Retry submits only when a restored message or attachment is available.

## Verification
- `npm test`
- `npm run syntax`
- `unzip -t` on the generated ZIP

Automated source audits do not replace a live browser/mobile test. Real API behavior, microphone/camera permission flow, and connected AI provider still need device/service testing.
