import { describe, expect, it } from 'vitest'
import { parseCodexTokenUsageJsonl } from '../../packages/server/src/services/codex-usage'

describe('Codex usage parsing', () => {
  it('sums Codex last_token_usage and keeps model/context metadata', () => {
    const content = [
      JSON.stringify({
        type: 'session_meta',
        payload: { session_id: 'native' },
      }),
      JSON.stringify({
        type: 'turn_context',
        payload: { model: 'gpt-5.5' },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 10,
              cached_input_tokens: 2,
              output_tokens: 1,
              reasoning_output_tokens: 0,
              total_tokens: 11,
            },
            last_token_usage: {
              input_tokens: 10,
              cached_input_tokens: 2,
              output_tokens: 1,
              reasoning_output_tokens: 0,
              total_tokens: 11,
            },
            model_context_window: 237500,
          },
        },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 30,
              cached_input_tokens: 7,
              output_tokens: 3,
              reasoning_output_tokens: 1,
              total_tokens: 33,
            },
            last_token_usage: {
              input_tokens: 20,
              cached_input_tokens: 5,
              output_tokens: 2,
              reasoning_output_tokens: 1,
              total_tokens: 22,
            },
            model_context_window: 237500,
          },
        },
      }),
    ].join('\n')

    expect(parseCodexTokenUsageJsonl(content)).toEqual({
      inputTokens: 30,
      outputTokens: 3,
      cacheReadTokens: 7,
      reasoningTokens: 1,
      totalTokens: 33,
      contextLimit: 237500,
      model: 'gpt-5.5',
    })
  })

  it('uses summed last_token_usage when it exceeds the latest cumulative counter', () => {
    const content = [
      JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 1, total_tokens: 101 }, last_token_usage: { input_tokens: 100, output_tokens: 1, total_tokens: 101 } } } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 50, output_tokens: 1, total_tokens: 51 }, last_token_usage: { input_tokens: 50, output_tokens: 1, total_tokens: 51 } } } }),
    ].join('\n')

    expect(parseCodexTokenUsageJsonl(content)).toMatchObject({
      inputTokens: 150,
      outputTokens: 2,
      totalTokens: 152,
    })
  })
})
