---
date: 2026-06-19
area: chat-store
feature: running-tool-placeholder-status
commit: pending
impact: Prevents resumed in-flight terminal/tool calls from appearing completed before their result arrives.
---

# Running tool placeholder status

## Summary

Persisted assistant `tool_calls` that do not yet have a matching tool-result message are now mapped as `running` instead of `done` when a session is resumed.

## Why

During an active long terminal call, the database can contain the assistant tool-call request before the tool-result row exists. Rehydrating that placeholder as completed made the UI show a done state even though the terminal/tool was still running.

## Verification

- Added client store coverage for resumed tool-call placeholders without results.
- Added coverage that completed tool calls with matching result rows remain `done`.
- Added coverage that replayed `tool.started` events reopen stale done placeholders when no result is present.
