---
date: 2026-06-11
pr: pending
feature: Resizable chat drawer
impact: The right chat drawer can be resized on desktop while preserving a minimum width and mobile full-width behavior.
---

Adds a desktop-only resize handle to the right drawer. Width is clamped to a minimum size and the available viewport width, persisted in localStorage, and can also be adjusted from the handle with keyboard arrows/Home/End. Chat run, terminal, files, artifacts, and persistence semantics are unchanged.
