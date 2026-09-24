# TNS Studio — Launch Checklist

## Local audit completed
- JavaScript syntax checks pass across the source tree.
- Automated smoke test passes.
- Health endpoint verified.
- Signup/login/session flow verified with a test mobile account.
- Password is never returned in API user objects.
- Passwords use strong server-side scrypt hashing for new/changed passwords.
- Session cookie is HttpOnly and SameSite=Strict; production uses Secure + `__Host-` naming.
- Authentication state is server-authoritative; client localStorage is not used for session/user credentials.
- Login, OTP and reset-request throttling is present.
- Password reset uses a generic response for unknown accounts.
- Uploaded/exported media ownership is checked before serving.
- Security headers and API rate limiting are enabled.
- Legacy user-data migration path remains available.
- 184 ISO 639-1 language choices are available in the language selector.
- Legacy `TNS AI Studio` / old slogan branding is absent from the main app source.

## Before public production
- Configure a persistent production database.
- Configure private object/media storage and signed/authorized delivery.
- Configure real email/SMS OTP delivery.
- Configure Google OAuth credentials and callback handling.
- Configure real AI video/image/voice providers or the TNS self-hosted AI engine.
- Configure push notifications.
- Configure WebRTC signaling and STUN/TURN for TNS Contact calls.
- Configure billing, subscriptions, regional pricing, taxes and app-store/payment webhooks.
- Configure the ad network for Free creative features only.
- Configure secrets manager, monitoring, backups, WAF/CDN and abuse detection.
- Complete Android/iPhone testing over HTTPS.
- Complete external security review/penetration testing before handling sensitive production traffic.
