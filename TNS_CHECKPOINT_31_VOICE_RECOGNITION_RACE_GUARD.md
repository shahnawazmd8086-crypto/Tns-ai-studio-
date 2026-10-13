# TNS Studio Checkpoint 31 — Voice Recognition Race Guard

## Scope
Started from Checkpoint 30. This checkpoint changes only the chat voice-input/dictation lifecycle and its automated audit.

## Change
SpeechRecognition event handlers now ignore events from an older recognition instance after a newer session has become active. This prevents stale result/error/start/end events from modifying the current composer, status message, or microphone listening indicator.

## Verification
- `npm test`: run before packaging; expected to include all existing tests plus the stronger voice/dictation audit.
- `npm run syntax`: JavaScript syntax check.
- ZIP integrity: checked after packaging.

## Limits
Automated source checks do not substitute for testing microphone permission, speech recognition, and speech results in a real supported mobile browser. No live-device test is claimed.
