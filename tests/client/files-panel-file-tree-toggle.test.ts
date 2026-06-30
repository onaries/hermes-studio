// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const mockSettingsStore = vi.hoisted(() => ({
  display: {
    show_workspace_file_tree: undefined as boolean | undefined,
  },
}))

const mockFilesStore = vi.hoisted(() => ({
  currentPath: '/workspace',
  editingFile: null,
  previewFile: null,
  setRootPath: vi.fn(),
  fetchEntries: vi.fn(),
  closeEditor: vi.fn(),
  closePreview: vi.fn(),
}))

const mockChatStore = vi.hoisted(() => ({
  activeSessionId: 'session-1',
  activeSession: { id: 'session-1', workspace: '/workspace' },
  sessions: [] as Array<{ id: string; workspace?: string }>,
}))

vi.mock('@/stores/hermes/settings', () => ({
  useSettingsStore: () => mockSettingsStore,
}))

vi.mock('@/stores/hermes/files', () => ({
  useFilesStore: () => mockFilesStore,
}))

vi.mock('@/stores/hermes/chat', () => ({
  useChatStore: () => mockChatStore,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('naive-ui', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    NButton: defineComponent({
      name: 'NButton',
      setup: (_, { slots, attrs }) => () => h('button', attrs, slots.default?.()),
    }),
  }
})

vi.mock('@/components/hermes/files/FileTree.vue', () => ({
  default: { props: ['rootPath'], template: '<div class="file-tree-stub">tree {{ rootPath }}</div>' },
}))
vi.mock('@/components/hermes/files/FileBreadcrumb.vue', () => ({
  default: { template: '<div class="breadcrumb-stub" />' },
}))
vi.mock('@/components/hermes/files/FileToolbar.vue', () => ({
  default: { template: '<div class="toolbar-stub" />' },
}))
vi.mock('@/components/hermes/files/FileList.vue', () => ({
  default: { template: '<div class="file-list-stub" />' },
}))
vi.mock('@/components/hermes/files/FileContextMenu.vue', () => ({
  default: { template: '<div class="context-menu-stub" />' },
}))
vi.mock('@/components/hermes/files/FileEditor.vue', () => ({
  default: { template: '<div class="editor-stub" />' },
}))
vi.mock('@/components/hermes/files/FilePreview.vue', () => ({
  default: { template: '<div class="preview-stub" />' },
}))
vi.mock('@/components/hermes/files/FileUploadModal.vue', () => ({
  default: { template: '<div class="upload-modal-stub" />' },
}))
vi.mock('@/components/hermes/files/FileRenameModal.vue', () => ({
  default: { template: '<div class="rename-modal-stub" />' },
}))

import FilesPanel from '@/components/hermes/chat/FilesPanel.vue'
import filesPanelSource from '@/components/hermes/chat/FilesPanel.vue?raw'

describe('FilesPanel workspace tree visibility', () => {
  beforeEach(() => {
    mockSettingsStore.display.show_workspace_file_tree = undefined
    mockFilesStore.setRootPath.mockReset()
    mockFilesStore.fetchEntries.mockReset()
    mockFilesStore.closeEditor.mockReset()
    mockFilesStore.closePreview.mockReset()
    localStorage.clear()
  })

  it('shows the workspace file tree by default', async () => {
    const wrapper = mount(FilesPanel)
    await nextTick()

    expect(wrapper.find('.files-tree-panel').exists()).toBe(true)
    expect(wrapper.find('.file-tree-stub').exists()).toBe(true)
  })

  it('collapses and expands the workspace file tree from the drawer toolbar', async () => {
    const wrapper = mount(FilesPanel)
    await nextTick()

    expect(wrapper.find('.files-tree-panel').exists()).toBe(true)
    const toggle = wrapper.find('.file-tree-collapse-toggle')
    expect(toggle.exists()).toBe(true)

    await toggle.trigger('click')
    expect(wrapper.find('.files-tree-panel').exists()).toBe(false)
    expect(wrapper.text()).toContain('files.showFileTree')

    await wrapper.find('.file-tree-collapse-toggle').trigger('click')
    expect(wrapper.find('.files-tree-panel').exists()).toBe(true)
  })

  it('hides the workspace file tree when disabled in display settings', async () => {
    mockSettingsStore.display.show_workspace_file_tree = false
    const wrapper = mount(FilesPanel)
    await nextTick()

    expect(wrapper.find('.files-tree-panel').exists()).toBe(false)
    expect(wrapper.find('.file-tree-stub').exists()).toBe(false)
    expect(wrapper.find('.sidebar-toggle').exists()).toBe(false)
    expect(wrapper.find('.files-main-panel').exists()).toBe(true)
  })

  it('resets the drawer file path when the active chat session changes', () => {
    expect(filesPanelSource).toContain('[() => chatStore.activeSessionId, workspaceRoot]')
    expect(filesPanelSource).toContain('filesStore.closeEditor()')
    expect(filesPanelSource).toContain('filesStore.fetchEntries(root)')
  })
})
