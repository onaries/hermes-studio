---
date: 2026-06-11
feature: terminal-panel-font-controls
commit: pending
impact: Terminal drawer exposes the existing terminal font settings inline without changing terminal session protocol.
---

# Terminal panel font controls

- Added font size and font family controls directly to the chat drawer terminal header.
- The controls persist the same `display.terminal_font_size` and `display.terminal_font_family` settings used by Display settings.
- Existing xterm instances continue to update through the terminal font settings watcher; no terminal websocket/session semantics changed.
