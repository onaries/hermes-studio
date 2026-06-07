---
date: 2026-06-07
pr: pending
feature: Web UI /btw ephemeral side question
impact: Separates /btw from /background. /background and /bg still start separate background sessions, while /btw now runs an ephemeral side question with the current session context and renders the answer in-memory without saving a command turn or creating a visible background session.
---

Updated the chat command path so `/btw <question>` streams a side-answer bubble into the current chat pane, preserves the foreground run handler, and avoids persisting the side question to session history. `/background <prompt>` remains the long-running background-session command.
