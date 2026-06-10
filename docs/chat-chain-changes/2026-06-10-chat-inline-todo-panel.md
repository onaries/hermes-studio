---
date: 2026-06-10
feature: chat-inline-todo-panel
commit: pending
impact: The current request's full todo list is now shown under the live tool-call area while a run is active, without changing todo tool execution or chat protocol semantics.
---

# Chat inline todo panel

The active turn's todo tool traces are still reconstructed client-side from existing messages, but the full todo list now appears as its own compact block below the complete live thinking/tool-call indicator only for the turn that actually used the todo tool. It remains visible after that todo-backed turn finishes, hides again when a later turn has no todo calls, and does not carry stale todo state into unrelated follow-up chats. The header is reduced to a one-line title/count chip, item typography/padding matches the compact live tool-call rows, in-progress icons pulse subtly so active work reads as running, and the item list can be collapsed from the header without changing state. The right drawer keeps Workspace and Terminal only; no `/chat-run`, persistence, streaming, or tool execution behavior changes.
