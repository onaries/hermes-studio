import type { ArtifactFileReference } from '@/stores/hermes/artifacts'

interface ArtifactMessageLike {
  role?: string
  content?: string | null
}

const MARKDOWN_LOCAL_LINK_RE = /!?\[([^\]]*)\]\((<[^>]+>|[^)]+)\)/g
const HTML_LOCAL_LINK_RE = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim()
}

function normalizeArtifactPath(raw: string): string {
  const trimmed = raw.trim()
  const unwrapped = trimmed.startsWith('<') && trimmed.endsWith('>')
    ? trimmed.slice(1, -1).trim()
    : trimmed
  if (unwrapped.startsWith('/api/hermes/download?')) {
    try {
      return new URL(unwrapped, window.location.origin).searchParams.get('path') || unwrapped
    } catch {
      return unwrapped
    }
  }
  try {
    return decodeURI(unwrapped)
  } catch {
    return unwrapped
  }
}

function isLocalArtifactPath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
}

function artifactNameFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path
}

function addArtifactReference(
  refs: ArtifactFileReference[],
  seen: Set<string>,
  path: string,
  name?: string,
): void {
  const normalizedPath = normalizeArtifactPath(path)
  if (!isLocalArtifactPath(normalizedPath)) return
  const normalizedName = (name || '').trim() || artifactNameFromPath(normalizedPath)
  const key = `${normalizedPath}::${normalizedName}`
  if (seen.has(key)) return
  seen.add(key)
  refs.push({ path: normalizedPath, name: normalizedName })
}

function extractContentBlockArtifacts(content: string, refs: ArtifactFileReference[], seen: Set<string>): void {
  const trimmed = content.trim()
  if (!trimmed.startsWith('[')) return
  try {
    const blocks = JSON.parse(trimmed)
    if (!Array.isArray(blocks)) return
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue
      const record = block as Record<string, unknown>
      if ((record.type === 'file' || record.type === 'image') && typeof record.path === 'string') {
        addArtifactReference(refs, seen, record.path, typeof record.name === 'string' ? record.name : undefined)
      }
    }
  } catch {
    // Plain markdown, not ContentBlock JSON.
  }
}

export function extractGeneratedMessageArtifacts(message: ArtifactMessageLike): ArtifactFileReference[] {
  if (message.role !== 'assistant') return []
  const content = message.content || ''
  if (!content.trim()) return []
  const refs: ArtifactFileReference[] = []
  const seen = new Set<string>()
  extractContentBlockArtifacts(content, refs, seen)

  for (const match of content.matchAll(MARKDOWN_LOCAL_LINK_RE)) {
    addArtifactReference(refs, seen, match[2], match[1])
  }
  for (const match of content.matchAll(HTML_LOCAL_LINK_RE)) {
    addArtifactReference(refs, seen, match[1], stripHtml(match[2] || ''))
  }
  return refs
}
