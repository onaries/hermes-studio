---
date: 2026-06-25
feature: hidden-tool-mascot-bar-animation
commit: pending
impact: Adds a slow subtle activity animation to the left bar shown when the live tool mascot is hidden.
---

## Summary

When the tool mascot is disabled, the preserved left activity bar now moves slowly with a gentle gradient/glow pulse so the live tool-call area feels active without being distracting. The animation respects `prefers-reduced-motion`.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/chat-message-mobile-layout.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
