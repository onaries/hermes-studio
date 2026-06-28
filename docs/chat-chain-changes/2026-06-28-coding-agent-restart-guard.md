---
date: 2026-06-28
feature: coding-agent-restart-guard
commit: pending
impact: Prevents Hermes Studio WebUI runtime restarts from interrupting active Codex/Claude coding-agent turns by default.
---

## Summary

Hermes Studio WebUI restarts close the WebUI child process and can kill active coding-agent subprocesses, causing Codex work to appear lost. SIGUSR2 runtime restarts now skip shutdown when coding-agent runs are active, logging the active run summary instead. Operators can still force the restart with `HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS=1`.

## Verification

- `npx vitest run tests/server/shutdown.test.ts tests/server/agent-runner-utils.test.ts`
- `npm run harness:check`
- `npm run build`
