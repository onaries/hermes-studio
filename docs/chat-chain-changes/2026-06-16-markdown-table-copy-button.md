---
date: 2026-06-16
feature: markdown-table-copy-button
commit: pending
impact: Adds a copy button to markdown tables so users can copy table contents as tab-separated text.
---

## Summary

Markdown tables now render with a compact Copy button above the table. Clicking it copies the rendered table rows as tab-separated text, preserving row/column structure for spreadsheets or plain text notes. Existing code-block copy behavior remains unchanged.

## Verification

- `npm run test -- tests/client/markdown-rendering.test.ts tests/client/chat-message-mobile-layout.test.ts`
- `npm run harness:check`
- `npm run build`
