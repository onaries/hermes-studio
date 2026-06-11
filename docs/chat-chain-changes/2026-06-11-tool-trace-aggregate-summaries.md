---
date: 2026-06-11
pr: pending
feature: Tool trace aggregate summaries
impact: Large consecutive tool-call batches now collapse into a one-line summary with expandable raw per-tool rows.
---

Display-only change. `/chat-run`, persistence, approval, streaming, and tool protocol semantics are unchanged; individual tool details remain available when expanded in completed transcript/history views. The active in-progress tool panel continues to show individual tool rows without aggregation.
