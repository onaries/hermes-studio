# Codex Command tool preview

- Fixed restored Codex command tool rows so repeated item ids pair with the nearest assistant tool call instead of a later command with the same id.
- Treat Codex `Command` tool previews as args-only summaries: show the command when available and never fall back to stdout/file-content output as the collapsed preview.
- Added client regressions for repeated Codex `item_2` command ids and missing-command output-preview fallback.
