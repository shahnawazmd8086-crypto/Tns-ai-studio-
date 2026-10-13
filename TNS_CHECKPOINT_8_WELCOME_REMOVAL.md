# TNS Studio — Checkpoint 8: Remove Large Welcome Card

## Requested change
Remove the large welcome/intro area on the chat-first dashboard and allocate more vertical space to the chat area.

## Changes
- Dashboard intro/welcome elements are hidden with a scoped CSS rule, preserving the markup and other screens.
- Chat message area is allowed to grow and has a larger mobile minimum height.
- Composer, attachment menu, Research/link/address/compare chips, and the collapsed tools area are preserved.

## Verification
- Run `npm run syntax` and `npm test` from the project root.
- Automated checks do not replace visual testing on a real Android/iPhone browser. Camera, keyboard, and viewport behavior still need device verification.
