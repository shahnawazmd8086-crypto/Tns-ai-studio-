# TNS v6 — Login and Deployment

## Current mode
- Email/password gate is a LOCAL PROTOTYPE only.
- Guest Mode is available.
- No OTP provider is required right now.
- Do not treat the local password field as production authentication.

## Production authentication
Before public launch, replace the local gate with server-side auth:
- password hashing (Argon2id/bcrypt)
- secure, HttpOnly, SameSite cookies
- email verification / password reset
- CSRF protection
- rate limits and login lockout
- optional phone OTP later
- database-backed users and projects

## Deployment
The Node server is ready for a Node-compatible web service. Set environment variables on the host, not in the browser.

Required for real AI generation:
- TNS_VIDEO_PROVIDER
- TNS_VIDEO_API_KEY
- TNS_VIDEO_API_BASE
- TNS_VIDEO_MODEL

For production video editing:
- install FFmpeg on an isolated worker
- use private object storage
- use a queue and persistent database
- return signed URLs for completed files

## Important
The current mock provider does not generate a real video. It exists to validate the job flow until a real provider adapter and credentials are supplied.
