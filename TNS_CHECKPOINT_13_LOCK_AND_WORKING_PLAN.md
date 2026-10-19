# TNS — Locked Baseline and Working Feature Plan

## Locked baseline
- Baseline archive: `TNS-Chat-First-Checkpoint-13-Centered-Voice-Controls.zip`
- SHA-256: `c86c9ee2a2ea70f95e1434ea5e6105c887c9c7f70082cf27575c1f602c7ad30d`
- Rule: never edit or overwrite Checkpoint 13. All changes must be made in a new numbered checkpoint copied from this baseline (or the latest user-approved checkpoint).

## Working checklist (complete in order; update this file in every new checkpoint)

### Step 1 — Composer and message flow
- [ ] Verify text input, Enter-to-send, arrow state, disabled/loading state, error state, and scroll-to-latest.
- [ ] Verify attachment menu opens/closes and photo/file/camera picker flows on supported devices.
- [ ] Verify upload size/type validation and attachment preview/removal.
- [ ] Verify server API `/api/tns-ai/chat` and `/api/tns-ai/understand` are implemented, configured, and fail honestly if provider is missing.
- [ ] Run syntax, smoke, UI audit, ZIP integrity checks.
- [ ] Test on real mobile browser; record device/browser and result (not yet performed).

### Step 2 — Inner microphone (dictation)
- [ ] Check browser SpeechRecognition support and permission-denied/error states.
- [ ] Convert speech to editable text; do not auto-send; arrow sends it.
- [ ] Test Hindi and English language selection on mobile.

### Step 3 — Outer microphone (voice conversation)
- [ ] Start/stop voice capture clearly and prevent duplicate recognition sessions.
- [ ] Send recognized speech through the same chat endpoint.
- [ ] Speak the actual returned reply using speech synthesis when available.
- [ ] Provide a visible text fallback and clear unsupported-browser/provider errors.
- [ ] Never imply an AI voice service is connected unless it really is.

### Step 4 — Attachments
- [ ] Test photo, camera, and document selection independently.
- [ ] Confirm attachment is sent to the server safely and server limits match client limits.
- [ ] Do not claim a file was analyzed unless the server/provider actually processed it.

### Step 5 — Final verification
- [ ] Run automated tests and archive integrity check.
- [ ] Test phone keyboard/composer placement, controls, permissions, and voice playback on a real device.
- [ ] Document every known limitation and the exact checks performed.

## Current honest status
The Checkpoint 13 code contains client-side wiring for chat requests, attachment selection, speech recognition, and speech playback. This alone does not prove that server routes/providers work or that the experience works on every mobile browser. Real mobile visual testing has not been performed in this environment. The checklist above must be verified before any feature is labelled fully working.
