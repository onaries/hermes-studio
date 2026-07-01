<script setup lang="ts">
import { NButton, NSpin, NEmpty, useMessage } from 'naive-ui'
import { useI18n } from 'vue-i18n'
import { useFilesStore, isPreviewableFile, isTextFile } from '@/stores/hermes/files'
import { downloadFile } from '@/api/hermes/download'
import type { FileEntry } from '@/api/hermes/files'
import FileGlyph from './FileGlyph.vue'

const { t } = useI18n()
const message = useMessage()
const filesStore = useFilesStore()

const emit = defineEmits<{
  (e: 'contextmenu-entry', event: MouseEvent, entry: FileEntry): void
}>()

function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

async function handlePreview(entry: FileEntry) {
  try {
    await filesStore.openPreview(entry)
  } catch {
    message.error(t('files.backendError'))
  }
}

async function handleDoubleClick(entry: FileEntry) {
  if (entry.isDir) {
    filesStore.navigateTo(entry.path)
  } else if (isTextFile(entry.name)) {
    await filesStore.openEditor(entry.path)
  } else if (isPreviewableFile(entry.name)) {
    await handlePreview(entry)
  }
}

function handleContextMenu(e: MouseEvent, entry: FileEntry) {
  e.preventDefault()
  emit('contextmenu-entry', e, entry)
}

async function handleDownload(entry: FileEntry) {
  try {
    await downloadFile(entry.path, entry.name, filesStore.currentProfile)
  } catch (err: any) {
    message.error(err.message || t('files.backendError'))
  }
}
</script>

<template>
  <div class="file-list">
    <NSpin :show="filesStore.loading">
      <NEmpty v-if="!filesStore.loading && filesStore.sortedEntries.length === 0" :description="t('files.emptyDir')" />
      <div v-else class="file-list-items">
        <div class="file-list-header file-list-grid">
          <div class="file-name sort-header" @click="filesStore.setSort('name')">
            {{ t('files.name') }}
            <span v-if="filesStore.sortBy === 'name'" class="sort-indicator">{{ filesStore.sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </div>
          <div class="file-size sort-header" @click="filesStore.setSort('size')">
            {{ t('files.size') }}
            <span v-if="filesStore.sortBy === 'size'" class="sort-indicator">{{ filesStore.sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </div>
          <div class="file-date sort-header" @click="filesStore.setSort('modTime')">
            {{ t('files.modified') }}
            <span v-if="filesStore.sortBy === 'modTime'" class="sort-indicator">{{ filesStore.sortOrder === 'asc' ? '↑' : '↓' }}</span>
          </div>
          <div class="file-actions-placeholder" />
        </div>
        <div
          v-for="entry in filesStore.sortedEntries"
          :key="entry.path"
          class="file-list-row file-list-grid"
          @dblclick="handleDoubleClick(entry)"
          @contextmenu="handleContextMenu($event, entry)"
        >
          <div class="file-name">
            <FileGlyph :name="entry.name" :is-dir="entry.isDir" />
            <span class="file-label" :title="entry.name">{{ entry.name }}</span>
          </div>
          <div class="file-size">{{ entry.isDir ? '—' : formatSize(entry.size) }}</div>
          <div class="file-date">{{ formatDate(entry.modTime) }}</div>
          <div class="file-actions">
            <NButton v-if="isPreviewableFile(entry.name) && !entry.isDir" size="tiny" quaternary @click.stop="handlePreview(entry)" :title="t('files.preview')" :aria-label="t('files.preview')">
              <svg class="file-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            </NButton>
            <NButton v-if="isTextFile(entry.name) && !entry.isDir" size="tiny" quaternary @click.stop="filesStore.openEditor(entry.path)" :title="t('files.edit')" :aria-label="t('files.edit')">
              <svg class="file-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
              </svg>
            </NButton>
            <NButton v-if="!entry.isDir" size="tiny" quaternary @click.stop="handleDownload(entry)" :title="t('files.download')" :aria-label="t('files.download')">
              <svg class="file-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 3v11" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </NButton>
          </div>
        </div>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.file-list {
  padding: 8px 16px;
}

.file-list-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px 160px 60px;
  align-items: center;
  column-gap: 16px;
}

.file-list-header {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: $text-muted;
  border-bottom: 1px solid $border-light;
  margin-bottom: 4px;
  user-select: none;
}

.sort-header {
  cursor: pointer;

  &:hover {
    color: $text-primary;
  }
}

.sort-indicator {
  margin-left: 2px;
  font-size: 11px;
}

.file-actions-placeholder {
  min-width: 0;
}

.file-list-row {
  padding: 8px 12px;
  border-radius: $radius-sm;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background-color: rgba(var(--accent-primary-rgb), 0.06);

    .file-actions {
      opacity: 1;
    }
  }
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.file-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  text-align: right;
  color: $text-secondary;
}

.file-date {
  color: $text-secondary;
}

.file-actions {
  opacity: 0;
  transition: opacity $transition-fast;
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.file-action-icon {
  width: 14px;
  height: 14px;
}

@media (max-width: $breakpoint-mobile) {
  .file-list-grid {
    grid-template-columns: minmax(0, 1fr) 60px;
  }

  .file-size,
  .file-date {
    display: none;
  }
}
</style>
