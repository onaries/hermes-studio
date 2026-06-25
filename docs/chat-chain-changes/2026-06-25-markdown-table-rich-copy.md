---
date: 2026-06-25
feature: markdown-table-rich-copy
commit: pending
impact: Copies markdown tables with both HTML table markup and plain TSV fallback so rich editors preserve table structure on paste.
---

## Summary

Markdown table copy now writes `text/html` plus `text/plain` to the Clipboard API when supported. Spreadsheet/plain-text targets still receive TSV, while rich editors can paste an actual table instead of flattened text.

## Verification

- `npm run test -- tests/client/markdown-rendering.test.ts tests/client/chat-message-mobile-layout.test.ts`
- `npm run harness:check`
- `npm run build`
