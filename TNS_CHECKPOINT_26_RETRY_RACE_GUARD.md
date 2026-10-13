# TNS Studio — Checkpoint 26: Retry Race Guard

## Scope
- Based on Checkpoint 25.
- Only adjusts the chat submit guard and its automated audit.
- Login/authentication and unrelated features are untouched.

## Change
- If a submit event arrives while a request is already active, it is still ignored.
- In that blocked path, the one-shot `retryingPreviousMessage` marker is cleared. This prevents a racing retry marker from leaking into a later ordinary message and suppressing its user bubble.

## Verification
- Run `npm test` and `npm run syntax` from the project root.
- Check ZIP integrity after packaging.
- Automated source audits do not replace real browser/mobile network testing; that has not been performed here.
