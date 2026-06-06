---
date: 2026-06-06
pr: pending
feature: Live reasoning current-turn targeting
impact: Reconnect resume now only reuses an assistant message for live reasoning when that assistant belongs to the latest user/command turn, preventing reasoning deltas from appearing inside an older answer.
---

This is client-side stream placement only. It preserves `/chat-run` protocol, persistence, tool execution, approval, and event semantics; reasoning deltas without a current-turn assistant still create the live assistant row below the current user message.
