---
date: 2026-06-27
feature: artifact-toolbar-long-names
commit: pending
impact: Prevents long artifact filenames from overlapping mobile toolbar actions.
---

## Summary

The Artifacts detail toolbar now constrains the artifact title to the available space with single-line ellipsis and keeps the full name available through the title tooltip. On mobile, the download action uses an icon-only label to preserve room for the filename and avoid overlap with toolbar buttons.

## Verification

- `npx vitest run tests/client/artifacts-panel.test.ts`
- `npm run harness:check`
- `npm run build`
