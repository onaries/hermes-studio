---
date: 2026-07-01
type: fix
area: coding-agent
---

# Codex app-server context usage

Codex context metering now also accepts normalized app-server usage payloads where the latest context window is exposed as `last` instead of `last_token_usage`. When a later usage event omits `model_context_window`, the previous context window value is preserved. If live Codex stdout reports only cumulative totals, the server reads the native Codex JSONL session log and uses its latest `last_token_usage` for the context meter.
