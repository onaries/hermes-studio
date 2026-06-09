---
date: 2026-06-09
feature: todo-active-only-display
commit: pending
impact: Todo drawer and collapsed todo tool previews show only in-progress items, keeping completed historical tasks out of the visible current task list.
---

# Todo active-only display

Todo drawer and collapsed todo tool previews now show only `in_progress` items so completed historical tasks do not dominate the visible task list. This is a presentation-only change; the raw todo tool arguments/results and reconstructed full state remain available for debugging/expanded details, and chat/tool protocol semantics are unchanged.
