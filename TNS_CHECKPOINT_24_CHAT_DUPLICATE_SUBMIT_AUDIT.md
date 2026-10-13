# TNS Studio — Checkpoint 24 Chat Duplicate-Submit Audit

## Scope
- Based on Checkpoint 23.
- Adds one automated source audit for the home chat's in-flight submit guard and retry-click guard.
- Adds that audit to `npm test`.
- Does not change login/authentication code or runtime application behavior.

## What the audit checks
- The chat form prevents native submission.
- A submit while `isSending` is true returns before reading a new message payload.
- Sending state is set before awaiting the API request.
- Sending state is reset in `finally` on success/failure.
- Retry has a per-button duplicate-click guard.

## Verification limits
This is a source-level automated audit, not a simulated browser/network concurrency test. A real browser test with a delayed/failing API response is still required to prove observed duplicate-request behavior. Login, OTP, OAuth, real AI provider, voice, and attachment end-to-end behavior are outside this checkpoint.
