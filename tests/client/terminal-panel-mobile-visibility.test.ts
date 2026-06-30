// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/api/client', () => ({
  getApiKey: () => '',
  getBaseUrlValue: () => '',
}))

const mockSettingsStore = vi.hoisted(() => ({
  display: {
    terminal_font_size: 14,
    terminal_font_family: 'Menlo, Monaco, "Courier New", monospace',
    show_terminal_session_list: undefined as boolean | undefined,
  },
  updateLocal: vi.fn((_section: string, values: Record<string, unknown>) => {
    Object.assign(mockSettingsStore.display, values)
  }),
  saveSection: vi.fn(async (_section: string, values: Record<string, unknown>) => {
    Object.assign(mockSettingsStore.display, values)
  }),
}))

const mockChatStore = vi.hoisted(() => ({
  activeSessionId: 'chat-1',
  activeSession: { id: 'chat-1', workspace: '/workspace-one' },
  sessions: [
    { id: 'chat-1', workspace: '/workspace-one' },
    { id: 'chat-2', workspace: '/workspace-two' },
  ],
}))

vi.mock('@/stores/hermes/settings', () => ({
  useSettingsStore: () => mockSettingsStore,
}))

vi.mock('@/stores/hermes/chat', () => ({
  useChatStore: () => mockChatStore,
}))

vi.mock('naive-ui', async () => {
  const { defineComponent, h } = await import('vue')
  const passthrough = (tag = 'div') => defineComponent({
    setup(_, { slots }) {
      return () => h(tag, [slots.trigger?.(), slots.icon?.(), slots.default?.()])
    },
  })
  return {
    useMessage: () => ({ error: vi.fn() }),
    NButton: passthrough('button'),
    NPopconfirm: passthrough('span'),
    NTooltip: passthrough('span'),
    NSelect: defineComponent({
      name: 'NSelect',
      props: ['value', 'options'],
      emits: ['update:value'],
      setup: (props, { emit, attrs }) => () => h('select', {
        ...attrs,
        value: props.value,
        onChange: (event: Event) => emit('update:value', (event.target as HTMLSelectElement).value),
      }, (props.options ?? []).map((option: { label: string; value: string }) => h('option', {
        value: option.value,
      }, option.label))),
    }),
    NInputNumber: defineComponent({
      name: 'NInputNumber',
      props: ['value'],
      emits: ['update:value'],
      setup: (props, { emit, attrs }) => () => h('input', {
        ...attrs,
        type: 'number',
        value: props.value,
        onInput: (event: Event) => emit('update:value', Number((event.target as HTMLInputElement).value)),
      }),
    }),
    NInput: defineComponent({
      name: 'NInput',
      props: ['value'],
      emits: ['update:value'],
      setup: (props, { emit, attrs }) => () => h('input', {
        ...attrs,
        value: props.value,
        onInput: (event: Event) => emit('update:value', (event.target as HTMLInputElement).value),
      }),
    }),
  }
})

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = vi.fn()
  },
}))

vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class {},
}))

const { terminalInstances, FakeTerminal } = vi.hoisted(() => {
  class FakeTerminal {
    element: HTMLElement | undefined
    cols = 80
    rows = 24
    options: Record<string, unknown> = {}
    blur = vi.fn(() => {
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (focused && this.element?.contains(focused)) focused.blur()
    })
    focus = vi.fn()
    loadAddon = vi.fn()
    onData = vi.fn()
    write = vi.fn()
    refresh = vi.fn()
    scrollLines = vi.fn()
    dispose = vi.fn()

    constructor(options: Record<string, unknown>) {
      this.options = options
      terminalInstances.push(this)
    }

    open(container: HTMLElement) {
      this.element = document.createElement('div')
      this.element.className = 'xterm'
      const textarea = document.createElement('textarea')
      this.element.appendChild(textarea)
      container.appendChild(this.element)
    }
  }

  const terminalInstances: Array<InstanceType<typeof FakeTerminal>> = []
  return { terminalInstances, FakeTerminal }
})

vi.mock('@xterm/xterm', () => ({
  Terminal: FakeTerminal,
}))

const websocketInstances: Array<FakeWebSocket> = []

class FakeWebSocket {
  static OPEN = 1
  static CLOSED = 3
  readyState = FakeWebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = FakeWebSocket.CLOSED
  })

  constructor() {
    websocketInstances.push(this)
  }
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
}

const globalStubs = {
  NButton: { template: '<button v-bind="$attrs"><slot name="icon" /><slot /></button>' },
  NPopconfirm: { template: '<span><slot name="trigger" /><slot /></span>' },
  NTooltip: { template: '<span><slot name="trigger" /><slot /></span>' },
  NSelect: {
    name: 'NSelect',
    props: ['value', 'options'],
    emits: ['update:value'],
    template: '<select :value="value" @change="$emit(\'update:value\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
  },
  NInputNumber: {
    name: 'NInputNumber',
    props: ['value'],
    template: '<input type="number" :value="value" @input="$emit(\'update:value\', Number($event.target.value))" />',
  },
  NInput: {
    name: 'NInput',
    props: ['value'],
    template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
  },
}

import TerminalPanel from '@/components/hermes/chat/TerminalPanel.vue'
import terminalPanelSource from '@/components/hermes/chat/TerminalPanel.vue?raw'

function mountPanel(visible: boolean) {
  return mount(TerminalPanel, {
    props: { visible },
    attachTo: document.body,
    global: { stubs: globalStubs },
  })
}

describe('TerminalPanel mobile shortcuts visibility', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    terminalInstances.length = 0
    websocketInstances.length = 0
    vi.stubGlobal('WebSocket', FakeWebSocket)
    vi.stubGlobal('ResizeObserver', class {
      observe = vi.fn()
      disconnect = vi.fn()
    })
    stubMatchMedia(false)
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    })
    mockSettingsStore.display.terminal_font_size = 14
    mockSettingsStore.display.terminal_font_family = 'Menlo, Monaco, "Courier New", monospace'
    mockSettingsStore.display.show_terminal_session_list = undefined
    mockChatStore.activeSessionId = 'chat-1'
    mockChatStore.activeSession = { id: 'chat-1', workspace: '/workspace-one' }
    mockChatStore.sessions = [
      { id: 'chat-1', workspace: '/workspace-one' },
      { id: 'chat-2', workspace: '/workspace-two' },
    ]
    mockSettingsStore.saveSection.mockClear()
    mockSettingsStore.updateLocal.mockClear()
  })

  it('does not render fixed mobile shortcut controls while the drawer is hidden', async () => {
    const wrapper = mountPanel(false)

    expect(wrapper.find('.mobile-shortcut-bar').exists()).toBe(false)
    expect(wrapper.find('.mobile-shortcut-show').exists()).toBe(false)

    await wrapper.setProps({ visible: true })

    expect(wrapper.find('.mobile-shortcut-bar').exists()).toBe(true)
  })

  it('blurs the focused xterm input when the drawer becomes hidden', async () => {
    const wrapper = mountPanel(true)
    const socket = websocketInstances[0]
    expect(socket).toBeTruthy()

    socket.onopen?.()
    socket.onmessage?.({ data: JSON.stringify({ type: 'created', id: 'term-1', shell: 'zsh', pid: 123 }) })
    await wrapper.vm.$nextTick()

    const terminal = terminalInstances[0]
    const textarea = terminal.element?.querySelector('textarea') as HTMLTextAreaElement | null
    expect(textarea).toBeTruthy()
    textarea?.focus()
    expect(document.activeElement).toBe(textarea)

    await wrapper.setProps({ visible: false })

    expect(terminal.blur).toHaveBeenCalled()
    expect(document.activeElement).not.toBe(textarea)
    expect(wrapper.find('.mobile-shortcut-bar').exists()).toBe(false)
  })

  it('creates xterm instances with configured terminal font settings', async () => {
    mockSettingsStore.display.terminal_font_size = 18
    mockSettingsStore.display.terminal_font_family = 'JetBrains Mono, monospace'
    const wrapper = mountPanel(true)
    const socket = websocketInstances[0]

    socket.onopen?.()
    socket.onmessage?.({ data: JSON.stringify({ type: 'created', id: 'term-1', shell: 'zsh', pid: 123 }) })
    await wrapper.vm.$nextTick()

    expect(terminalInstances[0].options.fontSize).toBe(18)
    expect(terminalInstances[0].options.fontFamily).toBe('JetBrains Mono, monospace')
  })

  it('saves terminal font settings from the terminal panel header', async () => {
    const wrapper = mountPanel(true)

    await wrapper.find('.terminal-font-size-input').setValue('20')
    await wrapper.find('.terminal-font-family-input').setValue('"Fira Code", monospace')

    expect(mockSettingsStore.updateLocal).toHaveBeenCalledWith('display', { terminal_font_size: 20 })
    expect(mockSettingsStore.updateLocal).toHaveBeenCalledWith('display', { terminal_font_family: '"Fira Code", monospace' })
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_size: 20 })
    expect(mockSettingsStore.saveSection).toHaveBeenCalledWith('display', { terminal_font_family: '"Fira Code", monospace' })
  })

  it('can hide the terminal session sidebar for narrow fixed drawers', () => {
    mockSettingsStore.display.show_terminal_session_list = false
    const wrapper = mountPanel(true)

    expect(wrapper.find('.terminal-sidebar').exists()).toBe(false)
    expect(wrapper.find('.sidebar-toggle').exists()).toBe(false)
    expect(wrapper.find('.terminal-main').exists()).toBe(true)
  })

  it('collapses and expands the terminal session sidebar from the terminal header', async () => {
    const wrapper = mountPanel(true)

    expect(wrapper.find('.terminal-sidebar').exists()).toBe(true)
    const toggle = wrapper.find('.session-list-collapse-toggle')
    expect(toggle.exists()).toBe(true)

    await toggle.trigger('click')
    expect(wrapper.find('.terminal-sidebar').exists()).toBe(false)
    expect(wrapper.find('.session-list-collapse-glyph').text()).toBe('>')

    await wrapper.find('.session-list-collapse-toggle').trigger('click')
    const sidebar = wrapper.find('.terminal-sidebar')
    expect(sidebar.exists()).toBe(true)
    expect(sidebar.classes()).not.toContain('mobile-visible')
  })

  it('hides the desktop session collapse button on mobile while keeping the sessions drawer button', () => {
    stubMatchMedia(true)
    const wrapper = mountPanel(true)

    expect(wrapper.find('.session-list-collapse-toggle').exists()).toBe(false)
    expect(wrapper.find('.sidebar-toggle').exists()).toBe(true)
    expect(wrapper.find('.terminal-sidebar').exists()).toBe(true)
  })

  it('keeps mobile terminal header actions horizontally scrollable instead of squeezing font controls', () => {
    const source = terminalPanelSource

    expect(source).toContain('@media (max-width: $breakpoint-mobile)')
    expect(source).toContain('overflow-x: auto;')
    expect(source).toContain('touch-action: pan-x;')
    expect(source).toContain('-webkit-overflow-scrolling: touch;')
    expect(source).toContain('> * {\n      flex: 0 0 auto;')
    expect(source).toContain('min-width: max-content;')
    expect(source).toContain('width: 96px;')
  })

  it('applies terminal panel font changes to already-open xterm instances immediately', async () => {
    const wrapper = mountPanel(true)
    const socket = websocketInstances[0]

    socket.onopen?.()
    socket.onmessage?.({ data: JSON.stringify({ type: 'created', id: 'term-1', shell: 'zsh', pid: 123 }) })
    await wrapper.vm.$nextTick()

    const terminal = terminalInstances[0]
    expect(terminal.options.fontSize).toBe(14)

    await wrapper.find('.terminal-font-size-input').setValue('22')
    await wrapper.find('.terminal-font-family-input').setValue('"JetBrains Mono", monospace')

    expect(terminal.options.fontSize).toBe(22)
    expect(terminal.options.fontFamily).toBe('"JetBrains Mono", monospace')
    expect(terminal.element?.style.fontSize).toBe('22px')
    expect(terminal.element?.style.fontFamily).toBe('"JetBrains Mono", monospace')
    expect(terminal.refresh).toHaveBeenCalled()
  })

  it('keeps drawer terminal sessions scoped to the active chat session', () => {
    const source = terminalPanelSource

    expect(source).toContain('const currentSessions = computed(() => sessions.value.filter((s) => s.chatSessionId === activeChatSessionId.value))')
    expect(source).toContain('v-for="s in currentSessions"')
    expect(source).toContain('watch(activeChatSessionId')
  })

  it('replaces the server auto-created default terminal with one rooted at the active workspace', async () => {
    const wrapper = mountPanel(true)
    const socket = websocketInstances[0]

    socket.onopen?.()
    socket.onmessage?.({ data: JSON.stringify({ type: 'created', id: 'auto-term', shell: 'zsh', pid: 123, cwd: '/Users/safemotion/.hermes' }) })
    await wrapper.vm.$nextTick()

    const sentPayloads = socket.send.mock.calls
      .map(([payload]) => payload)
      .filter((payload): payload is string => typeof payload === 'string')
      .map(payload => JSON.parse(payload))
    expect(sentPayloads).toContainEqual({ type: 'close', sessionId: 'auto-term' })
    expect(sentPayloads).toContainEqual({
      type: 'create',
      cwd: '/workspace-one',
      chatSessionId: 'chat-1',
    })
    expect(wrapper.find('.session-tab').exists()).toBe(false)
  })

  it('sends the active session workspace when creating a drawer terminal', async () => {
    const wrapper = mountPanel(true)
    const socket = websocketInstances[0]

    socket.onopen?.()
    socket.onmessage?.({ data: JSON.stringify({ type: 'created', id: 'term-1', shell: 'zsh', pid: 123 }) })
    await wrapper.vm.$nextTick()

    const newTabButton = wrapper.findAll('button').find(button => button.text().includes('terminal.newTab'))
    expect(newTabButton).toBeTruthy()
    await newTabButton!.trigger('click')

    const sentPayloads = socket.send.mock.calls
      .map(([payload]) => payload)
      .filter((payload): payload is string => typeof payload === 'string')
      .map(payload => JSON.parse(payload))
    expect(sentPayloads).toContainEqual({
      type: 'create',
      cwd: '/workspace-one',
      chatSessionId: 'chat-1',
    })
  })
})
