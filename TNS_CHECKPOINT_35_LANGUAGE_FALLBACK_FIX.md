# TNS Checkpoint 35 — Language Fallback Normalization

## Scope
- Built from Checkpoint 34.
- Normalized common language codes/locales (for example `hi`, `ta-IN`, `kn`, `te-IN`, `bn-IN`, `mr`) into provider-friendly language names when text is empty or language detection is ambiguous.
- Preserved script-based detection and the existing best-effort Romanized Hindi heuristic.
- Extended `tests/language-reply-audit.js` to cover locale/code fallback and to verify the HTTP provider forwards chat input, including `replyLanguage` and `languageInstruction`.
- No login or unrelated feature changes.

## Verification
- `npm test`: PASS (all 16 test/audit scripts).
- `npm run syntax`: PASS (`JS_SYNTAX_OK`).
- ZIP integrity: checked after archive creation.

## Limits
- This is a code-level fallback correction, not proof of live AI output in every language.
- Native-script detection is best-effort; short, mixed-language, and Romanized non-Hindi text may need provider-side language detection.
- The configured AI provider must honor `languageInstruction`; the mock provider is still a demo.
- No real Android/iPhone browser test was performed in this checkpoint.
