---
date: 2026-06-30
pr: pending
feature: Git Diff drawer panel
impact: Adds a read-only Git Diff tab to the right chat drawer, scoped to the active session workspace, without changing chat execution, file editing, terminal, or artifact behavior.
---

The right drawer now includes a Git Diff tab that shows branch/upstream metadata, changed-file totals, per-file status rows, and a highlighted unified diff view. The backing API uses guarded workspace paths and bounded read-only `git -C` commands.
