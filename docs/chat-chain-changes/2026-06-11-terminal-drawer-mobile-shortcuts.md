---
date: 2026-06-11
pr: pending
feature: Terminal drawer mobile shortcuts
impact: Mobile terminal shortcut controls no longer leak into the chat view after closing the drawer.
---

When the terminal tab is active and the drawer is closed, the terminal panel now clears transient mobile shortcut state, blurs the focused xterm input, and only renders its fixed mobile shortcut controls while the drawer is visible. Chat run/session semantics are unchanged.
