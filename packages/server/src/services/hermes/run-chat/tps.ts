/**
 * Turn-level TPS calculation helpers.
 *
 * Settled TPS should use the current turn's output tokens divided by the
 * backend-measured turn duration. Some adapters report cumulative session
 * output tokens while others report per-run output tokens, so normalize by
 * comparing against the previous session total before calculating TPS.
 */

import { estimateUsageTokensFromMessages } from './usage'

export interface TurnTpsPayload {
  duration_seconds?: number
  durationSeconds?: number
  tps?: number
  turnOutputTokens?: number
}

export function finiteOutputTokens(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

export function resolveRunBaselineOutputTokens(state: {
  outputTokens?: unknown
  messages?: Array<{ role?: string; content?: unknown; tool_calls?: unknown }>
}): number {
  const stored = finiteOutputTokens(state.outputTokens)
  if (stored != null && stored > 0) return stored
  if (!Array.isArray(state.messages) || state.messages.length === 0) return stored ?? 0
  return estimateUsageTokensFromMessages(state.messages).outputTokens
}

export function calculateTurnOutputTokens(reportedOutputTokens: unknown, previousOutputTokens: unknown): number {
  const reported = finiteOutputTokens(reportedOutputTokens) ?? 0
  if (reported <= 0) return 0
  const previous = finiteOutputTokens(previousOutputTokens) ?? 0
  if (previous > 0 && reported >= previous) {
    const delta = reported - previous
    if (delta > 0) return delta
  }
  return reported
}

export function calculateTurnDurationSeconds(startedAtMs: unknown, endedAtMs: unknown = Date.now()): number | undefined {
  if (typeof startedAtMs !== 'number' || !Number.isFinite(startedAtMs) || startedAtMs <= 0) return undefined
  if (typeof endedAtMs !== 'number' || !Number.isFinite(endedAtMs)) return undefined
  const elapsedMs = endedAtMs - startedAtMs
  if (elapsedMs <= 0) return undefined
  return Math.round((elapsedMs / 1000) * 1000) / 1000
}

export function calculateTurnTps(turnOutputTokens: unknown, durationSeconds: unknown): number | undefined {
  const tokens = finiteOutputTokens(turnOutputTokens) ?? 0
  if (tokens <= 0) return undefined
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return undefined
  return Math.round((tokens / durationSeconds) * 10) / 10
}

export function buildTurnTpsPayload(args: {
  startedAtMs?: number
  endedAtMs?: number
  reportedOutputTokens: unknown
  previousOutputTokens: unknown
}): TurnTpsPayload {
  const durationSeconds = calculateTurnDurationSeconds(args.startedAtMs, args.endedAtMs ?? Date.now())
  const turnOutputTokens = calculateTurnOutputTokens(args.reportedOutputTokens, args.previousOutputTokens)
  const tps = calculateTurnTps(turnOutputTokens, durationSeconds)
  const payload: TurnTpsPayload = {}
  if (durationSeconds != null) {
    payload.duration_seconds = durationSeconds
    payload.durationSeconds = durationSeconds
  }
  if (turnOutputTokens > 0) payload.turnOutputTokens = turnOutputTokens
  if (tps != null) payload.tps = tps
  return payload
}
