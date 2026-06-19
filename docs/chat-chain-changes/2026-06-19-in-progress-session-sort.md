---
date: 2026-06-19
pr: pending
feature: in-progress-session-sort
impact: chat session browser ordering
---

# In-progress sessions sort first

- Sorts session browser entries with in-progress sessions before completed sessions, while preserving existing pinned grouping and recency order inside each running/completed group.
- Treats both server/client live state and sessions without an `endedAt` timestamp as in-progress so active runs stay visible near the top.
