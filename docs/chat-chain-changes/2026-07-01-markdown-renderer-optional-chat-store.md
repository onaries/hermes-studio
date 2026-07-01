---
date: 2026-07-01
commit: pending
feature: Chat / MarkdownRenderer workspace artifact links
impact: MarkdownRenderer can mount in isolated tests without an active Pinia store; workspace-aware artifact download/open calls still pass a null workspace when no active chat session is available
---

# MarkdownRenderer optional chat store access

Changed files:
- `packages/client/src/components/hermes/chat/MarkdownRenderer.vue`
- `tests/client/markdown-rendering.test.ts`
- `tests/client/markdown-artifacts.test.ts`

`MarkdownRenderer` now checks for an active Pinia instance before reading the chat store for the active workspace. This preserves workspace-relative artifact link handling in the live chat UI while allowing standalone MarkdownRenderer mounts to render without a store.

No chat-chain persistence, message ordering, fork/session identity, or runtime transport behavior changes.
