// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('naive-ui', () => ({
  NDrawer: { template: '<div><slot /></div>' },
  NDrawerContent: { template: '<div><slot /></div>' },
  NSpin: { template: '<div><slot /></div>' },
  useMessage: () => ({
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('@/api/hermes/download', () => ({
  getDownloadUrl: (_path: string, name: string) => `/download/${name}`,
}))

import GroupMessageItem from '@/components/hermes/group-chat/GroupMessageItem.vue'
import type { ChatMessage, RoomAgent } from '@/api/hermes/group-chat'

function mountGroupMessage(message: Partial<ChatMessage>, agents: RoomAgent[] = []) {
  return mount(GroupMessageItem, {
    props: {
      message: {
        id: 'group-message',
        roomId: 'room-1',
        senderId: 'agent-1',
        senderName: 'UAT Agent',
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        ...message,
      } as ChatMessage,
      agents,
      members: [],
      currentUserId: 'user-1',
    },
    global: { stubs: { MarkdownRenderer: true, ProfileAvatar: true } },
  })
}

function mountToolMessage(message: Partial<ChatMessage>) {
  return mountGroupMessage({
    role: 'tool',
    toolName: 'runtime_payload',
    toolStatus: 'done',
    ...message,
  })
}

describe('GroupMessageItem tool details', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        getVoices: vi.fn(() => []),
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
    })
  })

  it('normalizes non-string runtime tool payloads before rendering', async () => {
    const wrapper = mountToolMessage({
      toolArgs: { group: true, values: [1, 2, 3] },
      toolResult: false,
    } as unknown as Partial<ChatMessage>)

    await wrapper.find('.tool-line').trigger('click')

    const blocks = wrapper.findAll('.tool-details .hljs-code-block')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].find('.code-lang').text()).toBe('json')
    expect(blocks[0].find('code').text()).toContain('values')
    expect(blocks[1].find('.code-lang').text()).toBe('json')
    expect(blocks[1].find('code').text()).toBe('false')
  })

  it('keeps plain string false payloads as text', async () => {
    const wrapper = mountToolMessage({
      toolResult: 'false',
    })

    await wrapper.find('.tool-line').trigger('click')

    const block = wrapper.find('.tool-details .hljs-code-block')
    expect(block.exists()).toBe(true)
    expect(block.find('.code-lang').text()).toBe('text')
    expect(block.find('code').text()).toBe('false')
  })

  it('does not mark assistant prose that starts with Error as a failed agent response', () => {
    const wrapper = mountGroupMessage(
      {
        content: 'Error: 확인 결과:\n\n- 운영 서버는 현재 정상',
        finish_reason: 'stop',
      },
      [{
        id: 'room-agent-1',
        roomId: 'room-1',
        agentId: 'agent-1',
        profile: 'default',
        name: 'UAT Agent',
        description: '',
        invited: Date.now(),
      }],
    )

    expect(wrapper.find('.msg-content').classes()).not.toContain('agent-error')
  })

  it('marks assistant messages with error finish reason as failed agent responses', () => {
    const wrapper = mountGroupMessage(
      {
        content: 'Agent failed while running',
        finish_reason: 'error',
      },
      [{
        id: 'room-agent-1',
        roomId: 'room-1',
        agentId: 'agent-1',
        profile: 'default',
        name: 'UAT Agent',
        description: '',
        invited: Date.now(),
      }],
    )

    expect(wrapper.find('.msg-content').classes()).toContain('agent-error')
  })
})
