# TNS Studio

TNS Studio is the locked India-origin, worldwide-ready creator and communication workspace.

## Locked product direction
- Official name: **TNS Studio**
- Official TNS Studio logo/icon
- Final locked flow: Splash → Login/Signup → OTP → Language → Main Dashboard → AI Video / AI Image / Edit Video / TNS Contact / Projects / TNS AI / Premium / Settings
- One global **TNS Studio Settings** access at the top of the main workspace.
- Feature modules also have their own in-module settings.
- TNS Contact stays free and ad-free.
- India Premium target: ₹99/month; international pricing is regional/localized.
- User chooses their own password; password show/hide controls are included.
- Worldwide language/country architecture.

## Security baseline
- Server-authoritative sessions.
- HttpOnly + SameSite=Strict cookies; Secure + `__Host-` in production.
- Strong scrypt password hashing for new/changed passwords.
- Login/OTP/reset throttling.
- OTP expiry and attempt limits.
- Security headers and no-store API responses.
- Authenticated project/contact/job access.
- Uploaded/exported media ownership checks.
- No production secrets in source.

## AI
The AI layer is provider-independent. Development uses a mock provider; production requires a real provider or self-hosted TNS AI engine. See `AI_PROVIDER_SETUP.md` and `.env.example`.

## Languages
The selector contains the ISO 639-1 language registry (184 languages) with RTL metadata. English and Hindi translation packs are included. Other languages use an English fallback until their translation packs are supplied.

## Test
```bash
npm run syntax
npm test
```

## Important production note
A ZIP cannot purchase or create external services by itself. Before public launch, connect the production database, private object storage, OTP provider, OAuth, real AI providers/TNS AI engine, push notifications, WebRTC/TURN, billing, ads, monitoring, backups and secrets manager. The source intentionally refuses to pretend those external services are live when their credentials/infrastructure are not configured.
