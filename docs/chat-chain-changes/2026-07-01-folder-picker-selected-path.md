---
date: 2026-07-01
commit: pending
feature: Chat / Workspace folder picker
impact: selected workspace path display wraps instead of truncating; no chat-chain persistence or runtime behavior impact
---

# Folder picker selected path visibility

Changed file: `packages/client/src/components/hermes/chat/FolderPicker.vue`

The selected workspace path summary now renders as a wrapping, selectable monospace block instead of a single-line ellipsis. Folder labels also expose full paths via `title` attributes for hover inspection.

No chat-chain persistence, message ordering, fork/session identity, or runtime transport behavior changes.
