import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { downloadFile, fetchFileText, getDownloadUrl } from '@/api/hermes/download'

export type ArtifactKind = 'markdown' | 'text' | 'image' | 'media' | 'file'
export type ArtifactStatus = 'loading' | 'ready' | 'error'

export interface ArtifactItem {
  id: string
  name: string
  path?: string
  content?: string
  kind: ArtifactKind
  status: ArtifactStatus
  error?: string
  createdAt: number
}

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown'])
const TEXT_EXTENSIONS = new Set([
  'txt',
  'json',
  'csv',
  'log',
  'py',
  'yaml',
  'yml',
  'toml',
  'sh',
  'xml',
  'html',
  'css',
  'js',
  'ts',
  'rs',
  'go',
  'java',
  'c',
  'cpp',
  'h',
])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const MEDIA_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'])

function extensionOf(nameOrPath: string): string {
  return nameOrPath.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || ''
}

function inferKind(nameOrPath: string): ArtifactKind {
  const ext = extensionOf(nameOrPath)
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'
  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (MEDIA_EXTENSIONS.has(ext)) return 'media'
  return 'file'
}

function artifactId(pathOrName: string): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${pathOrName}`
}

export const useArtifactsStore = defineStore('artifacts', () => {
  const artifacts = ref<ArtifactItem[]>([])
  const selectedArtifactId = ref<string | null>(null)
  const openSequence = ref(0)

  const selectedArtifact = computed(() => artifacts.value.find(item => item.id === selectedArtifactId.value) || null)

  function selectArtifact(id: string): void {
    selectedArtifactId.value = id
    openSequence.value += 1
  }

  function upsertArtifact(item: ArtifactItem): void {
    artifacts.value = [item, ...artifacts.value.filter(existing => existing.id !== item.id)].slice(0, 20)
    selectedArtifactId.value = item.id
    openSequence.value += 1
  }

  function updateArtifact(id: string, patch: Partial<ArtifactItem>): ArtifactItem | null {
    let updated: ArtifactItem | null = null
    artifacts.value = artifacts.value.map(item => {
      if (item.id !== id) return item
      updated = { ...item, ...patch }
      return updated
    })
    return updated
  }

  function openContentArtifact(options: { name: string; content: string; kind?: ArtifactKind; path?: string }): ArtifactItem {
    const item: ArtifactItem = {
      id: artifactId(options.path || options.name),
      name: options.name,
      path: options.path,
      content: options.content,
      kind: options.kind || inferKind(options.name),
      status: 'ready',
      createdAt: Date.now(),
    }
    upsertArtifact(item)
    return item
  }

  async function openFileArtifact(options: { path: string; name?: string }): Promise<ArtifactItem> {
    const name = options.name || options.path.split('/').pop() || options.path
    const kind = inferKind(name || options.path)
    const item: ArtifactItem = {
      id: artifactId(options.path),
      name,
      path: options.path,
      kind,
      status: kind === 'file' || kind === 'image' || kind === 'media' ? 'ready' : 'loading',
      createdAt: Date.now(),
    }
    upsertArtifact(item)

    if (kind === 'file' || kind === 'image' || kind === 'media') {
      return item
    }

    try {
      const content = await fetchFileText(options.path, name)
      return updateArtifact(item.id, { content, status: 'ready' }) || item
    } catch (err: any) {
      return updateArtifact(item.id, {
        status: 'error',
        error: err?.message || String(err),
      }) || item
    }
  }

  function closeArtifact(id: string): void {
    artifacts.value = artifacts.value.filter(item => item.id !== id)
    if (selectedArtifactId.value === id) {
      selectedArtifactId.value = artifacts.value[0]?.id || null
    }
  }

  function clearArtifacts(): void {
    artifacts.value = []
    selectedArtifactId.value = null
  }

  async function downloadArtifact(item: ArtifactItem): Promise<void> {
    if (item.path) {
      await downloadFile(item.path, item.name)
    }
  }

  function artifactUrl(item: ArtifactItem): string {
    return item.path ? getDownloadUrl(item.path, item.name) : ''
  }

  return {
    artifacts,
    selectedArtifactId,
    selectedArtifact,
    openSequence,
    openContentArtifact,
    openFileArtifact,
    selectArtifact,
    closeArtifact,
    clearArtifacts,
    downloadArtifact,
    artifactUrl,
  }
})
