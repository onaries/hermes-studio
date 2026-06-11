// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ArtifactsPanel from '@/components/hermes/chat/ArtifactsPanel.vue'
import { useArtifactsStore } from '@/stores/hermes/artifacts'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      let out = key
      for (const [param, value] of Object.entries(params || {})) {
        out = out.replace(`{${param}}`, String(value))
      }
      return out
    },
  }),
}))

vi.mock('naive-ui', () => ({
  NSpin: { props: ['show'], template: '<div class="n-spin-stub"><slot /></div>' },
  useMessage: () => ({ error: vi.fn() }),
}))

vi.mock('@/components/hermes/chat/MarkdownRenderer.vue', () => ({
  default: { props: ['content'], template: '<div class="markdown-renderer-stub">{{ content }}</div>' },
}))

describe('ArtifactsPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lets the empty artifact state span the full drawer width', () => {
    const wrapper = mount(ArtifactsPanel)

    expect(wrapper.classes()).toContain('artifacts-panel--empty')
    expect(wrapper.find('.artifact-list').exists()).toBe(false)
    expect(wrapper.find('.artifact-viewer').exists()).toBe(true)
    expect(wrapper.find('.artifact-empty').exists()).toBe(true)
  })

  it('restores the two-column list layout when artifacts exist', () => {
    const store = useArtifactsStore()
    store.openContentArtifact({ name: 'notes.md', content: '# Notes', kind: 'markdown', path: '/tmp/notes.md' })

    const wrapper = mount(ArtifactsPanel)

    expect(wrapper.classes()).not.toContain('artifacts-panel--empty')
    expect(wrapper.find('.artifact-list').exists()).toBe(true)
    expect(wrapper.find('.artifact-list-name').text()).toBe('notes.md')
  })

  it('uses a list-to-detail state for mobile artifact browsing', async () => {
    const store = useArtifactsStore()
    store.openContentArtifact({ name: 'notes.md', content: '# Notes', kind: 'markdown', path: '/tmp/notes.md' })

    const wrapper = mount(ArtifactsPanel)

    expect(wrapper.classes()).not.toContain('artifacts-panel--mobile-detail')

    await wrapper.find('.artifact-list-item').trigger('click')
    expect(wrapper.classes()).toContain('artifacts-panel--mobile-detail')
    expect(wrapper.find('.artifact-back').exists()).toBe(true)

    await wrapper.find('.artifact-back').trigger('click')
    expect(wrapper.classes()).not.toContain('artifacts-panel--mobile-detail')
  })

  it('renders fetched unclassified file content as a text preview', () => {
    const store = useArtifactsStore()
    store.openContentArtifact({ name: 'artifact.out', content: 'plain output', kind: 'file', path: '/tmp/artifact.out' })

    const wrapper = mount(ArtifactsPanel)

    expect(wrapper.find('.artifact-text').exists()).toBe(true)
    expect(wrapper.find('.artifact-text').text()).toContain('plain output')
    expect(wrapper.find('.artifact-unsupported').exists()).toBe(false)
  })

  it('scrolls the artifact list and preview back to the top', async () => {
    const store = useArtifactsStore()
    store.openContentArtifact({ name: 'notes.md', content: '# Notes', kind: 'markdown', path: '/tmp/notes.md' })
    const scrollTo = vi.fn()
    const originalScrollTo = HTMLElement.prototype.scrollTo
    HTMLElement.prototype.scrollTo = scrollTo

    try {
      const wrapper = mount(ArtifactsPanel)
      await wrapper.find('.artifact-top').trigger('click')

      expect(scrollTo).toHaveBeenCalledTimes(2)
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    } finally {
      HTMLElement.prototype.scrollTo = originalScrollTo
    }
  })
})
