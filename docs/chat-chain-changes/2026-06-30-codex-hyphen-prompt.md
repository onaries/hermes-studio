---
date: 2026-06-30
pr: pending
feature: Codex coding-agent prompt handling
impact: Codex coding-agent prompts that begin with `-` are passed as prompt text instead of being parsed as CLI options.
---

Codex `exec` and `exec resume` invocations now insert the `--` argument separator before the prompt (and resumed native session id), so user messages such as `- do this` no longer fail with `unexpected argument` parser errors.
