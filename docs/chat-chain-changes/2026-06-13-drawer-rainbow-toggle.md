---
date: 2026-06-13
feature: drawer-rainbow-toggle
commit: pending
impact: Adds a display setting that controls the animated rainbow glow on the floating chat drawer button while preserving default-on behavior.
---

## Summary

- Added `display.show_drawer_rainbow` as a default-on display preference.
- Gates the floating drawer button's animated rainbow glow behind the setting.
- Keeps a neutral static shadow when the rainbow glow is disabled.
