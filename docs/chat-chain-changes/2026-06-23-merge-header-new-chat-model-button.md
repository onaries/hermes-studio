---
date: 2026-06-23
commit: local
feature: chat header model/new chat merge resolution
impact: Preserves both the upstream active-session model switch button and the fork's New Chat button in the chat header.
---

During upstream/main merge conflict resolution, the chat header keeps the new model switch button using `activeSessionModelLabel` while restoring the separate `New Chat` button that opens the new-chat drawer. This prevents the New Chat control from being repurposed as a model switch when pending approval/clarify cards are visible.
