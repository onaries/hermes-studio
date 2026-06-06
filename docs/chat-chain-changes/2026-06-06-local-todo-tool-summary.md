---
date: 2026-06-06
pr: pending
feature: Todo tool trace display
impact: MessageItem recognizes todo tool calls and shows a localized summary of item status changes instead of raw collapsed JSON previews.
---

Expanded tool details include the readable todo list while preserving raw arguments/result JSON for debugging. The follow-up duplicate `hasToolDetails` cleanup only fixes the component compile path after rebasing onto newer main. No change to `/chat-run` protocol, persistence, tool execution, approval, or streaming semantics.
