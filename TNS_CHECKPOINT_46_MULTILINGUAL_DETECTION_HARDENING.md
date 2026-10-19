# TNS — Checkpoint 46: Multilingual Detection Hardening

Scope: Dashboard text chat language detection only. No dashboard layout, voice messaging, or external research/agent behavior was changed.

Changes in this checkpoint:
- Distinguishes common Ukrainian, Bulgarian, Serbian, and Russian Cyrillic messages using language-specific vocabulary before the generic Cyrillic fallback.
- Improves explicit reply-language request coverage for Ukrainian.
- Refines shared Arabic-script handling with a small set of Persian-specific clues while retaining selected-language fallback where scripts overlap.
- Adds regression checks for the Cyrillic cases above.

Validation run in the project directory:
- `npm test` — passed (includes language reply audit and existing project audit scripts).
- `npm run syntax` — passed (`JS_SYNTAX_OK`).
- ZIP integrity checked after packaging.

Limitations:
- This is heuristic language detection, not universal language identification. Short text, transliteration, mixed-language messages, and related languages can still be misclassified.
- The default provider is demo/mock; this checkpoint does not make generated answers genuinely multilingual. A real multilingual AI provider is needed for that.
- No manual browser, Android, or iPhone test was performed in this checkpoint.
