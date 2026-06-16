---
date: 2026-06-16
feature: readable-wide-markdown-tables
commit: pending
impact: Improves readability of markdown tables with many columns by wrapping cell text and limiting cell width.
---

## Summary

Markdown tables now keep horizontal scrolling for genuinely wide tables, but each header/data cell has a readable width limit and wraps long content. This prevents many-column tables from rendering as long single-line cells that are difficult to scan.

## Verification

- `npm run test -- tests/client/chat-message-mobile-layout.test.ts tests/client/markdown-rendering.test.ts`
- `npm run harness:check`
- `npm run build`
