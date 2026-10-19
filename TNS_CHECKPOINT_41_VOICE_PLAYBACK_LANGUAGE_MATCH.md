# TNS Checkpoint 41 — Voice Playback Language Matching

## Scope
- Changed only `public/app.js`, `tests/voice-playback-language-match-audit.js`, and the `package.json` test command.
- Kept login, dashboard, app-language selection, and unrelated features unchanged.

## Fix
Voice playback now checks a saved device voice against the requested language before using it. It prefers a compatible manually selected voice, then an exact locale match, then a same-language regional variant. A saved voice in a different language is not forced onto the utterance. If no compatible voice is listed by the browser, the requested utterance locale remains set and the browser may use its own fallback; availability and pronunciation are device/browser dependent.

## Verification
Run `npm test` and `npm run syntax`. Automated source audits do not replace a real Android/iOS device test, live speech playback, or checks of installed voice packs.
