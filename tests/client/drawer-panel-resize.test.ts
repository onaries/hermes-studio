// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/hermes/chat/FilesPanel.vue', () => ({
  default: { template: '<div class="files-panel-stub" />' },
}))

vi.mock('@/components/hermes/chat/TerminalPanel.vue', () => ({
  default: { props: ['visible'], template: '<div class="terminal-panel-stub" />' },
}))

vi.mock('@/components/hermes/chat/ArtifactsPanel.vue', () => ({
  default: { template: '<div class="artifacts-panel-stub" />' },
}))

vi.mock('@/components/hermes/chat/GitDiffPanel.vue', () => ({
  default: { props: ['visible'], template: '<div class="git-diff-panel-stub" />' },
}))

import DrawerPanel from '@/components/hermes/chat/DrawerPanel.vue'

const panelStubs = {
  Teleport: false,
}

function mountDrawer(props: Record<string, unknown> = {}) {
  return mount(DrawerPanel, {
    props: { show: true, ...props },
    attachTo: document.body,
    global: { stubs: panelStubs },
  })
}

function drawerPanel(): HTMLElement {
  const panel = document.body.querySelector('.drawer-panel') as HTMLElement | null
  expect(panel).not.toBeNull()
  return panel as HTMLElement
}

function resizeHandle(): HTMLElement {
  const handle = document.body.querySelector('.drawer-resize-handle') as HTMLElement | null
  expect(handle).not.toBeNull()
  return handle as HTMLElement
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('DrawerPanel resize', () => {
  beforeEach(() => {
    setViewportWidth(1200)
    localStorage.clear()
    document.body.innerHTML = ''
  })

  it('renders a desktop resize handle and clamps the initial width to the viewport', () => {
    mountDrawer()

    expect(resizeHandle().getAttribute('aria-label')).toBe('drawer.resize')
    expect(drawerPanel().getAttribute('style')).toContain('--drawer-width: 1056px')
  })

  it('resizes from the left edge while preserving the minimum width and persistence', async () => {
    mountDrawer()

    resizeHandle().dispatchEvent(new MouseEvent('pointerdown', { clientX: 500, bubbles: true, cancelable: true }))
    await nextTick()
    expect(drawerPanel().getAttribute('style')).toContain('--drawer-width: 700px')

    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 900 }))
    await nextTick()
    expect(drawerPanel().getAttribute('style')).toContain('--drawer-width: 420px')

    document.dispatchEvent(new MouseEvent('pointerup'))
    await nextTick()
    expect(localStorage.getItem('hermes_drawer_width')).toBe('420')
  })

  it('supports keyboard resizing from the handle', async () => {
    localStorage.setItem('hermes_drawer_width', '600')
    mountDrawer()
    const handle = resizeHandle()

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    await nextTick()
    expect(drawerPanel().getAttribute('style')).toContain('--drawer-width: 640px')
    expect(localStorage.getItem('hermes_drawer_width')).toBe('640')

    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }))
    await nextTick()
    expect(drawerPanel().getAttribute('style')).toContain('--drawer-width: 420px')
    expect(localStorage.getItem('hermes_drawer_width')).toBe('420')
  })

  it('switches to the Git Diff drawer tab', async () => {
    mountDrawer()
    const gitDiffTab = Array.from(document.body.querySelectorAll<HTMLButtonElement>('.tab-button'))
      .find(button => button.textContent?.trim() === 'drawer.gitDiff')
    expect(gitDiffTab).toBeTruthy()

    gitDiffTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(document.body.querySelector('.git-diff-panel-stub')).not.toBeNull()
  })

  it('renders as an inline pinned panel without an overlay on desktop', async () => {
    const wrapper = mountDrawer({ show: false, pinned: true })
    await nextTick()

    expect(document.body.querySelector('.drawer-overlay')).toBeNull()
    expect(drawerPanel().classList.contains('show')).toBe(true)
    expect(drawerPanel().classList.contains('pinned')).toBe(true)
    const pin = document.body.querySelector('.pin-button') as HTMLButtonElement | null
    expect(pin?.getAttribute('aria-pressed')).toBe('true')
    expect(pin?.getAttribute('aria-label')).toBe('drawer.unpin')
  })
})
