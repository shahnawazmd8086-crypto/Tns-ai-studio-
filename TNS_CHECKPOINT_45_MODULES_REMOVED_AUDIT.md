# Checkpoint 45 — Standalone Modules Removed

## Removed from the application
- TNS Contact: UI, client handlers, server endpoints, module implementation, and module-only data files.
- Standalone TNS AI assistant/voice screens: UI and page-specific handlers.
- AI Image creation: UI, client handlers, image-job endpoints, image-job implementation, and module-only component/config files.
- Profile / Profile Settings social module: profile page, profile/shorts handlers, social/profile settings categories and controls.
- Short Video / Shorts: UI, bottom-navigation entry, feed/upload handlers, module icon, and module-only code.

## Preserved intentionally
- Main dashboard Q&A composer and its `/api/tns-ai/chat` endpoint.
- Dashboard photo/file attachment understanding and `/api/tns-ai/understand` endpoint.
- Dashboard microphone dictation, voice conversation, selected voice language, device voice, speech speed, spoken replies, and Stop Voice control.
- Login/signup/OTP and app-language selection.
- General App settings and Help & About settings.
- AI Video, Edit Video, Projects, and the shared upload/storage/editor code.

The retained TNS AI endpoints are shared infrastructure for the main dashboard, not a separate TNS AI screen/module. The five standalone modules have been removed from the live UI and dedicated client/server code, not merely hidden with CSS. The cleanup also removes module-only CSS selectors, stale profile modals, obsolete AI Image configuration flags/endpoints, generated AI Image artifacts and media-index records, legacy translation entries, the standalone Shorts export alias (the generic vertical 9:16 preset remains), and conflicting old locked feature-spec documents.

Automated `npm test`, JavaScript syntax checks, server/config syntax checks, and ZIP integrity checks were run. No live browser/mobile or physical microphone test has been performed; that remains necessary before deployment.
