# TNS Studio — Authentication and Deployment Notes

TNS Studio is designed as an India-origin product with worldwide availability.

## Authentication

- Passwords are hashed server-side with Node.js `scrypt`.
- Sessions are stored server-side and exposed to the browser only through an HttpOnly cookie.
- Production cookies use `Secure` when deployed behind HTTPS.
- OTPs expire and are limited to five attempts by default.
- OTP codes are not returned by the API unless `OTP_EXPOSE_CODE=true` is explicitly enabled for development/testing.

## Persistent storage

The current base uses local filesystem storage so the project can run without a database. This is suitable for development and controlled testing, not a final worldwide production deployment. Use a persistent database and object storage before public launch.

## External services

Configure real providers for Google OAuth, OTP delivery, AI generation, and TNS Contact voice/video calling. The code does not claim these external services are live when they are not configured.
