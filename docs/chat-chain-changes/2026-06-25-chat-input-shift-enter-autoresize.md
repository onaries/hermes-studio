---
date: 2026-06-25
commit: pending
feature: Chat input Shift+Enter autoresize
impact: The chat composer keeps a reactive auto-height and applies measured textarea height immediately after input/newline paths, with extra animation-frame passes so Hermes Studio desktop input grows as multiline text is entered. Browser speech recognition permission errors also exit the active listening state instead of leaving the voice overlay stuck on “listening”.
---
