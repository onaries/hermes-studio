---
date: 2026-06-10
feature: live-tps-context-meter
commit: pending
impact: The chat input context meter now shows a transient live TPS estimate beside remaining tokens while assistant content or reasoning is streaming. This is client-side presentation only and does not change chat protocol, persistence, tool execution, or final usage accounting.
---

# Live TPS context meter

The chat input footer displays a compact live TPS value next to the remaining-token label when the active session receives streamed output. Reasoning/thinking deltas now update the same live TPS meter before final answer text arrives, and timing starts at the first streamed delta rather than `run.started` so model wait time, tool latency, or pre-output reasoning gaps do not depress the throughput value. If settled context usage has not arrived yet, the TPS value can render by itself so narrow/mobile layouts still show streaming throughput immediately. On mobile, the token label and context bar stay in one inline meter row alongside the composer controls. The value is reset on each run start and remains visible after the run finishes as the last observed stream throughput; final persisted usage remains driven by the server's settled usage events.
