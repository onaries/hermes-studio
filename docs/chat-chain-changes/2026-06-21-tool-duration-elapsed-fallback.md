---
date: 2026-06-21
commit: pending
feature: Tool duration elapsed fallback
impact: Completed tool rows now prefer elapsed timing from live start/end timestamps or restored assistant tool-call/result timestamps when a bridge reports zero duration, leaving 0ms only when no timing signal exists.
---
