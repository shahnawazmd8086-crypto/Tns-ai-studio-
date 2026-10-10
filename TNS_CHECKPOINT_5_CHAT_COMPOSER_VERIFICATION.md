# TNS Checkpoint 5 — Chat composer and attachments

## Requested UX
Keep the dashboard focused on chat. The composer’s `+` opens three separate actions:
- Photo: image-only picker.
- File/document: supported document and archive formats.
- Camera: opens a device camera capture chooser where supported (`capture="environment"`).

The message textarea remains the main question field; tapping it focuses the field and lets the mobile OS show its keyboard. Enter sends the message and Shift+Enter inserts a line break on supported keyboards.

## Implementation
- Added distinct photo, document, and camera file inputs.
- Added a compact accessible attachment popover and close-on-outside-click behavior.
- Reused the existing attachment preview, remove control, and `/api/tns-ai/understand` send path.
- Kept the current 1.2 MB attachment cap and extension allowlist. This is not an unrestricted “any file” upload; unsupported formats and larger files are rejected with an explanatory message.
- Updated UI audit checks for all new controls.

## Verification
- `npm run syntax`: PASS (`JS_SYNTAX_OK`)
- `npm test`: PASS (`SMOKE_TESTS_OK`, `UI_AUDIT_OK`)
- ZIP integrity is checked after packaging.

## Limitations
- Interactive Android/iPhone browser testing was not available in this environment. Camera behavior depends on browser/OS support; some devices may show a chooser rather than opening the camera immediately.
- The attachment UI does not itself add OCR or real AI document understanding. That depends on the configured backend/provider.
- Existing live research/provider limitations remain unchanged.
