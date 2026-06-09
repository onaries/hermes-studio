// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FileEditor from '@/components/hermes/files/FileEditor.vue'
import { useFilesStore } from '@/stores/hermes/files'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('naive-ui', () => ({
  NButton: { template: '<button type="button" v-bind="$attrs"><slot /></button>' },
  NSpace: { template: '<div class="n-space"><slot /></div>' },
  useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
  useDialog: () => ({ warning: vi.fn() }),
}))

vi.mock('monaco-editor', () => ({
  KeyMod: { CtrlCmd: 1 },
  KeyCode: { KeyS: 2 },
  editor: {
    create: vi.fn(() => ({
      onDidChangeModelContent: vi.fn(),
      addCommand: vi.fn(),
      getValue: vi.fn(() => ''),
      dispose: vi.fn(),
    })),
  },
}))

describe('FileEditor header', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows only the file basename while preserving the full path as a tooltip', () => {
    const store = useFilesStore()
    store.editingFile = {
      path: '/Users/safemotion/Documents/projects/seonwoo/hermes-web-ui/bot/config/settings.yaml',
      content: 'enabled: true\n',
      originalContent: 'enabled: true\n',
      language: 'yaml',
    }

    const wrapper = mount(FileEditor, { attachTo: document.body })
    const filename = wrapper.find('.editor-filename')

    expect(filename.text()).toBe('settings.yaml')
    expect(filename.attributes('title')).toBe('/Users/safemotion/Documents/projects/seonwoo/hermes-web-ui/bot/config/settings.yaml')
    expect(filename.text()).not.toContain('/Users/safemotion')

    wrapper.unmount()
  })
})
