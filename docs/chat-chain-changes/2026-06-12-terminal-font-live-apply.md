---
date: 2026-06-12
feature: terminal-font-live-apply
commit: pending
impact: Terminal font size/family changes now apply immediately to already-open drawer and standalone xterm instances.
---

## Summary

Terminal font changes now update the local display settings optimistically and explicitly refresh existing xterm renderers. The drawer terminal applies the selected font size/family immediately before the settings save request completes, and both drawer/standalone terminals refresh and refit after font changes so open sessions visibly update without reopening the terminal.

## Verification

- `npm run test -- tests/client/display-settings.test.ts tests/client/terminal-panel-mobile-visibility.test.ts tests/client/i18n-coverage.test.ts`
- `npm run harness:check`
- `npm run build`
