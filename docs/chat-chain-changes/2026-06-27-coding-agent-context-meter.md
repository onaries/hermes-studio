---
date: 2026-06-27
feature: coding-agent-context-meter
commit: pending
impact: Shows context usage and remaining tokens for Codex/Claude coding-agent chat sessions when agent usage metadata is available.
---

## Summary

Coding-agent sessions now surface token usage in the normal chat composer context meter. Codex external-agent runs normalize CLI usage metadata into `usage.updated` and `run.completed` payloads, allowing Hermes Studio to show used/remaining context after a turn completes. The context limit remains non-editable for coding-agent sessions.

## Verification

- `npm run test -- tests/server/agent-runner-utils.test.ts tests/client/chat-input-draft.test.ts`
- `npm run harness:check`
- `npm run build`
