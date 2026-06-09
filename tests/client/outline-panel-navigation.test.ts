// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

import OutlinePanel from '@/components/hermes/chat/OutlinePanel.vue'
import type { Message } from '@/stores/hermes/chat'

const messages: Message[] = [
  { id: 'user-1', role: 'user', content: '첫 질문입니다', timestamp: 1 },
  { id: 'assistant-1', role: 'assistant', content: '# 첫 답변\n\n## 세부 항목', timestamp: 2 },
  { id: 'user-2', role: 'user', content: '마지막 질문입니다', timestamp: 3 },
  { id: 'assistant-2', role: 'assistant', content: '# 마지막 답변', timestamp: 4 },
]

describe('OutlinePanel navigation controls', () => {
  it('renders enabled top and bottom controls when the outline has entries', () => {
    const wrapper = mount(OutlinePanel, {
      props: { messages },
    })

    const buttons = wrapper.findAll('.outline-nav-button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].attributes('title')).toBe('chat.outlineGoTop')
    expect(buttons[1].attributes('title')).toBe('chat.outlineGoBottom')
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
  })

  it('disables navigation controls when the outline is empty', () => {
    const wrapper = mount(OutlinePanel, {
      props: { messages: [] },
    })

    const buttons = wrapper.findAll('.outline-nav-button')
    expect(buttons).toHaveLength(2)
    expect(buttons.every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })
})
