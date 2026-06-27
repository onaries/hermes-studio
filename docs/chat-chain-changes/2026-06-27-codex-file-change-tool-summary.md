---
date: 2026-06-27
feature: codex-file-change-tool-summary
commit: pending
impact: Shows Codex file change paths/actions in live and transcript tool rows instead of empty path/action JSON.
---

## Summary

Codex `exec --json` reports file edits as `file_change` items with a `changes[]` array. The coding-agent event mapper now preserves those changes as structured tool arguments, and chat tool summaries render compact `kind path` previews for live and completed File Change rows.

## Verification

- `npx vitest run tests/server/agent-runner-utils.test.ts tests/client/tool-inline-summary.test.ts`
- `npm run harness:check`
- `npm run build`
