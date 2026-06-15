---
date: 2026-06-15
feature: upstream merge scroll/session list integration
commit: pending
impact: Preserves upstream live transcript native scrolling controls and robust session model labels after merging upstream main into the fork.
---

# Upstream merge scroll/session list integration

- Restored live chat transcript native scroll behavior from upstream while preserving fork live tool rendering.
- Added history archive link and bottom jump button behavior expected by the updated chat chain tests.
- Made session list model display resilient when tests or lightweight mounts provide a minimal app store mock.
