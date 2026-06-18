---
date: 2026-06-17
pr: pending
feature: Stale live run reconciliation
impact: Chat sessions now periodically resume server state when the client has been idle but still thinks a run is streaming. If the server reports the run is no longer working and no queue remains, the client clears stale Stop/streaming state, closes any streaming assistant row, settles running tool rows, and unregisters stale session handlers.
---
