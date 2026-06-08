---
date: 2026-06-08
feature: chat-run-completion-notifications
commit: pending
impact: ChatPanel observes a new store completion event and shows optional browser/desktop notifications after foreground or resumed runs finish.
---

# Completion browser notifications

The chat store now emits a lightweight completion notification event after a foreground or resumed run completes or fails. `ChatPanel` observes that event and, when the new display setting is enabled, shows a browser/desktop notification. Approval and clarify notification behavior is unchanged.
