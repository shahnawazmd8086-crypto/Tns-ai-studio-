# TNS Studio Edit Video — Mobile UX Rebuild (2026-09-30)

This build replaces the previous long-card editor presentation with a mobile-first editing workspace.

## User-facing flow
1. Open Edit Video.
2. Preview is the primary focus.
3. Import/Add media is available immediately.
4. Timeline is directly below the preview.
5. Select a clip, then swipe the horizontal tool categories and tool cards.
6. Tap a tool to open its workspace; controls are contextual and Apply/Preview are provided.
7. Export is always visible in the editor header.

## Start tools
Add Media, Trim, Split, Crop, Text, Audio, Filters, Adjust, Speed, Export.

## Tool groups
Edit, Canvas & Motion, Text & Captions, Effects & Transitions, Colour, Audio, AI Tools, Advanced.

The implementation keeps TNS Studio branding and its existing editor state/export architecture. It uses the interaction pattern of modern mobile editors (preview → timeline → contextual horizontal tools) without copying CapCut's branding/assets.

## Verification
- `node --check public/app.js` PASS
- `node --check server/server.js` PASS
- `node tests/syntax.js` PASS
- `node tests/smoke.js` PASS
- `node tests/ui-audit.js` PASS
- `npm test` PASS (the smoke suite logs an expected invalid-credentials negative-case message while exiting successfully).
