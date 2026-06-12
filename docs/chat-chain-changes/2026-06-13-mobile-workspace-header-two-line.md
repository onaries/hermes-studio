---
date: 2026-06-13
feature: mobile-workspace-header-two-line
commit: pending
impact: Mobile chat headers now stack the session title and workspace into two compact lines when a workspace is selected, preserving action button space and full tooltips.
---

## Summary

The chat header now wraps the title/workspace labels in a dedicated stack container. Desktop remains inline, while mobile switches the stack to a compact two-line layout with smaller typography and a plain secondary workspace line.

## Verification

- `npm run test -- tests/client/chat-message-mobile-layout.test.ts`
- `npm run harness:check`
- `npm run build`
