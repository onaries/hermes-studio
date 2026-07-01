---
date: 2026-07-01
commit: pending
feature: codex-context-app-server-usage
impact: Codex context meter accepts app-server/Paseo-style latest usage payloads.
---

# Codex app-server context usage

Changed files:
- `packages/server/src/services/agent-runner/coding-agent-run-manager.ts`
- `tests/server/agent-runner-utils.test.ts`

Codex context metering accepts `last` as an alias for `last_token_usage` and preserves the previous context window when later usage events omit it.
