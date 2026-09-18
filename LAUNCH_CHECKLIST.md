# TNS Studio — Launch Checklist

## Verified in this base
- JavaScript syntax checks pass.
- Signup creates an HTTP-only session.
- Email login works with normalized email addresses.
- Mobile login normalization is supported.
- Password verification uses scrypt verification rather than comparing newly generated hashes.
- Legacy lowercase `server/data/users.json` migration is supported.
- OTP expiration and maximum-attempt enforcement are implemented.
- Successful OTP login removes the OTP and creates a session.
- Contact chat/status flows are protected by authentication.
- Video job lookup is scoped to the authenticated user.
- Security response headers and basic API rate limiting are enabled.

## Before public production
- Configure a persistent production database.
- Configure persistent object/media storage.
- Configure real email/SMS OTP delivery.
- Configure Google OAuth credentials and callback handling.
- Configure real AI video/image/voice providers.
- Configure production WebRTC signaling and call infrastructure for TNS Contact.
- Configure monitoring, backups, logging and abuse controls.
- Test on Android and iPhone over HTTPS.
