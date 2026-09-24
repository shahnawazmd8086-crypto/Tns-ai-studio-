# TNS Studio — Final Source Status

This ZIP is the audited source baseline for the locked TNS Studio UI/product direction.

## Implemented in source
- TNS Studio branding; legacy TNS AI Studio branding removed from the main app.
- User-chosen password flow with show/hide controls and server-side password hashing.
- Stronger scrypt password parameters for newly created/changed passwords; legacy hashes can still be verified for migration.
- Server-authoritative authentication with HttpOnly session cookies; browser localStorage is not used for authentication tokens or user identity.
- Secure production cookie attributes: HttpOnly, Secure in production, SameSite=Strict and `__Host-` session naming in production.
- Session timeout driven by central configuration (default 24 hours).
- Login/OTP/password-reset throttling and generic password-reset responses to reduce account enumeration.
- OTP expiry and attempt limits.
- Security headers, no-store API responses, origin checks and API rate limiting.
- Authenticated project/contact/job access.
- Authenticated ownership checks for uploaded/exported media; uploads are not anonymously served.
- 184 ISO 639-1 language choices with RTL metadata and native names where available; English/Hindi translation packs are included, while other languages currently use the English UI fallback until their translation pack is supplied.
- Provider-independent AI architecture with development mock provider and configurable HTTP provider for real production AI endpoints.
- Server-side FFmpeg export foundation.
- TNS Contact remains separate from Premium monetization.
- Final locked UI direction represented in the approved design references.

## External production services still required
The source code intentionally does not contain credentials and cannot manufacture real third-party services. Before public production, connect and test:
1. Persistent production database.
2. Object/media storage with private access and signed URLs.
3. Real email/SMS OTP provider.
4. Google OAuth credentials and callback handling.
5. Real AI Video/Image/Voice provider or TNS self-hosted AI engine.
6. Push notifications.
7. WebRTC signaling + STUN/TURN for real TNS Contact calls.
8. Payments/subscriptions and regional pricing.
9. Ad network integration for Free creative features.
10. Monitoring, backups, secrets manager, WAF/CDN and abuse controls.

These are deployment integrations, not safe items to fake or hard-code into the ZIP.
