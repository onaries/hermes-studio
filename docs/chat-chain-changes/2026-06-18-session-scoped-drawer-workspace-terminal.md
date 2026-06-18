---
date: 2026-06-18
pr: pending
feature: Session-scoped drawer workspace and terminal
impact: Switching chat sessions resets the Workspace drawer path to that session's workspace root and scopes drawer terminal tabs per chat session. New drawer terminals are created with the active session workspace as cwd. The Files API now allows absolute workspace paths under the user's home directory when WORKSPACE_BASE is unset, matching the documented default, so macOS session workspaces no longer fall back to the Hermes home root.
---
