---
date: 2026-07-01
commit: pending
feature: Chat / Git Diff drawer
impact: selecting a file in the Git Diff drawer keeps full file-list additions/deletions totals while narrowing only the rendered diff content
---

# Git Diff selected-file stats

Changed files:
- `packages/server/src/routes/hermes/files.ts`
- `tests/server/files-routes.test.ts`

The Git Diff endpoint now computes `--numstat` across the whole working tree even when a selected file path is supplied. The selected path is still applied to the rendered unified diff, but the file list keeps complete per-file stats so the "All changes" row and toolbar totals do not collapse to `+0/-0` or selected-file-only totals.

No chat-chain persistence, message ordering, fork/session identity, or runtime transport behavior changes.
