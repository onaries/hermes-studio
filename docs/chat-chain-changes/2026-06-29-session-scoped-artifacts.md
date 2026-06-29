---
date: 2026-06-29
commit: pending
feature: session-scoped-artifacts
impact: The Artifacts drawer now follows the active chat session instead of keeping a manually opened artifact from the previous session selected after switching chats.
---

# Session-scoped artifacts

Artifacts opened from chat output files are now tagged with the active chat session. When the user switches sessions, the Artifacts drawer hides artifacts from the previous session and selects the current session's generated artifacts when available.

Global/manual content artifacts without a session id remain available, but chat-origin file previews no longer make the drawer look stuck on the previous chat.
