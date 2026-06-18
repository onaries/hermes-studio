<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NSpin, useMessage } from 'naive-ui'
import { useArtifactsStore, type ArtifactItem } from '@/stores/hermes/artifacts'
import MarkdownRenderer from './MarkdownRenderer.vue'

const { t } = useI18n()
const message = useMessage()
const artifactsStore = useArtifactsStore()
const mobileDetailOpen = ref(false)
const artifactListCollapsed = ref(false)
const artifactListRef = ref<HTMLElement | null>(null)
const artifactContentRef = ref<HTMLElement | null>(null)

const selectedArtifact = computed(() => artifactsStore.selectedArtifact)

const canDownload = computed(() => !!selectedArtifact.value?.path)
const selectedIsMarkdown = computed(() => selectedArtifact.value?.kind === 'markdown')
const selectedIsText = computed(() => selectedArtifact.value?.kind === 'text')
const selectedCanRenderText = computed(() =>
  (selectedIsText.value || selectedArtifact.value?.kind === 'file')
  && selectedArtifact.value?.content !== undefined,
)
const selectedIsImage = computed(() => selectedArtifact.value?.kind === 'image')
const selectedIsMedia = computed(() => selectedArtifact.value?.kind === 'media')
const selectedIsVideo = computed(() => /\.(mp4|webm|mov)$/i.test(selectedArtifact.value?.name || selectedArtifact.value?.path || ''))

function handleSelectArtifact(id: string): void {
  artifactsStore.selectArtifact(id)
  mobileDetailOpen.value = true
}

function showArtifactList(): void {
  artifactListCollapsed.value = false
  mobileDetailOpen.value = false
}

function toggleArtifactListCollapsed(): void {
  artifactListCollapsed.value = !artifactListCollapsed.value
  if (!artifactListCollapsed.value) {
    mobileDetailOpen.value = false
  }
}

function scrollElementToTop(element: HTMLElement | null): void {
  if (!element) return
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  element.scrollTop = 0
}

function scrollArtifactsToTop(): void {
  scrollElementToTop(artifactListRef.value)
  scrollElementToTop(artifactContentRef.value)
}

watch(
  () => artifactsStore.openSequence,
  (sequence, previousSequence) => {
    if (sequence !== previousSequence && selectedArtifact.value) {
      mobileDetailOpen.value = true
    }
  },
)

watch(
  () => artifactsStore.selectedArtifactId,
  (id) => {
    if (!id) {
      mobileDetailOpen.value = false
      return
    }
    void artifactsStore.ensureArtifactContent(id)
  },
  { immediate: true },
)

async function handleDownload(item: ArtifactItem | null): Promise<void> {
  if (!item?.path) return
  try {
    await artifactsStore.downloadArtifact(item)
  } catch (err: any) {
    message.error(err?.message || t('download.downloadFailed'))
  }
}
</script>

<template>
  <div
    class="artifacts-panel"
    :class="{
      'artifacts-panel--empty': artifactsStore.artifacts.length === 0,
      'artifacts-panel--list-collapsed': artifactListCollapsed && artifactsStore.artifacts.length > 0,
      'artifacts-panel--mobile-detail': mobileDetailOpen && !!selectedArtifact,
    }"
  >
    <aside v-if="artifactsStore.artifacts.length > 0 && !artifactListCollapsed" ref="artifactListRef" class="artifact-list" :aria-label="t('artifacts.list')">
      <div class="artifact-list-header">
        <span class="artifact-list-title">{{ t('artifacts.list') }}</span>
        <button
          type="button"
          class="artifact-list-collapse-toggle"
          :title="t('artifacts.hideList')"
          :aria-label="t('artifacts.hideList')"
          @click="toggleArtifactListCollapsed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>
      <button
        v-for="artifact in artifactsStore.artifacts"
        :key="artifact.id"
        type="button"
        class="artifact-list-item"
        :class="{ active: artifact.id === artifactsStore.selectedArtifactId }"
        @click="handleSelectArtifact(artifact.id)"
      >
        <span class="artifact-icon" aria-hidden="true">
          <svg v-if="artifact.kind === 'markdown' || artifact.kind === 'text'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="14" y2="17" />
          </svg>
          <svg v-else-if="artifact.kind === 'image'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </span>
        <span class="artifact-list-text">
          <span class="artifact-list-name">{{ artifact.name }}</span>
          <span v-if="artifact.path" class="artifact-list-path">{{ artifact.path }}</span>
        </span>
        <button
          type="button"
          class="artifact-remove"
          :title="t('artifacts.remove')"
          :aria-label="t('artifacts.remove')"
          @click.stop="artifactsStore.closeArtifact(artifact.id)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </button>
    </aside>

    <section class="artifact-viewer">
      <div v-if="selectedArtifact" class="artifact-toolbar">
        <button
          v-if="artifactListCollapsed && artifactsStore.artifacts.length > 0"
          type="button"
          class="artifact-list-show-toggle"
          :title="t('artifacts.showList')"
          :aria-label="t('artifacts.showList')"
          @click="toggleArtifactListCollapsed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>{{ t('artifacts.showList') }}</span>
        </button>
        <button
          type="button"
          class="artifact-back"
          :aria-label="t('artifacts.backToList')"
          @click="showArtifactList"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{{ t('artifacts.backToList') }}</span>
        </button>
        <div class="artifact-title-group">
          <h3 class="artifact-title">{{ selectedArtifact.name }}</h3>
          <p v-if="selectedArtifact.path" class="artifact-path" :title="selectedArtifact.path">{{ selectedArtifact.path }}</p>
        </div>
        <div class="artifact-actions">
          <button
            type="button"
            class="artifact-top"
            :title="t('artifacts.scrollToTop')"
            :aria-label="t('artifacts.scrollToTop')"
            @click="scrollArtifactsToTop"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15" />
              <line x1="12" y1="9" x2="12" y2="21" />
              <line x1="5" y1="3" x2="19" y2="3" />
            </svg>
            <span>{{ t('artifacts.scrollToTop') }}</span>
          </button>
          <button
            v-if="canDownload"
            type="button"
            class="artifact-download"
            @click="handleDownload(selectedArtifact)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ t('artifacts.download') }}
          </button>
        </div>
      </div>

      <div v-if="!selectedArtifact" class="artifact-empty">
        <div class="artifact-empty-icon" aria-hidden="true">▣</div>
        <h3>{{ t('artifacts.emptyTitle') }}</h3>
        <p>{{ t('artifacts.emptyDescription') }}</p>
      </div>

      <div v-else ref="artifactContentRef" class="artifact-content">
        <NSpin :show="selectedArtifact.status === 'loading'" class="artifact-spin">
          <div v-if="selectedArtifact.status === 'error'" class="artifact-error">
            {{ selectedArtifact.error || t('artifacts.loadFailed') }}
          </div>
          <div v-else-if="selectedIsMarkdown && selectedArtifact.content !== undefined" class="artifact-markdown">
            <MarkdownRenderer :content="selectedArtifact.content" />
          </div>
          <pre v-else-if="selectedCanRenderText" class="artifact-text">{{ selectedArtifact.content }}</pre>
          <img v-else-if="selectedIsImage" class="artifact-image" :src="artifactsStore.artifactUrl(selectedArtifact)" :alt="selectedArtifact.name" />
          <div v-else-if="selectedIsMedia" class="artifact-media">
            <video v-if="selectedIsVideo" class="artifact-video" controls :src="artifactsStore.artifactUrl(selectedArtifact)"></video>
            <audio v-else class="artifact-audio" controls :src="artifactsStore.artifactUrl(selectedArtifact)"></audio>
          </div>
          <div v-else class="artifact-unsupported">
            <p>{{ t('artifacts.unsupported') }}</p>
            <button v-if="canDownload" type="button" class="artifact-download secondary" @click="handleDownload(selectedArtifact)">
              {{ t('artifacts.download') }}
            </button>
          </div>
        </NSpin>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.artifacts-panel {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  background: $bg-primary;

  &.artifacts-panel--empty,
  &.artifacts-panel--list-collapsed {
    grid-template-columns: minmax(0, 1fr);

    .artifact-viewer {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: $breakpoint-mobile) {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 1fr);

    &:not(.artifacts-panel--empty):not(.artifacts-panel--mobile-detail) {
      .artifact-viewer {
        display: none;
      }
    }

    &.artifacts-panel--mobile-detail {
      .artifact-list {
        display: none;
      }
    }
  }
}

.artifact-list {
  border-right: 1px solid $border-color;
  background: $bg-secondary;
  overflow: auto;
  min-height: 0;
  padding: 8px;

  @media (max-width: $breakpoint-mobile) {
    height: 100%;
    max-height: none;
    border-right: 0;
    border-bottom: 0;
  }
}

.artifact-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 4px 8px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.08);
}

.artifact-list-title {
  min-width: 0;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.artifact-list-collapse-toggle,
.artifact-list-show-toggle {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.16);
  background: rgba(var(--accent-primary-rgb), 0.06);
  color: $text-secondary;
  border-radius: $radius-md;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    color: $text-primary;
    background: rgba(var(--accent-primary-rgb), 0.12);
  }
}

.artifact-list-collapse-toggle {
  padding: 5px 7px;
  flex-shrink: 0;
}

.artifact-list-show-toggle {
  padding: 6px 9px;
  flex-shrink: 0;
}

.artifact-list-item {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  color: $text-primary;
  border-radius: $radius-md;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px;
  cursor: pointer;
  text-align: left;

  &:hover,
  &.active {
    background: rgba(var(--accent-primary-rgb), 0.08);
    border-color: rgba(var(--accent-primary-rgb), 0.18);
  }
}

.artifact-icon {
  color: $text-secondary;
  display: inline-flex;
}

.artifact-list-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.artifact-list-name,
.artifact-list-path,
.artifact-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.artifact-list-name {
  font-size: 13px;
  font-weight: 600;
}

.artifact-list-path {
  font-size: 11px;
  color: $text-muted;
}

.artifact-remove {
  border: 0;
  background: transparent;
  color: $text-muted;
  border-radius: $radius-sm;
  padding: 4px;
  display: inline-flex;
  cursor: pointer;

  &:hover {
    color: $text-primary;
    background: rgba(var(--accent-primary-rgb), 0.12);
  }
}

.artifact-viewer {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.artifact-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid $border-color;
  background: $bg-card;
  flex-shrink: 0;
  @media (max-width: $breakpoint-mobile) {
    gap: 8px;
    padding: 8px 10px;

    .artifact-back {
      display: inline-flex;
    }

    .artifact-title {
      font-size: 14px;
    }

    .artifact-path {
      display: none;
    }

    .artifact-download,
    .artifact-top,
    .artifact-list-show-toggle {
      padding: 6px 8px;
    }

    .artifact-top span,
    .artifact-list-show-toggle span {
      display: none;
    }
  }
}

.artifact-back {
  border: 0;
  background: transparent;
  color: $text-secondary;
  border-radius: $radius-md;
  padding: 6px 8px;
  display: none;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    color: $text-primary;
    background: rgba(var(--accent-primary-rgb), 0.08);
  }
}

.artifact-title-group {
  min-width: 0;
  flex: 1;
}

.artifact-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.artifact-title {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
}

.artifact-path {
  margin: 4px 0 0;
  font-size: 12px;
  color: $text-muted;
  max-width: min(70vw, 720px);
}

.artifact-download,
.artifact-top {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.22);
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
  border-radius: $radius-md;
  padding: 8px 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba(var(--accent-primary-rgb), 0.16);
  }
}

.artifact-top {
  background: transparent;
  color: $text-secondary;
}

.artifact-download {
  &.secondary {
    margin-top: 8px;
  }
}

.artifact-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.artifact-spin {
  min-height: 100%;
}

.artifact-markdown,
.artifact-text,
.artifact-error,
.artifact-unsupported,
.artifact-empty,
.artifact-media {
  padding: 20px;
}

.artifact-markdown {
  max-width: 940px;
}

.artifact-text {
  margin: 0;
  min-height: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: $font-code;
  font-size: 13px;
  color: $text-primary;
  background: transparent;
}

.artifact-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  padding: 20px;
  box-sizing: border-box;
}

.artifact-video,
.artifact-audio {
  width: min(100%, 900px);
}

.artifact-error {
  color: $error;
}

.artifact-empty,
.artifact-unsupported {
  color: $text-secondary;
  text-align: center;
  margin: auto;
  max-width: 360px;
}

.artifact-empty-icon {
  font-size: 30px;
  color: $text-muted;
  margin-bottom: 8px;
}
</style>
