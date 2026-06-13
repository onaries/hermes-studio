---
date: 2026-06-14
feature: mobile-terminal-toolbar-scroll
commit: pending
impact: Mobile terminal header layout only; makes the terminal toolbar horizontally scrollable so font-size controls keep readable width on narrow screens.
---

# Mobile terminal toolbar scroll

- Keeps terminal header controls in a single row on mobile, but allows horizontal panning instead of squeezing controls.
- Gives the inline terminal font-size control enough width for the numeric value plus +/- buttons.
- Leaves terminal session, websocket, and PTY behavior unchanged.
