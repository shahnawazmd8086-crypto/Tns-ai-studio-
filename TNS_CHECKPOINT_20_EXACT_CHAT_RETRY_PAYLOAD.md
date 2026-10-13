# TNS Studio Checkpoint 20 — Exact Chat Retry Payload

## Scope
Built only on Checkpoint 19. The only functional change is the existing failed-chat Retry button: clicking it restores the original failed message and the original failed attachment before resubmitting. This prevents a later draft or newly selected file from accidentally replacing the payload the user intended to retry.

## Preserved
- Checkpoint 19 Retry button and styling
- Voice dictation, voice playback status, attachment handling, demo-provider transparency
- Existing dashboard and unrelated modules

## Automated verification
- `npm test`
- `npm run syntax`
- `unzip -t` on the resulting ZIP

Automated checks do not constitute a real mobile/browser end-to-end test. A real backend/provider retry still needs manual verification in a running environment.
