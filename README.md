# TNS — Chat-first digital assistant (working project)

## Product direction
TNS is being moved toward a simple, chat-first assistant. A user should be able to open the home screen and immediately describe a problem, attach a supported file, or use supported voice input. The system should help find reliable information, plan next steps, perform only supported actions with permission, and distinguish a completed action from a verified result.

The locked scope is recorded in `TNS_MASTER_LIST_LOCKED_v1.0.md`.

## Current checkpoint
The existing ZIP began as TNS Studio, a creator and communication workspace. This checkpoint changes the main dashboard to a chat-first home and keeps the existing creator modules available under **All tools**. It does not mean the complete universal TNS service is finished.

## Existing foundations
- Node.js server and static frontend
- Account/authentication and session code
- Language configuration
- Existing TNS AI chat and file-understanding endpoints
- Project/media storage and creator modules
- Video editing/export foundations

Each foundation must be verified before being relied upon. A source file or button is not proof that an external service is connected or that a workflow is production-ready.

## Verification
Run:
```bash
npm run syntax
npm test
```

The included test suite checks JavaScript syntax, server smoke flows, and UI requirements. It is not a browser/device compatibility test, penetration test, or production readiness certification.

## External services
Real live web research, map/place search, email/SMS OTP, OAuth, production AI providers, persistent production storage, notifications, calling, and billing require the appropriate provider configuration or infrastructure. The app must not claim those integrations are live until verified.

## Safety baseline
- Do not invent live prices, addresses, availability, bookings, approvals, or status.
- Require user approval for sensitive actions.
- Do not collect or expose passwords or OTP secrets in chat.
- Keep the user's personal data to the minimum necessary.
