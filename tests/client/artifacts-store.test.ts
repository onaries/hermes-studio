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

  it('keeps unsupported files downloadable without trying to fetch text', async () => {
    const store = useArtifactsStore()

    await store.openFileArtifact({ path: '/tmp/archive.zip', name: 'archive.zip' })

    expect(fetchFileText).not.toHaveBeenCalled()
    expect(store.selectedArtifact?.kind).toBe('file')
    expect(store.selectedArtifact?.status).toBe('ready')
  })
})
