---
date: 2026-06-09
feature: live-tool-hover-title
commit: pending
impact: Live tool-call rows expose full tool summaries in hover title while preserving existing semantic inline previews when provided.
---

# Live tool hover title

The live tool-call panel sets a title on each tool row. For common tools such as `read_file`, `search_files`, `skill_view`, and `terminal`, the title is rebuilt from raw tool arguments so long paths and commands remain visible on hover even when the inline preview is ellipsized.

If a tool emits a semantic `toolPreview` such as an approval status message, the inline preview keeps that text for compatibility while the hover title still contains raw arguments such as the file path.
