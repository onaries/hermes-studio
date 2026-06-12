---
date: 2026-06-12
feature: terminal-font-picker
commit: pending
impact: Terminal font family settings now use a selectable preset picker with custom font entry support, while keeping the existing display config keys and live xterm updates.
---

## Summary

Display Settings and the terminal panel header now expose terminal font family as a filterable/taggable picker instead of a plain text field. Common monospace fonts are listed as presets, and custom CSS `font-family` values remain supported through typed entries.

## Verification

- `npm run test -- tests/client/display-settings.test.ts tests/client/terminal-panel-mobile-visibility.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
