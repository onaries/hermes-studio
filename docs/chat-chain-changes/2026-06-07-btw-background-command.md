---
date: 2026-06-07
pr: pending
feature: Web UI /btw background slash command
impact: Adds /background plus /bg and /btw aliases to ordinary Chat slash commands. The command starts the prompt in a separate CLI-backed background session and leaves the current session usable; ChatInput autocomplete now exposes /btw and /background.
---

Implemented Hermes CLI-style `/btw <prompt>` behavior for Web UI chat by routing it through the existing Agent Bridge run path with a fresh background session id. Raw expanded chat state and normal queue behavior are unchanged for foreground runs.
