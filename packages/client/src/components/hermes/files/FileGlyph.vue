<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name: string
  isDir?: boolean
  size?: 'sm' | 'md'
}>(), {
  isDir: false,
  size: 'md',
})

const ext = computed(() => {
  if (props.isDir) return ''
  const parts = props.name.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() || '' : ''
})

const kind = computed(() => {
  if (props.isDir) return 'folder'
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'vue', 'svelte'].includes(ext.value)) return 'code'
  if (['json', 'yaml', 'yml', 'toml', 'env', 'ini', 'conf', 'config'].includes(ext.value)) return 'config'
  if (['md', 'mdx', 'txt', 'log', 'rst'].includes(ext.value)) return 'text'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(ext.value)) return 'image'
  if (['zip', 'gz', 'tgz', 'tar', '7z', 'rar'].includes(ext.value)) return 'archive'
  if (['sh', 'bash', 'zsh', 'fish', 'ps1'].includes(ext.value)) return 'shell'
  if (['mp4', 'mov', 'webm', 'mp3', 'wav', 'flac'].includes(ext.value)) return 'media'
  return 'file'
})

const label = computed(() => {
  if (props.isDir) return ''
  const normalized = ext.value || 'file'
  if (normalized.length <= 4) return normalized
  return normalized.slice(0, 4)
})
</script>

<template>
  <span :class="['file-glyph', `file-glyph--${kind}`, `file-glyph--${size}`]" aria-hidden="true">
    <svg v-if="isDir" class="folder-shape" viewBox="0 0 24 20" fill="none">
      <path class="folder-back" d="M2.5 5.5A2.5 2.5 0 0 1 5 3h4.5l2 2H19a2.5 2.5 0 0 1 2.5 2.5v1H2.5v-3Z" />
      <path class="folder-front" d="M2 8.5A2.5 2.5 0 0 1 4.5 6h15A2.5 2.5 0 0 1 22 8.5v7A2.5 2.5 0 0 1 19.5 18h-15A2.5 2.5 0 0 1 2 15.5v-7Z" />
    </svg>
    <template v-else>
      <span class="file-corner" />
      <span class="glyph-label">{{ label }}</span>
    </template>
  </span>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.file-glyph {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  font-family: $font-code;
  font-weight: 800;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.24),
    0 1px 2px rgba(15, 23, 42, 0.08);
}

.file-glyph--sm {
  width: 19px;
  height: 19px;
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);

  .glyph-label {
    font-size: 7px;
    letter-spacing: -0.06em;
  }
}

.glyph-label {
  position: relative;
  z-index: 1;
  max-width: 22px;
  color: #fff;
  font-size: 8px;
  line-height: 1;
}

.file-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 9px;
  height: 9px;
  border-bottom-left-radius: 4px;
  background: rgba(255, 255, 255, 0.34);
}

.file-glyph--file { background: linear-gradient(135deg, #64748b, #334155); }
.file-glyph--code { background: linear-gradient(135deg, #2563eb, #7c3aed); }
.file-glyph--config { background: linear-gradient(135deg, #0f766e, #14b8a6); }
.file-glyph--text { background: linear-gradient(135deg, #475569, #1f2937); }
.file-glyph--image { background: linear-gradient(135deg, #f97316, #ec4899); }
.file-glyph--archive { background: linear-gradient(135deg, #a16207, #ca8a04); }
.file-glyph--shell { background: linear-gradient(135deg, #16a34a, #15803d); }
.file-glyph--media { background: linear-gradient(135deg, #db2777, #9333ea); }

.file-glyph--folder {
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.folder-shape {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1px 1px rgba(15, 23, 42, 0.14));
}

.folder-back {
  fill: #f6c65b;
}

.folder-front {
  fill: #f59e0b;
}

.dark .file-glyph {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.14),
    0 1px 2px rgba(0, 0, 0, 0.22);
}
</style>
