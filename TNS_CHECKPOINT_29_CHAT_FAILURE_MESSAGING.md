# TNS — Checkpoint 29: Chat Failure Messaging

## Scope
Based on Checkpoint 28. Updated only the home chat submit error handler in `public/app.js`, added `tests/chat-failure-messaging-audit.js`, and included the new audit in `npm test`. Login, dashboard, editor, and other runtime features were not intentionally changed.

## Change
The chat error bubble now maps common network-fetch failures, unavailable/unconfigured AI-provider errors, and FileReader failures to clearer Hindi recovery messages. The existing retry button and preservation of the failed message/attachment remain in place. Unknown errors continue to show the server/browser error message.

## Verification
Run `npm test` and `npm run syntax` before distribution. Automated source audits do not prove a real AI provider, network outage, or mobile browser was exercised. Those require live integration testing.
