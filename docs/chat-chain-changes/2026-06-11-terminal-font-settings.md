---
date: 2026-06-11
pr: 43
feature: Terminal font settings
impact: Terminal display settings now control xterm font size and CSS font-family without changing terminal session or websocket semantics.
---

The chat drawer terminal and standalone terminal create xterm instances from Display settings for font size and font family. Existing terminal sessions refit when those settings change so the pty resize state stays aligned with the rendered terminal.
