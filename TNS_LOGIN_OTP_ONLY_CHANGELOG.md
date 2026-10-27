# TNS Studio — OTP-only login cleanup

## Changes in this ZIP
- Login journey remains Email or Mobile Number → OTP → existing dashboard.
- Removed the standalone Change Password modal and the Settings Change Password form/handler.
- Removed obsolete forgot-password event wiring from the active app script.
- Disabled the mandatory first-login language-selection feature flag. Language registry, voice-language preferences, and chat language handling remain available; these are not a login gate.
- No dashboard/editor/AI-video feature redesign was intended.

## Important limitation
This is a UI/login-flow cleanup, not a claim that every legacy password-related server module has been deleted. Legacy signup/password routes and helper files remain in the repository for compatibility with existing automated tests and must be separately migrated/retired before claiming password authentication is removed from the backend.

## OTP integration
Real email/SMS OTP delivery still requires a provider. Development OTP exposure must remain disabled in production.
