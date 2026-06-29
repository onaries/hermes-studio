---
date: 2026-06-29
commit: pending
feature: terminal-workspace-auto-create
impact: Drawer terminals opened for coding-agent/chat sessions now replace the server's default auto-created `.hermes` terminal with a PTY rooted at the active session workspace.
---

# Terminal workspace auto-create

The terminal WebSocket server auto-creates a default PTY before the drawer can send the active chat session workspace. In the drawer, this made the first terminal for coding-agent sessions start in the Hermes profile directory instead of the selected workspace.

The drawer now detects an unscoped server-created terminal whose cwd differs from the active workspace, closes it immediately, and creates a replacement terminal with the active chat session id and workspace cwd.
