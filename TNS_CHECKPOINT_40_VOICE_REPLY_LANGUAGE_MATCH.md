# TNS Checkpoint 40 — Voice/AI Reply Language Matching

## Scope
This checkpoint is limited to TNS AI voice conversation request language handling, the chat route's language selection, and an automated audit.

## Changes
- Voice conversation requests now send the selected voice locale as `replyLanguage`.
- When the user manually chooses a voice language, the request includes `preferRequestedLanguage: true`; the chat route normalizes and prioritizes that choice over script-based detection.
- In Auto mode, the route keeps the existing best-effort message-language detection and app-language fallback.
- Added `tests/voice-reply-language-match-audit.js` to the test suite.

## Limits
This verifies request construction and server language-selection logic, not whether a real AI provider follows the instruction perfectly. No live AI provider, physical microphone, or device speech-synthesis test was performed. Auto detection remains heuristic, especially for romanized and mixed-language text.
