import { describe, expect, it } from 'vitest'
import { shouldSubmitOnEnter } from '../../packages/client/src/utils/chat-enter-submit'

describe('shouldSubmitOnEnter', () => {
  it('submits desktop plain Enter', () => {
    expect(shouldSubmitOnEnter(
      { key: 'Enter', shiftKey: false },
      { isMobileLike: false, mobileEnterToSend: false },
    )).toBe(true)
  })

  it('keeps mobile Enter as newline unless explicitly enabled', () => {
    expect(shouldSubmitOnEnter(
      { key: 'Enter', shiftKey: false },
      { isMobileLike: true, mobileEnterToSend: false },
    )).toBe(false)
  })

  it('allows mobile Enter sending when the setting is enabled', () => {
    expect(shouldSubmitOnEnter(
      { key: 'Enter', shiftKey: false },
      { isMobileLike: true, mobileEnterToSend: true },
    )).toBe(true)
  })

  it('never submits Shift+Enter', () => {
    expect(shouldSubmitOnEnter(
      { key: 'Enter', shiftKey: true },
      { isMobileLike: false, mobileEnterToSend: true },
    )).toBe(false)
  })
})
