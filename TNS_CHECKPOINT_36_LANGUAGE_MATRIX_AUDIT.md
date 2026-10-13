# TNS Studio — Checkpoint 36 Language Matrix Audit

## Scope
- Derived from Checkpoint 35.
- Changed only `server/utils/language.js` and `tests/language-reply-audit.js`, plus this report and the package test script remains unchanged.
- Login, dashboard, editor, attachment runtime, and other modules were not intentionally changed.

## Issues found and fixed
1. Locale normalization handled only some exact locale tags; tags such as `mr-IN`, `ur-IN`, and `zh-TW` could fall through as raw locale strings. Normalization now uses the language subtag consistently.
2. Multiple languages share writing systems. Script-only detection could label Marathi text as Hindi, Urdu text as Arabic, or Japanese text containing only Han characters as Chinese. If the supplied app/voice locale belongs to the same shared-script family, detection now respects that locale.
3. Expanded automated coverage with representative samples for every script language currently supported by the detector, plus locale normalization cases and shared-script fallback cases.

## Important limitations
- This is deterministic unit/source-code testing, not a certified language identification model.
- Hindi and Marathi, Arabic and Urdu, Chinese and Japanese can share scripts; context/fallback helps but cannot reliably disambiguate every message.
- Latin-script languages and Romanized forms other than the existing common Roman Hindi heuristic rely on the selected/app locale.
- Real AI response language still depends on the configured provider following `replyLanguage` and `languageInstruction`.
- No live AI-provider, Android/iPhone microphone, or device Text-to-Speech test was performed.

## Verification
- `npm test`: PASS (all configured tests/audits).
- `npm run syntax`: PASS (`JS_SYNTAX_OK`).
- ZIP integrity: checked after packaging.
- Previous Checkpoint 35 ZIP: preserved and SHA-256 verified.
