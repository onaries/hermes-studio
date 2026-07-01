---
date: 2026-07-01
commit: pending
feature: Chat / Codex workspace artifacts
impact: relative file links from workspace-backed Codex sessions resolve against the session workspace before preview/download; no message persistence or transport behavior impact
---

# Codex workspace artifact paths

Changed files:
- `packages/client/src/components/hermes/chat/ChatPanel.vue`
- `packages/client/src/components/hermes/chat/MarkdownRenderer.vue`
- `packages/client/src/stores/hermes/artifacts.ts`
- `packages/client/src/utils/chat-artifact-references.ts`
- `packages/server/src/routes/hermes/download.ts`

Relative file links in assistant output now carry the active session workspace into artifact previews and downloads. The download route resolves those relative paths inside the workspace instead of falling back to the Hermes profile directory.

No chat-chain persistence, message ordering, fork/session identity, or runtime transport behavior changes.
