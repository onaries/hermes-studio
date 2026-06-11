---
date: 2026-06-12
feature: live-tool-fast-complete-animation
commit: pending
impact: Reduces noisy live tool row entry animation for tool calls that complete almost immediately.
---

## Summary

Fast-completed live tool rows now skip the stronger entry highlight so they do not flash while the success icon appears. The generic row enter motion was also softened to a shorter, smaller fade/slide while running tools still keep the visible progress highlight.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
