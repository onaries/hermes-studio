---
date: 2026-06-11
pr: pending
feature: Live TPS smoothing
impact: Live TPS waits for the first short sampling window, smooths visible values, and uses server output-token usage for the final completed value when available.
---

Display-only metering change. `/chat-run`, persistence, approval, streaming protocol, and message content semantics are unchanged. The live TPS separator is rendered as a dedicated inline element so spacing remains legible beside the context meter.
