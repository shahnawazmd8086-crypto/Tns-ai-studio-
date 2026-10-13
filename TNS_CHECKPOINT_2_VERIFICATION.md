# TNS Checkpoint 2 — ZIP Verification & Home Chat Usability

## ZIP received and baseline verified
- The uploaded ZIP opened successfully and passed `unzip -t` with no archive errors.
- The project contains the chat-first TNS home from Checkpoint 1 plus the existing studio modules.
- `npm run syntax` passed before and after the new edits.
- `npm test` passed before and after the new edits.

## Changes in this checkpoint
- Added client-side file type validation for the formats shown in the upload picker.
- Added a clear 1.2 MB attachment limit message and rejects oversized/unsupported files before sending.
- Added a visible “Hataayein” action so users can remove an attached file before sending.
- Prevented repeated message submissions while a request is in progress; temporarily disables the composer controls and restores them afterward.
- Made the Research toggle expose its on/off state accessibly and clarified that live web search is not connected in this ZIP.
- Passed the selected research flag with file-understanding requests as well as text chat.
- Added automated checks for these usability safeguards and for authentication on the TNS AI chat endpoint.

## Current product placement recommendation
- Home: one clear TNS greeting, chat box, voice and attachment actions.
- Directly below chat: only the most common shortcuts (Research, Link, Address/Place, Compare).
- “Saare tools”: collapsed by default, containing creator modules and Projects so they do not crowd the everyday-assistance home.
- Premium, Help & Support, and Settings remain in the top menu, not in the primary home area.
- Long or advanced editor controls remain inside Edit Video instead of being exposed on the home screen.

## Verified limits — not to be misrepresented
- The bundled `mock` AI provider returns demo text, not a real AI answer.
- Research mode is only a request flag; this ZIP does not include a dedicated live web-search provider.
- Address/place shortcut is a prompt helper; live map/address lookup is not implemented.
- Uploaded file receipt is tested, but semantic reading of PDF/DOC/image requires a configured real AI provider.
- OTP email/SMS delivery, Google OAuth, persistent production database, push notifications, calls, and live bookings still require their external services/configuration.
- No real browser/device visual test or security penetration test is claimed; browser automation is unavailable in this environment.
