---
date: 2026-06-12
feature: live-patch-tool-diff-preview
commit: pending
impact: Patch tool rows in the active live tool panel can be expanded to inspect the diff while a run is still in progress.
---

## Summary

Live patch tool rows are now keyboard/click expandable without depending on Naive UI message providers. When a patch result contains a diff, the live tool panel renders it using the existing highlighted diff renderer with line numbers and copy support. While a patch is still running or before a structured diff is available, the panel falls back to the patch arguments (`patch` text or `old_string`/`new_string`) so the intended change remains inspectable.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
