---
date: 2026-06-07
pr: pending
feature: Web UI /btw side question history budget
impact: Limits /btw side-question context to a snapshot-aware, recent user/assistant-only history window so large sessions do not trigger bridge compression timeouts before the side answer starts streaming.
---

`/btw` now builds a bounded side-question context instead of passing the full session transcript into the temporary bridge run. Tool-call payloads and oversized historical messages are stripped/truncated for the ephemeral side run; the foreground transcript and `/background` behavior are unchanged.
