# TNS Studio — Final Consolidated Audit Package

Source: `TNS_Studio_UPLOAD_READY.zip` (latest available package).

## Consolidated fixes in this package
- Authentication data path is Linux case-safe and preserves legacy lowercase data.
- Password creation/reset now consistently requires 8+ characters with uppercase, lowercase, number and special character.
- Password verification uses scrypt and timing-safe comparison.
- OTP expiry, maximum attempts and successful-login cleanup are implemented.
- Sessions are persisted to `server/Data/sessions.json` with a 24-hour default timeout configurable by `SESSION_TIMEOUT_MINUTES`.
- Security headers include an active Content-Security-Policy and same-origin checks for state-changing API requests.
- `/api/editor/export` is present and connected to FFmpeg with trim, resize, brightness, contrast, filters, rotation, speed and volume handling.
- FFmpeg speed export avoids duplicate audio filters.
- Uploaded media paths are restricted to the TNS Studio uploads directory.
- Server-side project CRUD is protected by authenticated owner checks.
- Project IDs are sanitized before filesystem access.
- TNS Contact chat/status endpoints require authentication.
- Login/signup password visibility controls are available in the main UI.

## Verification performed on this package
- Node syntax check across all server and public JavaScript files: PASS.
- Server `/health`: PASS.
- Server `/api`: PASS.
- Weak-password signup rejection: PASS.
- Strong-password signup + HTTP-only session: PASS.
- Authenticated `/api/auth/me`: PASS.
- Project create/list with owner isolation: PASS.
- Video upload: PASS.
- FFmpeg MP4 export through `/api/editor/export`: PASS.
- Logout invalidates the session: PASS.

## External services still require deployment configuration
This package does not fabricate third-party credentials or claim external services are live. Real Google OAuth, real email/SMS OTP delivery, real AI video/image/voice generation, production database/object storage and Internet voice/video calling require their respective provider credentials/infrastructure. The included AI provider is intentionally a mock/development provider until a real provider is configured; see `AI_PROVIDER_SETUP.md`.

## Release note
The package is consolidated and internally verified for the included local/server functionality. Public worldwide production release still requires the external-service and persistent-infrastructure items above.
