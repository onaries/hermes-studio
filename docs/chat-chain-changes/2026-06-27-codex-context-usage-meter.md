---
date: 2026-06-27
feature: codex-context-usage-meter
commit: pending
impact: Fixes Codex coding-agent context usage so the composer meter uses per-turn context usage instead of cumulative billing tokens.
---

## Summary

Codex coding-agent token telemetry includes both cumulative billing usage and per-turn context usage. The chat context meter now uses Codex `last_token_usage` for current context consumption, carries `model_context_window` as the effective context limit when reported, and avoids showing cumulative totals such as 731k as the active context size. Codex `exec --json` also emits current token data through `event_msg` / `token_count`; those events are now consumed immediately and preserved over cumulative-only `turn.completed` usage.

## Verification

- `npx vitest run tests/server/agent-runner-utils.test.ts tests/client/chat-input-draft.test.ts`
- `npm run harness:check`
- `npm run build`
