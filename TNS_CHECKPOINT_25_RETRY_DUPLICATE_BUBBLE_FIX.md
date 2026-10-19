# TNS — Checkpoint 25: Retry Duplicate Bubble Fix

## Scope
- Based on Checkpoint 24.
- Only updates chat retry display behavior and adds an automated source audit.
- Login/authentication and unrelated features are untouched.

## Change
- A retry reuses the original user message bubble instead of adding a duplicate user bubble.
- The old failed response/status bubble is removed when retry starts; the new attempt creates a fresh pending response bubble.
- A one-shot retry flag identifies the next valid submit as a retry.

## Verification
- Run `npm test` and `npm run syntax` from the project root.
- ZIP integrity is checked after packaging.
- This is a source-level behavior change verified with static audit tests. Real mobile/browser testing with a deliberately failed and retried API request has not been performed.
