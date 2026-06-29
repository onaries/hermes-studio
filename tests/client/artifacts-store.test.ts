import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useArtifactsStore } from '@/stores/hermes/artifacts'
import { fetchFileText } from '@/api/hermes/download'

vi.mock('@/api/hermes/download', () => ({
  fetchFileText: vi.fn(),
  downloadFile: vi.fn(),
  getDownloadUrl: (path: string, name?: string) => `/api/hermes/download?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name || '')}`,
}))

describe('artifacts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchFileText).mockReset()
  })

  it('opens generated markdown files as drawer artifacts', async () => {
    vi.mocked(fetchFileText).mockResolvedValue('# Report\n\nDone')
    const store = useArtifactsStore()

    await store.openFileArtifact({ path: '/tmp/report.md', name: 'report.md' })

    expect(fetchFileText).toHaveBeenCalledWith('/tmp/report.md', 'report.md')
    expect(store.openSequence).toBe(1)
    expect(store.selectedArtifact?.kind).toBe('markdown')
    expect(store.selectedArtifact?.status).toBe('ready')
    expect(store.selectedArtifact?.content).toContain('# Report')
  })

  it('tries to preview unclassified files as text artifacts', async () => {
    vi.mocked(fetchFileText).mockResolvedValue('zip-ish but readable')
    const store = useArtifactsStore()

    await store.openFileArtifact({ path: '/tmp/archive.zip', name: 'archive.zip' })

    expect(fetchFileText).toHaveBeenCalledWith('/tmp/archive.zip', 'archive.zip')
    expect(store.selectedArtifact?.kind).toBe('file')
    expect(store.selectedArtifact?.status).toBe('ready')
    expect(store.selectedArtifact?.content).toBe('zip-ish but readable')
  })

  it('registers chat file artifacts without opening the drawer', () => {
    const store = useArtifactsStore()

    store.syncChatFileArtifacts('session-1', [
      { path: '/tmp/report.md', name: 'report.md' },
      { path: '/tmp/chart.png', name: 'chart.png' },
    ])

    expect(store.openSequence).toBe(0)
    expect(store.artifacts.map(item => item.name)).toEqual(['report.md', 'chart.png'])
    expect(store.selectedArtifact?.name).toBe('report.md')
    expect(store.selectedArtifact?.status).toBe('loading')
    expect(fetchFileText).not.toHaveBeenCalled()
  })

  it('loads registered chat artifact content lazily and deduplicates later opens', async () => {
    vi.mocked(fetchFileText).mockResolvedValue('# Chat report')
    const store = useArtifactsStore()
    store.syncChatFileArtifacts('session-1', [{ path: '/tmp/report.md', name: 'report.md' }])
    const id = store.selectedArtifactId!

    await store.ensureArtifactContent(id)
    await store.openFileArtifact({ path: '/tmp/report.md', name: 'report.md' })

    expect(fetchFileText).toHaveBeenCalledTimes(1)
    expect(store.artifacts).toHaveLength(1)
    expect(store.selectedArtifact?.content).toBe('# Chat report')
    expect(store.openSequence).toBe(1)
  })

  it('scopes opened chat artifacts to the active session when switching sessions', async () => {
    vi.mocked(fetchFileText).mockResolvedValue('# Session 1 report')
    const store = useArtifactsStore()

    store.syncChatFileArtifacts('session-1', [{ path: '/tmp/report.md', name: 'report.md' }])
    await store.openFileArtifact({ path: '/tmp/report.md', name: 'report.md' })

    expect(store.selectedArtifact?.sourceSessionId).toBe('session-1')
    expect(store.artifacts.map(item => item.name)).toEqual(['report.md'])

    store.syncChatFileArtifacts('session-2', [{ path: '/tmp/summary.md', name: 'summary.md' }])

    expect(store.artifacts.map(item => item.name)).toEqual(['summary.md'])
    expect(store.selectedArtifact?.name).toBe('summary.md')
    expect(store.selectedArtifact?.sourceSessionId).toBe('session-2')
  })
})
