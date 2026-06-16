---
date: 2026-06-16
feature: tool-mascot-hidden-height
commit: pending
impact: Keeps the live tool-call area at the same vertical height when the decorative tool mascot is hidden.
---

## Summary

The live tool-call indicator now keeps the mascot-height vertical footprint even when the mascot image is disabled for the active viewport. Tool rows remain visible and shift left, but the chat layout no longer collapses shorter than the mascot-on state.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/chat-message-mobile-layout.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
