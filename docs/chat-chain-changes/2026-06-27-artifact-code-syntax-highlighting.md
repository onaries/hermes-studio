---
date: 2026-06-27
feature: artifact-code-syntax-highlighting
commit: pending
impact: Code artifacts render with syntax-highlighted code blocks instead of plain preformatted text.
---

## Summary

Artifacts whose filenames indicate source/config code now render through the existing Markdown code-block renderer with an inferred language. This reuses the chat/editor-style highlighted code presentation and copy affordance while leaving unknown plain files on the lightweight text preview path.

## Verification

- `npx vitest run tests/client/artifacts-panel.test.ts`
- `npm run harness:check`
- `npm run build`
