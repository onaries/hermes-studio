---
date: 2026-06-18
pr: pending
feature: terminal-running-progress
impact: chat live tool presentation
---

# Terminal running progress indicator

- Adds a visible elapsed-time badge to running terminal tool rows in the live tool panel.
- Keeps the existing spinner/sweep animation, but makes long terminal commands read as actively running instead of stalled.
- Badge updates every second while a terminal tool is running and stops its timer when no running terminal tools remain or the component unmounts.
