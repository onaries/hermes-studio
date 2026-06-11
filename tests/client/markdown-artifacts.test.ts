// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MarkdownRenderer from '@/components/hermes/chat/MarkdownRenderer.vue'
import { useArtifactsStore } from '@/stores/hermes/artifacts'
import { fetchFileText } from '@/api/hermes/download'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('naive-ui', async () => {
  const actual = await vi.importActual<typeof import('naive-ui')>('naive-ui')
  return {
    ...actual,
    useMessage: () => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }),
  }
})

vi.mock('@/api/hermes/download', () => ({
  fetchFileText: vi.fn(),
  downloadFile: vi.fn(),
  getDownloadUrl: (path: string) => `/api/hermes/download?path=${encodeURIComponent(path)}`,
}))

describe('MarkdownRenderer artifacts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchFileText).mockReset()
  })

  it('opens previewable local file cards in the artifacts drawer store', async () => {
    vi.mocked(fetchFileText).mockResolvedValue('# Generated')
    const store = useArtifactsStore()
    const wrapper = mount(MarkdownRenderer, {
      props: { content: '[report.md](/tmp/report.md)' },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('.markdown-file-card').trigger('click')

    expect(fetchFileText).toHaveBeenCalledWith('/tmp/report.md', 'report.md')
    expect(store.selectedArtifact?.name).toBe('report.md')
    expect(store.openSequence).toBe(1)
  })
})
