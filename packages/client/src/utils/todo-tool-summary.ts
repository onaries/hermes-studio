export type TodoToolStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface TodoToolItemSummary {
  id?: string
  content: string
  status: TodoToolStatus
  statusLabel: string
}

export interface TodoToolSummary {
  title: string
  preview: string
  items: TodoToolItemSummary[]
  remainingCount: number
}

type Translator = (key: string, params?: Record<string, unknown>) => string

const TODO_TOOL_NAMES = new Set(['todo', 'functions.todo'])
const TODO_STATUSES = new Set<TodoToolStatus>(['pending', 'in_progress', 'completed', 'cancelled'])
const PREVIEW_ITEM_LIMIT = 3
const PREVIEW_STATUSES = new Set<TodoToolStatus>(['in_progress', 'completed'])

function parseJsonPayload(raw?: unknown): any | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidates = [trimmed]
  const objectStart = trimmed.indexOf('{')
  if (objectStart > 0) candidates.push(trimmed.slice(objectStart))

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next candidate.
    }
  }
  return null
}

function normalizeStatus(value: unknown): TodoToolStatus | null {
  if (typeof value !== 'string') return null
  return TODO_STATUSES.has(value as TodoToolStatus) ? value as TodoToolStatus : null
}

function statusLabel(status: TodoToolStatus, t: Translator): string {
  return t(`chat.todoStatus.${status}`)
}

function extractTodoItems(value: any, t: Translator): TodoToolItemSummary[] {
  if (!value || typeof value !== 'object' || !Array.isArray(value.todos)) return []

  return value.todos.flatMap((item: any) => {
    if (!item || typeof item !== 'object') return []
    const status = normalizeStatus(item.status)
    if (!status) return []

    const content = typeof item.content === 'string' && item.content.trim()
      ? item.content.trim()
      : typeof item.id === 'string' && item.id.trim()
        ? item.id.trim()
        : ''
    if (!content) return []

    return [{
      id: typeof item.id === 'string' ? item.id : undefined,
      content,
      status,
      statusLabel: statusLabel(status, t),
    }]
  })
}

function isTodoToolName(toolName?: string): boolean {
  if (!toolName) return false
  const normalized = toolName.trim()
  if (TODO_TOOL_NAMES.has(normalized)) return true
  return normalized.endsWith('.todo')
}

export function buildTodoToolSummary(
  toolName: string | undefined,
  toolArgs: unknown,
  toolResult: unknown,
  t: Translator,
): TodoToolSummary | null {
  if (!isTodoToolName(toolName)) return null

  const args = parseJsonPayload(toolArgs)
  const result = parseJsonPayload(toolResult)
  const changedItems = extractTodoItems(args, t)
  const resultItems = extractTodoItems(result, t)
  const items = changedItems.length > 0 ? changedItems : resultItems
  if (items.length === 0) return null

  const previewSourceItems = items.filter(item => PREVIEW_STATUSES.has(item.status))
  const visibleItems = previewSourceItems.slice(0, PREVIEW_ITEM_LIMIT)
  const remainingCount = Math.max(0, previewSourceItems.length - visibleItems.length)
  const previewItems = visibleItems.map(item => `${item.statusLabel}: ${item.content}`)
  if (remainingCount > 0) {
    previewItems.push(t('chat.todoMoreItems', { count: remainingCount }))
  }

  const title = changedItems.length > 0
    ? t('chat.todoUpdated')
    : t('chat.todoList')

  return {
    title,
    preview: previewItems.join(' · '),
    items,
    remainingCount,
  }
}
