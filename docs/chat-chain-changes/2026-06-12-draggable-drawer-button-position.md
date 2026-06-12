---
date: 2026-06-12
feature: draggable-drawer-button-position
commit: pending
impact: The floating drawer button can be dragged and snapped to the right-top, right-middle, or right-bottom positions, with the choice persisted locally.
---

## Summary

The chat drawer launcher now supports vertical drag repositioning. Releasing the button snaps it to the nearest top, middle, or bottom magnet point on the right edge and stores the selected position in localStorage. Keyboard users can nudge the launcher with ArrowUp/ArrowDown while click/tap still opens the drawer.

## Verification

- `npm run test -- tests/client/drawer-button-position.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
