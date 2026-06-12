---
date: 2026-06-13
feature: ai-generated-artifacts-only
commit: pending
impact: The Artifacts drawer only lists AI-generated files from assistant messages; user-uploaded files and photos remain in the chat but are not registered as artifacts.
---

## Summary

Artifact discovery now treats artifacts as AI outputs. Automatic chat artifact sync ignores user messages, including uploaded file/image content blocks and local file links. User file-card clicks keep download behavior instead of opening the Artifacts drawer.

## Verification

- `npm run test -- tests/client/chat-artifact-references.test.ts tests/client/markdown-rendering.test.ts tests/client/artifacts-store.test.ts`
- `npm run harness:check`
- `npm run build`
