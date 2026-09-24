# TNS Studio — Locked Product Configuration

This package uses the pre-today TNS Studio release as its source and preserves its existing public/server work.

## Locked product rules represented here
- Brand: TNS Studio.
- India-origin, worldwide-ready architecture.
- Mobile identifiers use international/E.164 format.
- Passwords are never stored as plaintext; server-side scrypt hashing is used.
- Session lifetime is centrally controlled (default 1440 minutes / 24 hours).
- TNS Contact is always free, with no ads, premium payment, chat charges, or call charges.
- AI Video, AI Image, AI Voice and Edit Video support free + ads and premium/no-ads entitlement architecture.
- India premium target is around ₹99/month; international pricing is regional/localized and must remain centrally configurable.
- Main, feature and item settings are separated.
- TNS Contact app-lock and individual chat-lock requirements are represented in configuration.

## Provider-dependent production work
Real Google OAuth, real OTP email/SMS delivery, real AI provider credentials, WebRTC signaling/calling infrastructure, payment webhooks and persistent production database/storage still require deployment-specific providers/secrets. This ZIP does not contain secrets or pretend those external services are configured.
