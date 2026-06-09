---
date: 2026-06-09
feature: live-tool-hover-title
commit: pending
impact: Live tool-call rows expose the full tool summary in the native hover title so truncated paths/commands can be read without expanding chat history.
---

# Live tool hover title

The live tool-call panel now sets a title on each tool row. For common tools such as `read_file`, `search_files`, `skill_view`, and `terminal`, the title is rebuilt from raw tool arguments so long paths and commands remain visible on hover even when the inline preview is ellipsized.
