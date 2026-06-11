---
date: 2026-06-11
feature: pending-interaction-prompts
commit: pending
---

# Pending interaction duplicate float cleanup

- Removed the duplicate approval/clarify floating cards from `MessageList.vue` after upstream added a message-list prompt while the fork already renders the richer countdown/disabled-state prompt in `ChatPanel.vue`.
- Kept queued-message floating UI in `MessageList.vue` and preserved virtual list bottom padding when approval/clarify prompts are active so messages are not obscured.
- Behavior impact: approval and clarify prompts render once per active chat session, avoiding strict-locator ambiguity and duplicate visible text in Playwright tests.
