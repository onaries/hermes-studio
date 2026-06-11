---
date: 2026-06-11
feature: inline-todo-panel-spacing
commit: pending
impact: The inline Todo panel keeps the same turn-scoped state and behavior, but now has more visual separation from the live tool-call area above it.
---

# Inline Todo panel spacing

The inline Todo panel remains a presentation-only reconstruction of the current turn's todo tool traces. Its top margin is increased so the panel reads as a separate block below the live thinking/tool-call indicator instead of visually touching the final tool rows. No chat protocol, streaming, persistence, or todo execution semantics change.
