---
date: 2026-06-12
feature: live-compression-status-clipping
commit: pending
impact: Keeps live compression status rows fully visible while the live tool-call list scrolls independently.
---

## Summary

The live tool-call panel now keeps compression/abort status rows outside the scrollable tool-call list. This prevents the `Compressing...` status from being clipped at the top when many tool rows are present while preserving the compact max-height live panel.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
