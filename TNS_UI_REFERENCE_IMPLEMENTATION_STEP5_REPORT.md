# TNS Studio UI Reference Implementation — Step 5

Date: 2026-10-20

## Scope
Continued from Step 4. This step only adjusts the chat composer keyboard positioning and narrow-mobile composer layout. AI Video and Edit Video were not intentionally changed.

## Changes
- Repositions the composer again on the next animation frame and shortly after input focus, because mobile keyboards can resize the visual viewport asynchronously.
- Computes the composer bottom offset from the visual viewport's lower edge, clamps it to a safe range, and falls back to an 8px bottom offset when `visualViewport` is unavailable.
- Recalculates composer positioning and textarea sizing after device orientation changes.
- Prevents the input and composer from shrinking below usable width; keeps attachment, dictation, and voice controls from shrinking, with slightly more compact sizing at <=390px.

## Verification performed
- `node tests/syntax.js`: PASS (`JS_SYNTAX_OK`).
- `npm test`: PASS (exit code 0; all configured audit/smoke scripts completed successfully).
- ZIP integrity (`unzip -t`): to be checked after packaging.

## Limitations
- No real mobile device/browser visual test was performed in this step. The changes are code-level safeguards and passing automated checks, not proof of rendering on every phone or keyboard.
- User should test on 360px and 390px widths and with the Android/iOS keyboard open before release.
