---
date: 2026-06-11
pr: pending
feature: Live tool entry animation
impact: Live tool rows now show a visible entry motion even when the first tool row mounts with the active run panel.
---

Strengthens live tool row entry feedback by enabling appear transitions for the `TransitionGroup` and adding a short-lived entry highlight class when new tool rows are appended during a run. This makes the first row and subsequent rows visibly slide/fade in while preserving the running pulse/sweep indicator and `prefers-reduced-motion` behavior.
