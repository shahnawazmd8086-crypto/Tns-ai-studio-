# TNS Checkpoint 46 — Final Text Chat Audit

Scope: Dashboard text chat only. Voice conversation and external web research are outside this checkpoint.

## Verification performed
- `npm test` passed, including smoke, language-reply, UI, retry/duplicate-submit, HTTP smoke, attachment validation/retry, context, history storage, and history race reliability audits.
- `npm run syntax` passed (`JS_SYNTAX_OK`).
- ZIP integrity check passed after packaging.
- Added regression coverage for Arabic and Urdu greeting disambiguation; fixed the overly broad Persian greeting rule that treated the shared word `سلام` as sufficient evidence for Persian.

## Known limitations / do not claim complete
- Language detection is heuristic and best-effort, not universal language identification. Very short text, romanized text, code-switching, related languages, and shared scripts can still be ambiguous.
- Arabic-script greetings can be ambiguous; the selected app language is used as a fallback for the Arabic/Urdu/Persian/Pashto family.
- The default provider is demo/mock; it does not guarantee real intelligent or fluent answers. A real AI provider must be configured for production-quality responses.
- Chat history does not persist the actual attachment bytes; users may need to attach a file again in a later chat/session.
- Automated checks were run in the Node environment. No manual Android/iPhone browser test was performed in this checkpoint.
