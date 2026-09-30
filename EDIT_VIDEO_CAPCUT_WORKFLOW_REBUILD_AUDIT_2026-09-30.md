# TNS Studio Edit Video — Mobile Workflow Rebuild Audit
Date: 2026-09-30

## Target
Rebuild the Edit Video user workflow around the documented CapCut-style mobile interaction model: import media, timeline-first editing, context-sensitive clip tools, horizontally scrollable tool categories, tool-specific workspaces, live preview, multi-track media, undo/redo, and export controls. This is an independent TNS Studio implementation; no CapCut proprietary source code or assets are used.

## Implemented in this build
- Timeline-first mobile editor shell.
- TNS Studio header with Undo/Redo and Export.
- Multiple video/photo import.
- Separate video, text/overlay and audio timeline lanes.
- Clip selection and context-sensitive quick tools.
- Horizontal category navigation: Edit, Audio, Text, Overlay, Effects, Filters, Adjust, AI, More.
- Horizontal tool strip inside each category.
- Direct timeline playhead seeking.
- Direct trim handles on selected clips.
- Drag/reorder timeline clips.
- Split, delete, duplicate, merge.
- Speed, crop/resize, rotate, flip, pan/zoom and keyframe workspace.
- Text/caption timeline layer workflow.
- Audio track workflow and TTS/voice workflow.
- Overlay workflow.
- Effects/filters/adjustment workspaces.
- AI/advanced tool workspaces using existing server transform/fallback architecture.
- Project backup/version/relink/batch/export-preset tools.
- Export sheet with 720p/1080p/1440p/4K, aspect ratio and FPS selection.
- Existing authenticated FFmpeg timeline export preserved.

## Verification run
- `node --check public/editor-pro.js` — PASS
- `npm test` — PASS (`SMOKE_TESTS_OK`, `UI_AUDIT_OK`)
- `npm run syntax` — PASS (`JS_SYNTAX_OK`)
- Server startup — PASS
- HTTP `/` — 200
- HTTP `/editor` — 200

## Important capability boundary
Real cloud/ML AI capabilities (for example production-grade ML motion tracking, speech recognition, background segmentation, etc.) still require their actual providers/models. The UI and local/server fallback architecture must not be represented as a connected paid AI service.
