---
date: 2026-06-06
pr: pending
feature: Todo drawer panel
impact: Adds a drawer tab that reconstructs and displays the current todo list for the active chat session from todo tool trace metadata.
---

The drawer-level todo view is presentation-only. It reads already persisted/live tool messages on the client, groups items by localized status, and does not change `/chat-run` protocol, persistence, tool execution, approval, or streaming semantics.
