import { describe, expect, it } from 'vitest'
import {
  buildTurnTpsPayload,
  calculateTurnOutputTokens,
  calculateTurnTps,
} from '../../packages/server/src/services/hermes/run-chat/tps'

describe('run-chat turn TPS calculation', () => {
  it('uses the positive output token delta when usage is cumulative', () => {
    expect(calculateTurnOutputTokens(130, 100)).toBe(30)
    expect(calculateTurnTps(30, 4)).toBe(7.5)
  })

  it('uses reported output tokens when usage is already per-run', () => {
    expect(calculateTurnOutputTokens(30, 100)).toBe(30)
  })

  it('adds duration and TPS to the run payload', () => {
    expect(buildTurnTpsPayload({
      startedAtMs: 1_000,
      endedAtMs: 5_000,
      reportedOutputTokens: 130,
      previousOutputTokens: 100,
    })).toEqual({
      duration_seconds: 4,
      durationSeconds: 4,
      turnOutputTokens: 30,
      tps: 7.5,
    })
  })
})
