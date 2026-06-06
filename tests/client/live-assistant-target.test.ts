import { describe, expect, it } from 'vitest'
import { findCurrentTurnAssistant } from '@/utils/live-assistant-target'

describe('findCurrentTurnAssistant', () => {
  it('does not target an older assistant when the latest user turn has no assistant yet', () => {
    const messages = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
      { id: 'u2', role: 'user' },
    ]

    expect(findCurrentTurnAssistant(messages)).toBeUndefined()
  })

  it('targets the assistant that belongs to the latest user turn', () => {
    const messages = [
      { id: 'u1', role: 'user' },
      { id: 'a1', role: 'assistant' },
      { id: 'u2', role: 'user' },
      { id: 'a2', role: 'assistant' },
      { id: 'tool-1', role: 'tool' },
    ]

    expect(findCurrentTurnAssistant(messages)?.id).toBe('a2')
  })

  it('treats command messages as a new current turn boundary', () => {
    const messages = [
      { id: 'a1', role: 'assistant' },
      { id: 'cmd-1', role: 'command' },
    ]

    expect(findCurrentTurnAssistant(messages)).toBeUndefined()
  })
})
