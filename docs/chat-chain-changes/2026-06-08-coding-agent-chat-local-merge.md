---
date: 2026-06-08
pr: local
feature: Coding agent chat sessions local merge
impact: Preserves local /btw and background command handling while importing upstream coding-agent chat sessions, and keeps reconnect resume targeting from treating finished historical assistant messages as the active in-flight assistant.
---

Resolved the local fork merge conflict for upstream coding-agent chat sessions by combining the new coding-agent run payload with local out-of-band slash command behavior. Reconnect resume targeting now requires an explicit in-flight run marker before reusing a historical assistant message as the active run target, so new parsed output after reconnect is appended and auto-played correctly.
