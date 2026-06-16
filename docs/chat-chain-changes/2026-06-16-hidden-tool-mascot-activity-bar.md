---
date: 2026-06-16
feature: hidden-tool-mascot-activity-bar
commit: pending
impact: Adds a subtle vertical activity bar when the live tool mascot is hidden so the reserved tool area does not look empty.
---

## Summary

When the live tool mascot is disabled, the live tool area now keeps the mascot-height vertical footprint and shows a slim accent bar on the left. This preserves layout stability while making it clear that the reserved area belongs to live tool activity.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/chat-message-mobile-layout.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
