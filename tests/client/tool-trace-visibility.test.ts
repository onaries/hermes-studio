// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ isDark: false }),
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

vi.mock('@/components/hermes/chat/MessageItem.vue', () => ({
  default: {
    name: 'MessageItem',
    props: {
      message: { type: Object, required: true },
      highlight: { type: Boolean, default: false },
    },
    template: '<div class="stub-message" :data-role="message.role" :data-id="message.id">{{ message.toolName || message.content }}</div>',
  },
}))

vi.mock('@/components/hermes/chat/VirtualMessageList.vue', () => ({
  default: {
    name: 'VirtualMessageList',
    props: {
      messages: { type: Array, default: () => [] },
    },
    methods: {
      scrollToBottom() {},
      shouldAutoFollowBottom() { return true },
    },
    template: `
      <div class="virtual-message-list-stub">
        <slot name="before" />
        <div v-for="message in messages" :key="message.id">
          <slot name="item" :message="message" />
        </div>
        <slot name="after" />
        <slot v-if="messages.length === 0" name="empty" />
      </div>
    `,
  },
}))

import MessageList from '@/components/hermes/chat/MessageList.vue'
import HistoryMessageList from '@/components/hermes/chat/HistoryMessageList.vue'
import { useChatStore, type Message, type Session } from '@/stores/hermes/chat'
import { useToolTraceVisibility } from '@/composables/useToolTraceVisibility'

const MessageItemStub = defineComponent({
  name: 'MessageItem',
  props: {
    message: { type: Object, required: true },
    highlight: { type: Boolean, default: false },
  },
  template: '<div class="stub-message" :data-role="message.role" :data-id="message.id">{{ message.toolName || message.content }}</div>',
})

const VirtualMessageListStub = defineComponent({
  name: 'VirtualMessageList',
  props: {
    messages: { type: Array, default: () => [] },
  },
  methods: {
    scrollToBottom() {},
    shouldAutoFollowBottom() { return true },
  },
  template: `
    <div class="virtual-message-list-stub">
      <slot name="before" />
      <div v-for="message in messages" :key="message.id">
        <slot name="item" :message="message" />
      </div>
      <slot name="after" />
      <slot v-if="messages.length === 0" name="empty" />
    </div>
  `,
})

function makeSession(messages: Message[]): Session {
  return {
    id: 'session-1',
    title: 'Tool trace visibility',
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

const sampleMessages: Message[] = [
  { id: 'user-1', role: 'user', content: 'inspect repo', timestamp: 1 },
  { id: 'tool-named', role: 'tool', content: '', timestamp: 2, toolName: 'read_file', toolArgs: { path: '/Users/safemotion/Documents/projects/safemotion/clip/really/long/file/path/that/does/not/fit/on/one/line.ts' }, toolPreview: '/Users/safemotion/Documents/projects/safemotion/clip/really/long/file/path/that…', toolResult: 'ok', toolStatus: 'done', toolDuration: 0.21 },
  { id: 'tool-internal', role: 'tool', content: '', timestamp: 3, toolResult: 'internal', toolStatus: 'done' },
  { id: 'assistant-1', role: 'assistant', content: 'done', timestamp: 4 },
]

describe('tool trace visibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.removeItem('hermes_show_tool_calls')
    useToolTraceVisibility().setToolTraceVisible(true)
  })

  function mountLiveList() {
    const chatStore = useChatStore()
    chatStore.activeSessionId = 'session-1'
    chatStore.messages = [...sampleMessages]
    chatStore.activeSession = makeSession(sampleMessages)
    chatStore.abortState = { aborting: true, synced: false }

    return mount(MessageList, {
      global: {
        stubs: {
          MessageItem: MessageItemStub,
          VirtualMessageList: VirtualMessageListStub,
          Transition: false,
        },
      },
    })
  }

  it('shows named transcript and live tool traces by default while keeping unnamed internal tools hidden', () => {
    const wrapper = mountLiveList()

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'tool-named',
      'assistant-1',
    ])
    expect(wrapper.findAll('.tool-call-name').map(node => node.text())).toContain('read_file')
    const readFileTool = wrapper.findAll('.tool-call-item').find(node => node.text().includes('read_file'))
    expect(readFileTool?.attributes('title')).toContain('/Users/safemotion/Documents/projects/safemotion/clip/really/long/file/path/that/does/not/fit/on/one/line.ts')
  })

  it('applies the same default-visible rule to history sessions', () => {
    const wrapper = mount(HistoryMessageList, {
      props: { session: makeSession(sampleMessages) },
      global: {
        stubs: { MessageItem: MessageItemStub, VirtualMessageList: VirtualMessageListStub },
      },
    })

    expect(wrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'tool-named',
      'assistant-1',
    ])
  })

  it('does not fall back to the live chat session while history session data is loading', () => {
    const chatStore = useChatStore()
    chatStore.activeSessionId = 'session-1'
    chatStore.activeSession = makeSession(sampleMessages)

    const wrapper = mount(HistoryMessageList, {
      global: {
        stubs: { MessageItem: MessageItemStub, VirtualMessageList: VirtualMessageListStub },
      },
    })

    expect(wrapper.findAll('.stub-message')).toHaveLength(0)
  })

  it('hides named transcript traces when the toggle is off while keeping live tool stream visible', () => {
    useToolTraceVisibility().setToolTraceVisible(false)

    const liveWrapper = mountLiveList()
    expect(liveWrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'assistant-1',
    ])
    expect(liveWrapper.findAll('.tool-call-name').map(node => node.text())).toContain('read_file')

    const historyWrapper = mount(HistoryMessageList, {
      props: { session: makeSession(sampleMessages) },
      global: {
        stubs: { MessageItem: MessageItemStub, VirtualMessageList: VirtualMessageListStub },
      },
    })
    expect(historyWrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'assistant-1',
    ])
  })
})
