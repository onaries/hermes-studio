<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NTree } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useFilesStore } from '@/stores/hermes/files'
import * as filesApi from '@/api/hermes/files'
import type { TreeOption } from 'naive-ui'
import FileGlyph from './FileGlyph.vue'

const { t } = useI18n()
const filesStore = useFilesStore()
const props = withDefaults(defineProps<{
  rootPath?: string
  profile?: string | null
}>(), {
  rootPath: '',
  profile: undefined,
})

const effectiveProfile = computed(() => props.profile === undefined ? filesStore.currentProfile : props.profile)
const treeData = ref<TreeOption[]>([])
const selectedKeys = ref<string[]>([])

async function loadChildren(path: string): Promise<TreeOption[]> {
  try {
    const result = await filesApi.listFiles(path, effectiveProfile.value)
    return result.entries
      .filter(e => e.isDir)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => ({
        key: e.path,
        label: e.name,
        isLeaf: false,
      }))
  } catch {
    return []
  }
}

async function handleLoad(node: TreeOption): Promise<void> {
  node.children = await loadChildren(node.key as string)
}

function handleSelect(keys: string[]) {
  if (keys.length > 0) {
    selectedKeys.value = keys
    filesStore.navigateTo(keys[0], { profile: effectiveProfile.value })
  }
}

function handleRootClick() {
  selectedKeys.value = []
  filesStore.navigateTo(props.rootPath || '', { profile: effectiveProfile.value })
}

function renderLabel({ option }: { option: TreeOption }) {
  const label = String(option.label || '')
  return h('span', { class: 'tree-node-label', title: label }, label)
}

function renderPrefix() {
  return h(FileGlyph, { name: 'folder', isDir: true, size: 'sm' })
}

watch(
  [() => props.rootPath, effectiveProfile],
  async ([root]) => {
    selectedKeys.value = []
    treeData.value = await loadChildren(root || '')
  },
  { immediate: true },
)
</script>

<template>
  <div class="file-tree">
    <div class="tree-header" @click="handleRootClick">
      <FileGlyph name="workspace" is-dir size="sm" />
      <span>{{ t('files.breadcrumbRoot') }}</span>
    </div>
    <NTree
      :data="treeData"
      :selected-keys="selectedKeys"
      :on-load="handleLoad"
      :render-label="renderLabel"
      :render-prefix="renderPrefix"
      expand-on-click
      block-line
      @update:selected-keys="handleSelect"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.file-tree {
  padding: 8px;
}

.tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: $radius-sm;
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), 0.06);
  }
}

:deep(.tree-node-label) {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
