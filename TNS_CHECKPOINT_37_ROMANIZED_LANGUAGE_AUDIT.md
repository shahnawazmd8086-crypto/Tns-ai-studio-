# TNS — Checkpoint 37 Romanized Language Audit

## Scope
- Built from Checkpoint 36 Language Matrix Audit.
- Changed only `server/utils/language.js` and `tests/language-reply-audit.js`, plus this report.
- No login, dashboard, editor, chat UI, or unrelated runtime features were changed.

## Fix
- Reduced false positives in Romanized Hindi detection by removing ambiguous standalone fragments such as `ho` and `ap` from the trigger list.
- Added common, more distinctive Hindi transliteration cues and regression tests for typical Romanized Hindi, short ambiguous fragments, English, and selected-language fallback.
- Kept fallback behavior for Latin-script text when no confident supported-language marker is found.

## Limits
- Romanized language detection is heuristic, not a full language-identification model. It cannot reliably distinguish all transliterated Hindi, Marathi, Urdu, or mixed-language messages.
- Other Latin-script languages and romanized forms still rely on the selected/app language unless a supported script or clear Hindi cue is detected.
- Real AI reply language still depends on the configured provider following `replyLanguage` and `languageInstruction`.
- No live AI provider or physical Android/iPhone microphone/TTS test was performed.

## Verification
- `npm test`: PASS.
- `npm run syntax`: PASS.
- ZIP integrity: checked after packaging.
- Checkpoint 36 ZIP hash: checked before and after; source ZIP preserved.
