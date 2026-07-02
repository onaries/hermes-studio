---
date: 2026-07-02
commit: pending
feature: Preflight context meter update
impact: Chat sessions publish the snapshot-aware bridge context estimate before output streaming starts, preventing the composer meter from briefly showing cumulative Codex accounting totals such as multi-million-token usage.
---

Bridge chat runs now emit the preflight context estimate as soon as compressed history calculation finishes. The meter can use the current context estimate before the final run completion usage event arrives.
