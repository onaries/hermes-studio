---
date: 2026-06-11
pr: pending
feature: Artifact preview fallback
impact: Unclassified artifact files now try text preview instead of immediately showing unsupported/download-only UI.
---

Allows Artifacts to attempt a text preview for local files whose extension is not recognized as markdown, text, image, or media. Image and media files keep their direct preview path, while unclassified files lazily fetch content through the existing download/text endpoint and render fetched content in the text preview pane. If fetching fails, the existing error/download path remains available.
