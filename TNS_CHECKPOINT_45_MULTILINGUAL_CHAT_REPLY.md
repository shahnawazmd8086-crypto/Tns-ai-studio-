# TNS Checkpoint 45 — Multilingual chat reply matching

## Scope
Dashboard text chat language detection and reply-language instruction only. This does not add a real AI provider or claim perfect language identification.

## Changes
- Expanded locale aliases for common languages and locale tags.
- Added best-effort detection for additional Unicode scripts and common Latin-script language markers.
- Added explicit reply-language request detection (for example, “Please answer in English”, “Hindi mein jawab do”, “Répondez en français”).
- Improved Urdu/Arabic-script handling using common Urdu-specific characters and selected-language fallback for shared scripts.
- Updated language regression tests for script languages, explicit requested reply language, and several Latin-script languages.

## Verification
- `npm test`: PASS (`LANGUAGE_REPLY_AUDIT_OK`, `CHAT_HISTORY_RACE_RELIABILITY_AUDIT_OK`, and other project audits).
- `npm run syntax`: PASS (`JS_SYNTAX_OK`).
- ZIP integrity: checked separately after packaging.

## Limitations
- This is lightweight heuristic detection, not a universal language-identification model. Very short messages, code-switching, similar languages, and Romanized writing may still be misclassified.
- The active mock/demo provider does not generate genuinely intelligent multilingual answers. A real multilingual AI provider must be configured for actual language understanding and fluent answers.
- Browser and Android/iPhone manual tests have not been performed in this change.
