---
date: 2026-06-10
feature: chat-file-drop-attachments
commit: pending
impact: Chat message area file drops now attach files to the composer using the existing attachment/upload path without changing chat protocol semantics.
---

# Chat file drop attachments

The chat content area now accepts dragged files and forwards them into the composer attachment list. Existing composer attachment previews, upload handling, and message content block creation remain unchanged; this only broadens the drop target from the input box to the chat window.
