---
date: 2026-07-01
commit: pending
feature: Coding-agent restored chat tool rows
impact: restored Codex Command tool rows keep the correct command preview even when Codex reuses item ids
---

# Codex Command tool preview pairing

Changed files:
- `packages/client/src/stores/hermes/chat.ts`
- `packages/client/src/utils/tool-inline-summary.ts`
- `tests/client/chat-store-session-order.test.ts`
- `tests/client/tool-inline-summary.test.ts`

Restored Codex command tool results now pair repeated item ids (for example `item_2`) with the nearest preceding assistant tool call. The collapsed `Command` tool preview is args-only: it shows the command when available and never falls back to stdout/file-content output.
