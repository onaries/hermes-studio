---
date: 2026-06-13
feature: live-tool-final-output-stability
commit: pending
impact: Prevents completed live tool rows from replaying or re-entering while the final assistant output is streaming.
---

## Summary

- Live tool rows now keep showing active/running tools, but completed tools are hidden from the live footer once final assistant text is streaming.
- Removed TransitionGroup `appear` from the live tool list so remounts do not make old tool rows look newly added.
- Completed tool traces still return to the transcript after the run settles.
