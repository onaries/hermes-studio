---
date: 2026-06-19
area: chat-ui
feature: terminal-live-panel-running-only
commit: pending
impact: Keeps active-run terminal rows visible after completion, but removes loading affordances and hides stale inactive panels.
files:
  - packages/client/src/components/hermes/chat/MessageList.vue
  - packages/client/src/components/hermes/chat/MessageItem.vue
  - tests/client/tool-trace-visibility.test.ts
  - tests/client/message-item-highlight.test.ts
---

# Terminal live panel running-only rows

## Summary

Completed terminal tool rows remain visible in the live progress panel while the overall run is still active, but their spinner/running badge disappears as soon as `toolStatus !== 'running'`. Restored stale terminal traces from inactive/completed runs stay in the transcript without re-opening the live loading panel.

## Why

After a terminal command finishes during a longer task, the row should stay visible as settled progress instead of disappearing. Only the loading affordance should be tied to active terminal execution. Once the whole run is inactive, stale terminal placeholders should not reopen the live loading panel.

## Verification

- Added client coverage that completed terminal tools stay visible during active work without spinner/running badge affordances.
- Added coverage that stale `running` terminal placeholders do not keep the live panel or transcript spinner animating after the run is inactive.
