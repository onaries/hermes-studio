---
date: 2026-06-19
area: chat-store
feature: tool-duration-fallback
commit: pending
impact: Keeps elapsed-time badges visible when long terminal tools finish without an explicit duration event.
---

# Tool duration fallback

## Summary

Running tool rows now compute a fallback duration from their start timestamp when `tool.completed` or `run.completed` does not include an explicit `duration` value.

## Why

Some long terminal/coding-agent tool runs can settle via `run.completed` or emit `tool.completed` without a duration payload. The UI already showed live elapsed time while running, but after settling the row had no `toolDuration`, so the elapsed-time label disappeared.

## Verification

- Added client store coverage for run-completed settlement without `tool.completed`.
- Added client store coverage for `tool.completed` events that omit `duration`.
