# TNS Checkpoint 7 — Chat-first dashboard simplification

## Changes
- Removed the separate Sarkari Kaam, Document Samjhein, Online Problem, and Shikayat Likhein dashboard cards.
- Removed the large intro/welcome panels so the main screen is centered on the chat area and composer.
- Kept the TNS Studio header and existing collapsed Saare Tools access.
- Kept the plus menu with three distinct actions: Photo, File/Document, Camera.
- Added a small empty-state hint inside the conversation area.
- Removed obsolete starter-card JavaScript behavior.

## Verification
- `npm run syntax`: PASS
- `npm test`: PASS (`SMOKE_TESTS_OK`, `UI_AUDIT_OK`)
- Expected invalid-login error logs appear during negative login smoke tests; the test command exits successfully.
- Real Android/iPhone visual testing, physical camera picker, and keyboard overlay could not be performed in this environment.

## Still not implemented
- Production AI provider, real live web research, and live maps/address search are not connected by this checkpoint.
- Uploading a file does not itself guarantee that the current AI provider can understand its contents.
