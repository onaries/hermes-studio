---
date: 2026-06-23
commit: pending
feature: Markdown table copy fallback
impact: Markdown table copy buttons now use the shared clipboard helper so non-secure or Clipboard API-limited contexts fall back to the legacy textarea copy path instead of reporting copy failure.
---
