---
date: 2026-06-08
pr: local
feature: Approval / clarify attention and browser notifications
impact: Pending approval and clarify requests now stay visible as stacked composer cards, carry session-list attention state, clear stale replay state on resume, and can raise browser notifications when user attention is required.
---

Ported upstream PR #1340 pending interaction behavior so chat approval and clarify requests keep session-list attention state, render stacked pending cards above the composer, expire safely, and clean stale replay state on resume.

Added browser Notification API alerts for new approval and clarify requests, with localized titles/body text and an in-card permission enable action when notification permission is still unset.
