---
date: 2026-06-13
feature: toggle-live-tool-mascot
commit: pending
impact: Adds a Display setting to hide the character/mascot shown beside live tool-call progress while preserving the compact tool rows.
---

## Summary

Display settings now include a `show_tool_mascot` toggle. It defaults on, matching current behavior. When disabled, the live tool-call area no longer renders the left-side thinking character and the tool-call panel shifts left to use the space.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/display-settings.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
