---
date: 2026-06-29
pr: pending
feature: Coding-agent model protocol selection
impact: Scoped coding-agent model changes now preserve the selected API protocol across reloads and subsequent runs.
---

Scoped coding-agent sessions persist the selected `apiMode` when changing models/providers, restore it into the client session state, propagate it through conversation/history summaries, and keep OAuth/subscription providers out of scoped model pickers.
