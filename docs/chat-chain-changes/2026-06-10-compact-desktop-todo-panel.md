---
date: 2026-06-10
feature: compact-desktop-todo-panel
commit: pending
impact: The inline Todo panel remains presentation-only but uses a compact desktop width closer to live tool-call rows instead of stretching across the chat.
---

# Compact desktop Todo panel

The inline Todo panel keeps the same turn-scoped todo reconstruction and collapse behavior, but on desktop it now sizes to its content with a bounded max width and ellipsizes long item text with the full content preserved in the title tooltip. Mobile keeps the previous full-width/wrapping behavior for narrow screens. No chat protocol, todo execution, persistence, or streaming semantics change.
