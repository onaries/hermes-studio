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
    NSelect: defineComponent({ setup: () => () => h('select') }),
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

const globalStubs = {
  NButton: { template: '<button><slot name="icon" /><slot /></button>' },
  NPopconfirm: { template: '<span><slot name="trigger" /><slot /></span>' },
  NTooltip: { template: '<span><slot name="trigger" /><slot /></span>' },
  NSelect: { template: '<select />' },
}

import TerminalPanel from '@/components/hermes/chat/TerminalPanel.vue'

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
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 800,
    })
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
})
