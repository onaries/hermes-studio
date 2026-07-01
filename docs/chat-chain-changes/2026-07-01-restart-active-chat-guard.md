---
date: 2026-07-01
commit: pending
feature: Chat / Desktop runtime restart guard
impact: desktop WebUI SIGUSR2 restarts are skipped while normal chat bridge runs are active, not only coding-agent runs
---

# Restart guard for active chat runs

Changed files:
- `packages/server/src/services/hermes/run-chat/index.ts`
- `packages/server/src/services/shutdown.ts`
- `tests/server/shutdown.test.ts`

Desktop runtime restart handling now asks `ChatRunSocket` whether any normal bridge-backed chat run is still active before honoring `SIGUSR2`. This avoids killing an in-progress Hermes/Codex chat turn and forcing it to resume from persisted history after the WebUI child restarts. The existing coding-agent restart guard remains in place, and operators can still explicitly force a restart with `HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS=1`.
