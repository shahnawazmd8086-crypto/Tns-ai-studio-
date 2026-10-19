# TNS — Checkpoint 28 Attachment Validation

## Scope
Based on Checkpoint 27. This checkpoint changes only TNS home-chat attachment validation and adds an automated audit.

## Changes
- Explicit allowlist for image extensions accepted by the chat photo/camera pickers.
- Photo/camera pickers reject unsupported image extensions even if a browser reports an image MIME type.
- Files at or above the displayed 1.2 MB limit are rejected consistently both at selection and submit time.
- Clear Hindi status messages remain visible for unsupported photo formats and oversized files.
- Added `tests/chat-attachment-validation-audit.js` to the `npm test` chain.

## Verification
Results are recorded after running `npm test`, `npm run syntax`, and ZIP integrity checks.

## Limitations
Automated source audit does not substitute for real mobile browser tests with camera/gallery/files, upload/network failures, or provider credentials.

### Automated test results
- `npm test`: PASS — all 11 test/audit scripts completed successfully (`SMOKE_TESTS_OK`, `UI_AUDIT_OK`, `VOICE_DICTATION_AUDIT_OK`, `ATTACHMENT_RETRY_AUDIT_OK`, `DEMO_PROVIDER_HONESTY_AUDIT_OK`, `CHAT_RETRY_BUTTON_AUDIT_OK`, `CHAT_DUPLICATE_SUBMIT_AUDIT_OK`, `CHAT_RETRY_DUPLICATE_BUBBLE_AUDIT_OK`, `HTTP_SMOKE_OK`, `CHAT_COMBINED_ATTACHMENT_RETRY_AUDIT_OK`, `CHAT_ATTACHMENT_VALIDATION_AUDIT_OK`).
- `npm run syntax`: PASS — `JS_SYNTAX_OK`.
- ZIP integrity: PASS — `unzip -t` reported no errors.
- Previous Checkpoint 27 ZIP SHA-256: PASS — unchanged.

The smoke tests print two expected invalid-login error logs from negative login test cases; the test command exits successfully. Login behaviour was not changed in this checkpoint.
