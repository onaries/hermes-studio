<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import TerminalPanel from './TerminalPanel.vue'
import FilesPanel from './FilesPanel.vue'
import ArtifactsPanel from './ArtifactsPanel.vue'
import GitDiffPanel from './GitDiffPanel.vue'

interface Props {
  show: boolean
  activeTab?: 'terminal' | 'files' | 'artifacts' | 'gitDiff'
  pinned?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'update:pinned', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  activeTab: 'files',
  pinned: false
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const DRAWER_MIN_WIDTH = 420
const DRAWER_DEFAULT_WIDTH = 1180
const DRAWER_MAX_VIEWPORT_RATIO = 0.88
const DRAWER_WIDTH_STORAGE_KEY = 'hermes_drawer_width'

const activeTab = ref<'terminal' | 'files' | 'artifacts' | 'gitDiff'>(props.activeTab)
const isResizing = ref(false)
const isMobileLayout = ref(false)
const isPinnedLayout = computed(() => props.pinned && !isMobileLayout.value)
const isVisible = computed(() => props.show || isPinnedLayout.value)

function getMaxDrawerWidth(): number {
  if (typeof window === 'undefined') return DRAWER_DEFAULT_WIDTH
  return Math.max(DRAWER_MIN_WIDTH, Math.floor(window.innerWidth * DRAWER_MAX_VIEWPORT_RATIO))
}

function clampDrawerWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), DRAWER_MIN_WIDTH), getMaxDrawerWidth())
}

function loadDrawerWidth(): number {
  if (typeof window === 'undefined') return DRAWER_DEFAULT_WIDTH
  const saved = Number(window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY))
  return clampDrawerWidth(Number.isFinite(saved) && saved > 0 ? saved : DRAWER_DEFAULT_WIDTH)
}

const drawerWidth = ref(loadDrawerWidth())
const drawerStyle = computed(() => ({
  '--drawer-width': `${drawerWidth.value}px`,
  '--drawer-offscreen': `-${drawerWidth.value}px`,
}))

watch(() => props.activeTab, (newVal) => {
  if (newVal) activeTab.value = newVal
})

function handleClose() {
  if (isPinnedLayout.value) {
    emit('update:pinned', false)
  }
  emit('update:show', false)
}

function togglePinned() {
  emit('update:pinned', !props.pinned)
}

function persistDrawerWidth(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(drawerWidth.value))
}

function setDrawerWidth(width: number, persist = false): void {
  drawerWidth.value = clampDrawerWidth(width)
  if (persist) persistDrawerWidth()
}

function handlePointerMove(event: PointerEvent): void {
  if (!isResizing.value || typeof window === 'undefined') return
  setDrawerWidth(window.innerWidth - event.clientX)
}

function stopResize(): void {
  if (!isResizing.value) return
  isResizing.value = false
  document.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('pointerup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  persistDrawerWidth()
}

function startResize(event: PointerEvent): void {
  if (typeof window === 'undefined' || window.innerWidth <= 640) return
  event.preventDefault()
  isResizing.value = true
  document.addEventListener('pointermove', handlePointerMove)
  document.addEventListener('pointerup', stopResize)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
  handlePointerMove(event)
}

function handleResizeKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? 80 : 40
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    setDrawerWidth(drawerWidth.value + step, true)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    setDrawerWidth(drawerWidth.value - step, true)
  } else if (event.key === 'Home') {
    event.preventDefault()
    setDrawerWidth(DRAWER_MIN_WIDTH, true)
  } else if (event.key === 'End') {
    event.preventDefault()
    setDrawerWidth(getMaxDrawerWidth(), true)
  }
}

function handleViewportResize(): void {
  isMobileLayout.value = typeof window !== 'undefined' && window.innerWidth <= 640
  setDrawerWidth(drawerWidth.value, true)
}

onMounted(() => {
  handleViewportResize()
  window.addEventListener('resize', handleViewportResize)
})

onBeforeUnmount(() => {
  stopResize()
  window.removeEventListener('resize', handleViewportResize)
})
</script>

<template>
  <Teleport to="body" :disabled="isPinnedLayout">
    <div v-if="isVisible && !isPinnedLayout" class="drawer-overlay" @click="handleClose"></div>
    <div :class="['drawer-panel', { show: isVisible, resizing: isResizing, pinned: isPinnedLayout }]" :style="drawerStyle">
      <button
        type="button"
        class="drawer-resize-handle"
        :aria-label="t('drawer.resize')"
        :title="t('drawer.resize')"
        @pointerdown="startResize"
        @keydown="handleResizeKeydown"
      ></button>
      <div class="drawer-header">
        <div class="drawer-tabs">
          <button
            :class="['tab-button', { active: activeTab === 'files' }]"
            @click="activeTab = 'files'"
          >
            {{ t('drawer.files') }}
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'terminal' }]"
            @click="activeTab = 'terminal'"
          >
            {{ t('drawer.terminal') }}
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'artifacts' }]"
            @click="activeTab = 'artifacts'"
          >
            {{ t('drawer.artifacts') }}
          </button>
          <button
            :class="['tab-button', { active: activeTab === 'gitDiff' }]"
            @click="activeTab = 'gitDiff'"
          >
            {{ t('drawer.gitDiff') }}
          </button>
        </div>
        <div class="drawer-actions">
          <button
            type="button"
            class="pin-button"
            :class="{ active: pinned }"
            :aria-pressed="pinned"
            :aria-label="pinned ? t('drawer.unpin') : t('drawer.pin')"
            :title="pinned ? t('drawer.unpin') : t('drawer.pin')"
            @click="togglePinned"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 17v5" />
              <path d="M7 10.5 5.5 17h13L17 10.5" />
              <path d="M8 3h8l-1 7H9L8 3Z" />
            </svg>
          </button>
          <button type="button" class="close-button" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div class="drawer-content">
        <div v-show="activeTab === 'files'" class="drawer-pane">
          <FilesPanel />
        </div>
        <div v-show="activeTab === 'terminal'" class="drawer-pane">
          <TerminalPanel :visible="activeTab === 'terminal' && show" />
        </div>
        <div v-show="activeTab === 'artifacts'" class="drawer-pane">
          <ArtifactsPanel />
        </div>
        <div v-show="activeTab === 'gitDiff'" class="drawer-pane">
          <GitDiffPanel :visible="activeTab === 'gitDiff' && isVisible" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.drawer-panel {
  position: fixed;
  top: 0;
  right: var(--drawer-offscreen, min(-1180px, -88vw));
  width: var(--drawer-width, min(1180px, 88vw));
  min-width: 420px;
  max-width: 88vw;
  height: calc(100 * var(--vh));
  max-height: calc(100 * var(--vh));
  background: $bg-card;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: right 0.3s ease, width 0.12s ease;

  &.show {
    right: 0;
  }

  &.pinned {
    position: relative;
    top: auto;
    right: auto;
    height: 100%;
    max-height: 100%;
    z-index: 1;
    flex: 0 0 var(--drawer-width, min(1180px, 88vw));
    border-left: 1px solid $border-color;
    box-shadow: none;
    transition: width 0.12s ease;
  }

  &.resizing {
    transition: none;
  }

  @media (max-width: $breakpoint-mobile) {
    width: 100%;
    min-width: 0;
    max-width: 100%;
    right: -100%;

    &.show {
      right: 0;
    }
  }
}

.drawer-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -5px;
  width: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: ew-resize;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 4px;
    width: 2px;
    background: transparent;
    transition: background 0.15s ease;
  }

  &:hover::after,
  &:focus-visible::after {
    background: rgba(var(--accent-primary-rgb), 0.45);
  }

  &:focus-visible {
    outline: 2px solid rgba(var(--accent-primary-rgb), 0.45);
    outline-offset: -2px;
  }

  @media (max-width: $breakpoint-mobile) {
    display: none;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.drawer-tabs {
  display: flex;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
}

.tab-button {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  flex-shrink: 0;
  white-space: nowrap;
  border-radius: $radius-sm;

  &:hover {
    color: $text-primary;
    background: rgba(var(--accent-primary-rgb), 0.05);
  }

  &.active {
    color: var(--accent-primary);
    background: rgba(var(--accent-primary-rgb), 0.1);
  }
}

.drawer-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pin-button,
.close-button {
  padding: 8px;
  border: none;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: $text-secondary;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: all 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: $text-primary;
    background: rgba(var(--accent-primary-rgb), 0.15);
  }
}

.pin-button.active {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.16);
}

.drawer-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.drawer-pane {
  height: 100%;
  overflow: auto;
}
</style>
