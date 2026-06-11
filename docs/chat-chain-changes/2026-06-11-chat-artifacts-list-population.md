---
date: 2026-06-11
pr: pending
feature: Chat artifacts list population
impact: The Artifacts drawer lists files already present in the current chat instead of waiting for a file-card click.
---

ChatPanel now scans the active session's non-tool messages for local file references and syncs them into the Artifacts store as chat-sourced artifacts. The drawer can show the current chat's generated files immediately, while clicking a file card still opens the drawer and loads preview content. Text/markdown artifacts load lazily when selected so the scan does not fetch every file in the transcript.
