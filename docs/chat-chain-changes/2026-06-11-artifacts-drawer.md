---
date: 2026-06-11
pr: pending
feature: chat artifact drawer
impact: Generated markdown/text file cards in chat now open in the right drawer Artifacts tab instead of an inline preview drawer. Workspace Files and Terminal tabs are unchanged.
---

Adds a Pinia artifacts store and drawer panel so local markdown/text outputs linked from chat can be viewed as standalone artifacts while preserving the file-card download button. The Markdown renderer only resolves the artifacts store when a previewable local file card is clicked, so tests and static render paths that mount markdown without an app-level Pinia remain unaffected. When no artifacts exist, the empty state spans the full drawer width instead of occupying the removed list column.
