---
date: 2026-06-19
area: chat-ui
feature: terminal-live-panel-running-only
commit: pending
impact: Keeps terminal rows in the live loading/progress panel only while the terminal tool is actively running.
files:
  - packages/client/src/components/hermes/chat/MessageList.vue
  - tests/client/tool-trace-visibility.test.ts
---

# Terminal live panel running-only rows

## Summary

Completed terminal tool rows no longer remain in the live loading/progress panel. Terminal tools stay visible there only while `toolStatus === 'running'`; completed terminal traces remain available in the transcript.

## Why

After a terminal command finishes, keeping its completed row in the live progress area makes the panel look like terminal work is still loading. The live terminal affordance should indicate active work only.

## Verification

- Added client coverage that completed terminal tools are hidden from the live loading panel while non-terminal rows remain visible.
