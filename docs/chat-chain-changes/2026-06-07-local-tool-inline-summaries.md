---
date: 2026-06-07
pr: pending
feature: Tool inline summaries
impact: Adds display-only one-line summaries beside collapsed tool call names so users can see the key query/path/command/result before expanding raw tool details.
---

Collapsed tool rows now derive a concise localized summary from existing tool arguments/results. Raw Arguments and Result payloads remain available in the expanded details, and the change does not alter chat protocol, persistence, tool execution, approval, or streaming semantics.
