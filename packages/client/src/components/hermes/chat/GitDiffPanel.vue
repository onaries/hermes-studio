<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NButton, NSpin } from 'naive-ui'
import { fetchGitDiff, type GitDiffFile, type GitDiffResponse } from '@/api/hermes/files'
import { useChatStore } from '@/stores/hermes/chat'
import { handleCodeBlockCopyClick, renderHighlightedCodeBlock } from './highlight'

interface Props {
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
})

const chatStore = useChatStore()
const { t } = useI18n()

const loading = ref(false)
const error = ref<string | null>(null)
const response = ref<GitDiffResponse | null>(null)
const selectedPath = ref<string>('')

const workspaceRoot = computed(() => {
  const activeId = chatStore.activeSessionId
  return chatStore.activeSession?.workspace
    || chatStore.sessions.find(session => session.id === activeId)?.workspace
    || ''
})

const files = computed(() => response.value?.files || [])
const selectedFile = computed(() => files.value.find(file => file.path === selectedPath.value) || null)
const additions = computed(() => files.value.reduce((sum, file) => sum + (file.additions || 0), 0))
const deletions = computed(() => files.value.reduce((sum, file) => sum + (file.deletions || 0), 0))
const hasChanges = computed(() => files.value.length > 0 || Boolean(response.value?.diff))
const diffHtml = computed(() => {
  const diff = response.value?.diff || ''
  if (!diff.trim()) return ''
  return renderHighlightedCodeBlock(diff, 'diff', t('common.copy'), {
    formatDiffFoldLabel: (hiddenCount) => t('gitDiff.hiddenLines', { count: hiddenCount }),
  })
})

function statusLabel(status: GitDiffFile['status']): string {
  return t(`gitDiff.status.${status}`)
}

function statusClass(status: GitDiffFile['status']): string {
  return `status-${status}`
}

function selectFile(path: string): void {
  selectedPath.value = selectedPath.value === path ? '' : path
}

async function loadDiff(): Promise<void> {
  if (!props.visible || !workspaceRoot.value) return
  loading.value = true
  error.value = null
  try {
    response.value = await fetchGitDiff(workspaceRoot.value, selectedPath.value || undefined)
  } catch (err: any) {
    error.value = err?.message || t('gitDiff.loadFailed')
    response.value = null
  } finally {
    loading.value = false
  }
}

function handleDiffClick(event: MouseEvent): void {
  void handleCodeBlockCopyClick(event)
}

watch(
  [() => props.visible, workspaceRoot],
  ([visible]) => {
    if (!visible) return
    selectedPath.value = ''
    void loadDiff()
  },
  { immediate: true },
)

watch(selectedPath, () => {
  if (!props.visible || !workspaceRoot.value) return
  void loadDiff()
})
</script>

<template>
  <div class="git-diff-panel">
    <header class="git-diff-toolbar">
      <div class="git-diff-title-block">
        <span class="git-diff-kicker">{{ t('gitDiff.kicker') }}</span>
        <strong>{{ t('gitDiff.title') }}</strong>
        <span v-if="response?.branch" class="git-diff-branch">
          {{ response.branch }}<template v-if="response.upstream"> → {{ response.upstream }}</template>
        </span>
      </div>
      <div class="git-diff-toolbar-actions">
        <span v-if="hasChanges" class="git-diff-totals" aria-live="polite">
          <span class="additions">+{{ additions.toLocaleString() }}</span>
          <span class="deletions">-{{ deletions.toLocaleString() }}</span>
        </span>
        <NButton size="small" :loading="loading" @click="loadDiff">
          {{ t('gitDiff.refresh') }}
        </NButton>
      </div>
    </header>

    <div v-if="!workspaceRoot" class="git-diff-empty">
      <strong>{{ t('gitDiff.noWorkspace') }}</strong>
      <p>{{ t('gitDiff.noWorkspaceHint') }}</p>
    </div>

    <NSpin v-else :show="loading" class="git-diff-spin">
      <div v-if="error" class="git-diff-empty error">
        <strong>{{ t('gitDiff.loadFailed') }}</strong>
        <p>{{ error }}</p>
      </div>
      <div v-else-if="response && !response.isRepo" class="git-diff-empty">
        <strong>{{ t('gitDiff.notRepo') }}</strong>
        <p>{{ response.workspace }}</p>
      </div>
      <div v-else-if="response && !hasChanges" class="git-diff-empty clean">
        <strong>{{ t('gitDiff.noChanges') }}</strong>
        <p>{{ t('gitDiff.noChangesHint') }}</p>
      </div>
      <div v-else class="git-diff-layout">
        <aside class="git-diff-file-list" :aria-label="t('gitDiff.changedFiles')">
          <button
            type="button"
            :class="['git-diff-file-row', 'all-changes', { active: !selectedPath }]"
            @click="selectedPath = ''"
          >
            <span class="file-main">
              <span class="file-name">{{ t('gitDiff.allChanges') }}</span>
              <span class="file-meta">{{ t('gitDiff.fileCount', { count: files.length }) }}</span>
            </span>
            <span class="file-stats">
              <span class="additions">+{{ additions }}</span>
              <span class="deletions">-{{ deletions }}</span>
            </span>
          </button>

          <button
            v-for="file in files"
            :key="file.path"
            type="button"
            :class="['git-diff-file-row', { active: selectedPath === file.path }]"
            @click="selectFile(file.path)"
          >
            <span class="status-dot" :class="statusClass(file.status)">{{ statusLabel(file.status).slice(0, 1) }}</span>
            <span class="file-main">
              <span class="file-name" :title="file.path">{{ file.path }}</span>
              <span class="file-meta">
                {{ statusLabel(file.status) }}
                <template v-if="file.oldPath"> · {{ file.oldPath }}</template>
              </span>
            </span>
            <span class="file-stats">
              <span class="additions">+{{ file.additions || 0 }}</span>
              <span class="deletions">-{{ file.deletions || 0 }}</span>
            </span>
          </button>
        </aside>

        <section class="git-diff-viewer">
          <div v-if="selectedFile" class="git-diff-selected">
            <span :class="['status-pill', statusClass(selectedFile.status)]">{{ statusLabel(selectedFile.status) }}</span>
            <strong>{{ selectedFile.path }}</strong>
          </div>
          <div v-if="diffHtml" class="git-diff-code" @click="handleDiffClick" v-html="diffHtml"></div>
          <div v-else class="git-diff-empty compact">
            <strong>{{ t('gitDiff.diffUnavailable') }}</strong>
            <p>{{ t('gitDiff.diffUnavailableHint') }}</p>
          </div>
        </section>
      </div>
    </NSpin>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.git-diff-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(circle at 16px 18px, rgba(var(--accent-primary-rgb), 0.12), transparent 28px),
    $bg-card;
}

.git-diff-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.git-diff-title-block {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 15px;
    color: $text-primary;
  }
}

.git-diff-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: $text-muted;
  text-transform: uppercase;
}

.git-diff-branch {
  color: $text-muted;
  font-family: $font-code;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.git-diff-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.git-diff-totals,
.file-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: $font-code;
  font-size: 12px;
  font-weight: 700;
}

.additions { color: #22c55e; }
.deletions { color: #ef4444; }

.git-diff-spin {
  flex: 1;
  min-height: 0;

  :deep(.n-spin-content) {
    height: 100%;
    min-height: 0;
  }
}

.git-diff-layout {
  display: grid;
  grid-template-columns: minmax(210px, 0.34fr) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.git-diff-file-list {
  border-right: 1px solid $border-color;
  background: rgba(0, 0, 0, 0.02);
  overflow: auto;
  min-width: 0;
}

.git-diff-file-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgba(var(--text-primary-rgb), 0.08);
  background: transparent;
  color: $text-secondary;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast;

  &.all-changes {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  &:hover,
  &.active {
    background: rgba(var(--accent-primary-rgb), 0.1);
    color: $text-primary;
  }

  &.active {
    box-shadow: inset 3px 0 0 $accent-primary;
  }
}

.status-dot {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-family: $font-code;
  font-size: 10px;
  font-weight: 800;
  color: $bg-card;
  background: $text-muted;
  text-transform: uppercase;
}

.status-added,
.status-untracked { background: #16a34a; color: #ecfdf5; }
.status-modified { background: #2563eb; color: #eff6ff; }
.status-deleted { background: #dc2626; color: #fef2f2; }
.status-renamed,
.status-copied { background: #a855f7; color: #faf5ff; }
.status-unknown { background: #64748b; color: #f8fafc; }

.file-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: $font-code;
  font-size: 12px;
  color: inherit;
}

.file-meta {
  color: $text-muted;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.git-diff-viewer {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.git-diff-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-bottom: 1px solid $border-color;
  min-width: 0;

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: $font-code;
    font-size: 12px;
  }
}

.status-pill {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
}

.git-diff-code {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;

  :deep(.hljs-code-block) {
    margin: 0;
    min-height: 100%;
  }

  :deep(.hljs-unified-diff code.hljs) {
    font-size: 11.5px;
  }
}

.git-diff-empty {
  margin: auto;
  max-width: 360px;
  padding: 28px;
  text-align: center;
  color: $text-muted;

  strong {
    display: block;
    margin-bottom: 6px;
    color: $text-primary;
  }

  p {
    margin: 0;
    font-size: 13px;
  }

  &.error strong { color: #ef4444; }
  &.clean strong { color: #22c55e; }
  &.compact { margin: 24px auto; }
}

@media (max-width: 720px) {
  .git-diff-toolbar {
    flex-direction: column;
  }

  .git-diff-layout {
    grid-template-columns: 1fr;
  }

  .git-diff-file-list {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid $border-color;
  }
}
</style>
