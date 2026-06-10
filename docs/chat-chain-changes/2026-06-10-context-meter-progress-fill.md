---
date: 2026-06-10
feature: context-meter-progress-fill
commit: pending
impact: The ChatInput context usage progress bar is visually restored without changing token/TPS accounting or chat protocol semantics.
---

# Context meter progress fill

The context usage bar fill is now block-level so the inline `width: <usagePercent>%` style produces a visible progress segment in the compact composer meter, including dark/mobile layouts. This is a CSS-only presentation fix; context token counts, live TPS estimation, and run/session behavior are unchanged.
