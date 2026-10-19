# TNS Checkpoint 45 — Public Website Browser Inspection

## What changed
- Added `server/browser/BrowserAutomation.js`, an optional remote-browser adapter using a Browserless-compatible `/function` endpoint.
- Added authenticated `POST /api/tns-ai/browser/inspect` to inspect a public HTTP/HTTPS page and return title, URL, visible text, status, and a limited list of links.
- Added URL checks for unsupported protocols, embedded credentials, localhost/local domains, and common private IPv4 addresses.
- Added `tests/browser-automation-audit.js` to the standard test suite.

## Server configuration
Set these server-side environment variables (never in client-side JavaScript):
- `BROWSERLESS_TOKEN` — token from the browser service.
- `BROWSERLESS_FUNCTION_URL` — optional full Browserless-compatible function endpoint; defaults to `https://production-sfo.browserless.io/function`.

Restart the server after setting variables. If the token is absent, the endpoint returns HTTP 503 and clearly reports that browser automation is not configured.

## Endpoint
`POST /api/tns-ai/browser/inspect`

JSON body:
`{"url":"https://example.com"}`

Requires a valid TNS session. This initial step is read-only: it does not sign in, fill forms, upload files, click submit, accept terms, send messages, make purchases, or change website data. It does not bypass CAPTCHA or access controls.

## Validation
- `npm run syntax` passed.
- `npm test` passed, including `BROWSER_AUTOMATION_AUDIT_OK`.
- ZIP integrity should be checked after packaging.

## Important boundary
This is the first real-browser integration slice (public page inspection), not yet an autonomous multi-step website operator. Live execution needs a valid browser-service token and endpoint. Form interaction, user-visible permission checkpoints, and final submission workflow must be implemented and tested as separate steps before claiming that TNS can complete arbitrary website tasks.
