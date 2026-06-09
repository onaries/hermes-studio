---
date: 2026-06-09
feature: chat-input-autoresize
commit: pending
impact: ChatInput now resizes the composer after multi-line edits so Shift+Enter input remains visible.
---

# Chat input autoresize

The chat composer recalculates textarea height after text changes, draft restores, voice transcript insertion, and newline entry. Multi-line desktop input created with Shift+Enter grows up to a larger cap, making it clear how many lines are being edited before sending.
