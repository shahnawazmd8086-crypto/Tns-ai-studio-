# TNS Studio Checkpoint 34 — Same-language reply work

## Scope
- Added best-effort language detection for common writing systems and a small romanized-Hindi heuristic.
- Chat and file-understanding API calls now pass `replyLanguage` and a clear `languageInstruction` to the configured AI provider.
- API responses expose `replyLanguage` so voice playback can select a corresponding speech locale when available.
- Expanded the TNS AI Voice language menu to include common Indian languages and made app-language-to-speech-locale mapping explicit.
- Added `tests/language-reply-audit.js` and included it in `npm test`.

## Important limits
- Language detection is best-effort, not universal or guaranteed for short/mixed/romanized text.
- The configured AI provider must honour `languageInstruction`; the app cannot guarantee response quality for languages unsupported by that provider.
- Browser speech recognition and text-to-speech depend on device/browser language support and installed voices.
- The development mock provider remains a transparent demo and is not a real multilingual AI.
