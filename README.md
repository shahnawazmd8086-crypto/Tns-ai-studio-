# TNS Studio

TNS Studio is an India-origin, globally available creator platform for AI video, AI images, video editing, and TNS Contact.

## Current base

- TNS Studio branding and reusable logo asset
- Email + mobile/password authentication
- Server-side scrypt password hashing
- HTTP-only session cookies
- OTP request/verify/login foundation with attempt limits
- Password reset endpoint foundation
- Language selection foundation
- AI video/image/voice provider architecture with a mock provider for development
- Video upload and FFmpeg export foundation
- TNS Contact foundation: registered-user contacts, chat, status, and call UI hooks
- Responsive mobile-first interface

## Production integrations still required

The base intentionally does not fake external services. Before public production launch, configure a persistent database/storage layer, real email/SMS OTP delivery, Google OAuth, real AI providers, and production WebRTC signaling/media infrastructure for voice/video calls.

## Data compatibility

The server uses the case-sensitive `server/Data` directory. `Auth.js` can read a legacy lowercase `server/data/users.json` store when the canonical store is empty, which prevents existing Render accounts from being silently lost during the case-fix migration.
