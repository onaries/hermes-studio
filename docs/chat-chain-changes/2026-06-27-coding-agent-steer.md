---
date: 2026-06-27
feature: coding-agent-steer
commit: pending
impact: Allows `/steer` in Codex/Claude coding-agent sessions without putting the instruction into the normal visible message queue.
---

## Summary

Coding-agent sessions now treat `/steer <instruction>` as an out-of-band command. While a print-mode Codex/Claude turn is running, the instruction is captured as a pending steer message and delivered with the same out-of-band marker before normal queued user messages. This avoids turning mid-run steering into an ordinary queued chat message.

## Verification

- `npx vitest run tests/server/agent-runner-utils.test.ts tests/client/chat-input-draft.test.ts`
- `npm run harness:check`
- `npm run build`
