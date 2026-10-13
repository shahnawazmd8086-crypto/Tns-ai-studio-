# TNS Studio Checkpoint 39 — Language Preference Persistence

## Scope
Only voice preference persistence and its automated audit were changed. The app language (`tnsStudioLanguage`) remains separate from voice input/output language (`tnsVoiceLanguage`), device voice URI (`tnsVoiceURI`), and speech rate (`tnsVoiceRate`).

## Changes
- Restore the saved voice language only if it is still offered by the current voice-language selector.
- Persist voice-language selection across reloads.
- Persist and restore speech speed only when the saved speed is still one of the supported options.
- Keep the chosen system/device voice URI and restore it when that voice is available on the current device.
- Clear a stale auto-detected reply-language override when the user manually chooses a voice language.
- Added `tests/voice-language-persistence-audit.js` to the existing test suite.

## Limits
This is code/static audit coverage, not a real Android/iPhone restart, microphone, or speech synthesis test. Available device voices can differ by browser, OS, and installed voice packs. The existing logout behavior still removes the app-language choice; voice preferences remain local on that browser unless its storage is cleared.
