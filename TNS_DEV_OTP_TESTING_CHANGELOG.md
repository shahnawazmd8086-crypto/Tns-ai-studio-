# TNS Studio — Development OTP Testing Change

## Scope
- Added a development-only OTP disclosure path for testing without an email/SMS provider.
- Existing login UI, OTP UI, dashboard and other modules were not intentionally redesigned or changed.
- OTP response includes the generated six-digit code only when BOTH conditions are true: `NODE_ENV` is not `production` and `OTP_EXPOSE_CODE=true`.
- Production mode never returns the OTP, even if `OTP_EXPOSE_CODE=true` is accidentally configured.
- The API response states that no email/SMS was sent when development OTP is returned.
- Added `tests/dev-otp-safety-audit.js` and wired it into `npm test`.

## Local testing
Linux/macOS:
```sh
NODE_ENV=development OTP_EXPOSE_CODE=true npm start
```
Windows PowerShell:
```powershell
$env:NODE_ENV='development'; $env:OTP_EXPOSE_CODE='true'; npm start
```
Request an OTP through the app. The development API response can return `otp`, which can be entered in the OTP screen. No real email or SMS is sent.

## Production safety
Do not set `NODE_ENV=development` on a public production deployment. In production, OTP is never included in the response. Real email/SMS delivery requires a provider integration.

## Verification performed
- `node tests/dev-otp-safety-audit.js` — PASS (development returns code; production does not)
- `npm run syntax` — PASS
- `npm test` — PASS
- ZIP integrity — checked after packaging

No live Render/browser/device test was performed as part of this change.
