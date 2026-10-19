# TNS — Checkpoint 23: HTTP Smoke Verification

## Basis and scope
Built from Checkpoint 22. No existing app feature code, UI, auth logic, chat retry logic, or editor logic was intentionally changed. This checkpoint adds a real HTTP smoke test to `npm test` and documents what was actually verified.

## New automated test
`tests/http-smoke.js` starts the TNS server on a free local port and checks:
- `GET /health` returns HTTP 200 and `{ ok: true, name: "TNS API" }`.
- `GET /` returns non-empty HTML.
- `GET /app.js` returns non-empty JavaScript.
- `GET /style.css` returns non-empty CSS.
- The test server process is stopped after the checks.

## Verification
- Checkpoint 22 ZIP integrity before work: PASS (`unzip -t`).
- Existing `npm test` before changes: PASS (all 6 existing checks).
- Existing `npm run syntax` before changes: PASS (`JS_SYNTAX_OK`).
- New HTTP smoke test is included in `npm test`; its result must be reported from the final run, not assumed.
- Chromium headless process did not exit within the environment's 12-second limit, so a visual browser screenshot/DOM test is **inconclusive**. It is not reported as passed.

## Limits
This test confirms local server startup, health route, and delivery of the core frontend assets. It does not prove login, OTP delivery, AI provider connectivity, editor export, contact real-time messaging, or full mobile visual behavior.
