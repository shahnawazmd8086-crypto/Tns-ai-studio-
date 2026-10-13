# TNS Studio — Checkpoint 18: Demo Provider Transparency

## Base
Created as a new copy of Checkpoint 17. Checkpoint 13 remains preserved as the locked baseline; Checkpoint 17 is not overwritten.

## Change
- Chat API responses now include provider metadata and a `demo` boolean.
- File-understanding API responses also include provider metadata and a `demo` boolean, for both provider understand and chat fallback paths.
- When the configured provider is `mock`, the home chat clearly labels the response as a demo and tells the user that a real AI service is not connected.
- Added a dedicated static audit for this disclosure.
- Expanded `npm test` to run all current smoke and UI/voice/attachment/demo transparency audits.

## Verification performed
- `node tests/syntax.js` — PASS
- `node tests/smoke.js` — PASS (negative-login test cases print expected invalid-credentials error logs)
- `node tests/ui-audit.js` — PASS
- `node tests/voice-dictation-audit.js` — PASS
- `node tests/attachment-retry-audit.js` — PASS
- `node tests/demo-provider-honesty-audit.js` — PASS
- `npm test` — PASS
- ZIP integrity — checked after archive creation

## Limitations
These are code and automated tests. This environment did not perform a real authenticated AI-provider call or visual mobile browser test. A non-mock provider must be configured for actual AI answers. This change intentionally avoids presenting mock output as a real AI answer.
