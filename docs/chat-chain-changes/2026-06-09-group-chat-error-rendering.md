---
date: 2026-06-09
feature: group-chat-error-rendering
commit: pending
impact: Assistant messages in group chat only use failed-response styling when finish_reason is error, avoiding false red styling for prose that starts with Error.
---

# Group chat error rendering

Assistant messages are styled as failed responses only when the message carries `finish_reason: 'error'`. Normal assistant prose that happens to start with `Error:` remains a regular assistant message.
