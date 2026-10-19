# TNS Checkpoint 27 — Combined Message + Attachment Retry Audit

## Scope
- Based on Checkpoint 26.
- Added an automated source audit for a chat request that contains both message text and a file attachment.
- The audit checks retention/restoration of the original message and same File object, retry file picker restoration where supported, combined request payload, failure-state preservation, and availability of a retry button after another failure.
- No login, dashboard, editor, AI provider, or other runtime feature code was changed.

## Verification
- Run `npm test` to execute all prior checks plus `CHAT_COMBINED_ATTACHMENT_RETRY_AUDIT_OK`.
- Run `npm run syntax` for JavaScript syntax validation.
- ZIP archive integrity should be checked after packaging.

## Limitations
This is a static source audit, not a real browser/network test. A live browser test with a real selected file, forced request failure, and repeated retry is still needed. It does not prove a live AI provider is connected.
