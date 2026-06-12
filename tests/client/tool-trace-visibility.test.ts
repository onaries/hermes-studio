// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'

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
import { useSettingsStore } from '@/stores/hermes/settings'
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
    const settingsStore = useSettingsStore()
    settingsStore.display = { show_tool_mascot: undefined }
    useToolTraceVisibility().setToolTraceVisible(true)
  })

  function mountLiveList(messages: Message[] = sampleMessages, showLivePanel = true) {
    const chatStore = useChatStore()
    chatStore.activeSessionId = 'session-1'
    chatStore.messages = [...messages]
    chatStore.activeSession = makeSession(messages)
    chatStore.abortState = showLivePanel ? { aborting: true, synced: false } : null

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
    expect(wrapper.find('.thinking-video').exists()).toBe(true)
    expect(wrapper.findAll('.tool-call-name').map(node => node.text())).toContain('read_file')
    const readFileTool = wrapper.findAll('.tool-call-item').find(node => node.text().includes('read_file'))
    expect(readFileTool?.attributes('title')).toContain('/Users/safemotion/Documents/projects/safemotion/clip/really/long/file/path/that/does/not/fit/on/one/line.ts')
  })

  it('hides the live tool mascot when disabled in display settings', () => {
    const settingsStore = useSettingsStore()
    settingsStore.display = { show_tool_mascot: false }

    const wrapper = mountLiveList()

    expect(wrapper.find('.thinking-video').exists()).toBe(false)
    expect(wrapper.find('.streaming-indicator--no-mascot').exists()).toBe(true)
    expect(wrapper.findAll('.tool-call-name').map(node => node.text())).toContain('read_file')
  })

  it('summarizes large tool batches only in the transcript, not the live panel', () => {
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'do many things', timestamp: 1 },
      { id: 'tool-1', role: 'tool', content: '', timestamp: 2, toolName: 'terminal', toolArgs: { command: 'npm test' }, toolStatus: 'done', toolDuration: 0.4 },
      { id: 'tool-2', role: 'tool', content: '', timestamp: 3, toolName: 'terminal', toolArgs: { command: 'npm run build' }, toolStatus: 'done', toolDuration: 1.1 },
      { id: 'tool-3', role: 'tool', content: '', timestamp: 4, toolName: 'search_files', toolArgs: { pattern: 'tool', target: 'content' }, toolStatus: 'done', toolDuration: 2.2 },
      { id: 'tool-4', role: 'tool', content: '', timestamp: 5, toolName: 'web_search', toolArgs: { query: 'Hermes' }, toolStatus: 'done', toolDuration: 60.5 },
      { id: 'assistant-1', role: 'assistant', content: 'done', timestamp: 6 },
    ]

    const transcriptWrapper = mountLiveList(messages, false)

    const transcriptGroup = transcriptWrapper.find('.tool-trace-group')
    expect(transcriptGroup.exists()).toBe(true)
    expect(transcriptGroup.text()).toContain('chat.toolAggregate.ranCommandsMany')
    expect(transcriptWrapper.find('.tool-summary-duration').text()).toBe('chat.toolAggregate.durationMinutes')
    expect(transcriptWrapper.findAll('.stub-message').map(node => node.attributes('data-id'))).toEqual([
      'user-1',
      'assistant-1',
    ])

    const liveWrapper = mountLiveList(messages)
    expect(liveWrapper.find('.tool-call-summary-item').exists()).toBe(false)
    const liveToolNames = liveWrapper
      .findAll('.tool-call-item:not(.compression-item) .tool-call-name')
      .map(node => node.text())
    expect(liveToolNames).toEqual([
      'web_search',
      'search_files',
      'terminal',
      'terminal',
    ])
  })

  it('marks running live tools for entry/progress animation', () => {
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'inspect repo', timestamp: 1 },
      { id: 'tool-running', role: 'tool', content: '', timestamp: 2, toolName: 'search_files', toolArgs: { pattern: 'DrawerPanel' }, toolStatus: 'running' },
    ]

    const wrapper = mountLiveList(messages)
    const toolList = wrapper.find('.tool-call-list')
    const runningTool = wrapper.find('.tool-call-item--running')

    expect(toolList.exists()).toBe(true)
    expect(runningTool.exists()).toBe(true)
    expect(runningTool.find('.tool-call-spinner').exists()).toBe(true)
    expect(runningTool.text()).toContain('search_files')
  })

  it('keeps a visible entry animation class on newly added live tool rows', async () => {
    vi.useFakeTimers()
    try {
      const messages: Message[] = [
        { id: 'user-1', role: 'user', content: 'inspect repo', timestamp: 1 },
      ]
      const wrapper = mountLiveList(messages)
      const chatStore = useChatStore()

      const nextMessages: Message[] = [
        ...messages,
        { id: 'tool-running', role: 'tool', content: '', timestamp: 2, toolName: 'search_files', toolArgs: { pattern: 'DrawerPanel' }, toolStatus: 'running' },
      ]
      chatStore.activeSession = makeSession(nextMessages)
      await nextTick()

      expect(wrapper.find('.tool-call-item--entering').exists()).toBe(true)
      expect(wrapper.find('.tool-call-item--entering').text()).toContain('search_files')

      vi.advanceTimersByTime(901)
      await nextTick()

      expect(wrapper.find('.tool-call-item--entering').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not apply the stronger entry highlight to fast-completed live tools', async () => {
    vi.useFakeTimers()
    try {
      const messages: Message[] = [
        { id: 'user-1', role: 'user', content: 'inspect repo', timestamp: 1 },
      ]
      const wrapper = mountLiveList(messages)
      const chatStore = useChatStore()

      const nextMessages: Message[] = [
        ...messages,
        { id: 'tool-done', role: 'tool', content: '', timestamp: 2, toolName: 'read_file', toolArgs: { path: '/tmp/file.ts' }, toolStatus: 'done', toolDuration: 0.08 },
      ]
      chatStore.activeSession = makeSession(nextMessages)
      await nextTick()

      const doneTool = wrapper.find('.tool-call-item--done')
      expect(doneTool.exists()).toBe(true)
      expect(doneTool.text()).toContain('read_file')
      expect(wrapper.find('.tool-call-item--entering').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('expands live patch tools to show the changed diff', async () => {
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'patch file', timestamp: 1 },
      {
        id: 'tool-patch',
        role: 'tool',
        content: '',
        timestamp: 2,
        toolName: 'patch',
        toolArgs: { path: 'src/example.ts' },
        toolResult: {
          diff: '--- a/src/example.ts\n+++ b/src/example.ts\n@@ -1,2 +1,2 @@\n-const answer = 41\n+const answer = 42',
        },
        toolStatus: 'done',
      },
    ]
    const wrapper = mountLiveList(messages)

    const patchTool = wrapper.find('.tool-call-item--expandable')
    expect(patchTool.exists()).toBe(true)
    expect(patchTool.attributes('role')).toBe('button')
    expect(patchTool.attributes('aria-expanded')).toBe('false')

    await patchTool.trigger('click')
    await nextTick()

    const expandedPatchTool = wrapper.find('.tool-call-item--expandable')
    const details = wrapper.find('.tool-call-patch-details')
    expect(expandedPatchTool.attributes('aria-expanded')).toBe('true')
    expect(details.exists()).toBe(true)
    expect(details.text()).toContain('chat.patchChanges')
    expect(details.text()).toContain('-const answer = 41')
    expect(details.text()).toContain('+const answer = 42')
  })

  it('renders the current todo panel below the live tool panel', () => {
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'do the thing', timestamp: 1 },
      { id: 'tool-read', role: 'tool', content: '', timestamp: 2, toolName: 'read_file', toolArgs: { path: '/tmp/file.ts' }, toolResult: 'ok', toolStatus: 'done' },
      { id: 'tool-todo', role: 'tool', content: '', timestamp: 3, toolName: 'todo', toolArgs: JSON.stringify({ todos: [
        { id: 'a', content: 'Plan patch', status: 'completed' },
        { id: 'b', content: 'Apply patch', status: 'in_progress' },
        { id: 'c', content: 'Verify behavior', status: 'pending' },
      ] }), toolResult: '{}', toolStatus: 'done' },
    ]
    const wrapper = mountLiveList(messages)
    const html = wrapper.html()

    expect(wrapper.find('.tool-calls-panel').exists()).toBe(true)
    expect(wrapper.find('.todo-panel').exists()).toBe(true)
    expect(html.indexOf('streaming-indicator')).toBeLessThan(html.indexOf('todo-panel'))
    expect(html.indexOf('tool-calls-panel')).toBeLessThan(html.indexOf('todo-panel'))
    expect(wrapper.text()).toContain('Plan patch')
    expect(wrapper.text()).toContain('Apply patch')
    expect(wrapper.text()).toContain('Verify behavior')
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
