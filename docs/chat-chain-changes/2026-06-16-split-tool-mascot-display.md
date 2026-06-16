---
date: 2026-06-16
feature: split-tool-mascot-display
commit: pending
impact: Adds separate Display settings for desktop and mobile live tool-call mascot visibility while preserving the legacy setting as a fallback.
---

## Summary

Display settings now expose separate desktop and mobile toggles for the live tool-call mascot. Existing `show_tool_mascot` values are kept as a fallback when the new platform-specific settings are unset, so existing users keep their current behavior until they change the new toggles.

## Verification

- `npm run test -- tests/client/tool-trace-visibility.test.ts tests/client/display-settings.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
