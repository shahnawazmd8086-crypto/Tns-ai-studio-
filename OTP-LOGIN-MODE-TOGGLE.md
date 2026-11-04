TNS  login mode

Current temporary mode: password login (OTP request is not called).

To re-enable the original OTP-first login later, add this environment variable to the existing Render Web Service:

OTP_LOGIN_ENABLED=true

To return to password-first login, set it to false or remove it.

The original OTP request, resend, and verification routes remain in server/server.js. Do not delete them.

Password login uses the existing /api/auth/login route and the password already set on the account. OTP-created accounts with an automatically generated password need a password setup/reset before password login can work.
