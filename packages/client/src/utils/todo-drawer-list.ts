import type { Message } from '@/stores/hermes/chat'
import type { TodoToolStatus } from './todo-tool-summary'

export interface TodoDrawerItem {
  id: string
  content: string
  status: TodoToolStatus
  updatedAt: number
}

export interface TodoDrawerStatusSection {
  status: TodoToolStatus
  label: string
  items: TodoDrawerItem[]
}

export interface TodoDrawerList {
  items: TodoDrawerItem[]
  sections: TodoDrawerStatusSection[]
  total: number
  counts: Record<TodoToolStatus, number>
  lastUpdatedAt: number | null
}

type Translator = (key: string, params?: Record<string, unknown>) => string

const TODO_STATUSES: TodoToolStatus[] = ['in_progress', 'pending', 'completed', 'cancelled']
const VISIBLE_TODO_STATUSES = new Set<TodoToolStatus>(['in_progress'])
const TODO_TOOL_NAMES = new Set(['todo', 'functions.todo'])

type TodoPayload = {
  merge?: unknown
  todos?: unknown
}

function isTodoToolName(toolName?: string): boolean {
  if (!toolName) return false
  const normalized = toolName.trim()
  if (TODO_TOOL_NAMES.has(normalized)) return true
  return normalized.endsWith('.todo')
}

function parsePayload(raw: unknown): TodoPayload | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as TodoPayload
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  if (!trimmed) return null
  const candidates = [trimmed]
  const objectStart = trimmed.indexOf('{')
  if (objectStart > 0) candidates.push(trimmed.slice(objectStart))

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      return parsed && typeof parsed === 'object' ? parsed as TodoPayload : null
    } catch {
      // Try next candidate.
    }
  }
  return null
}

function normalizeStatus(value: unknown): TodoToolStatus | null {
  return TODO_STATUSES.includes(value as TodoToolStatus) ? value as TodoToolStatus : null
}

function normalizeTodos(payload: TodoPayload | null, timestamp: number): TodoDrawerItem[] {
  if (!payload || !Array.isArray(payload.todos)) return []

  return payload.todos.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const status = normalizeStatus(record.status)
    if (!status) return []
    const content = typeof record.content === 'string' ? record.content.trim() : ''
    if (!content) return []
    const id = typeof record.id === 'string' && record.id.trim()
      ? record.id.trim()
      : `${timestamp}-${index}-${content}`
    return [{ id, content, status, updatedAt: timestamp }]
  })
}

function applyPayload(state: Map<string, TodoDrawerItem>, payload: TodoPayload | null, timestamp: number) {
  const todos = normalizeTodos(payload, timestamp)
  if (todos.length === 0) return false

  if (payload?.merge === false) {
    state.clear()
  }

  for (const item of todos) {
    state.set(item.id, item)
  }
  return true
}

export function buildTodoDrawerList(messages: Message[], t: Translator): TodoDrawerList {
  const state = new Map<string, TodoDrawerItem>()
  let lastUpdatedAt: number | null = null

  for (const message of messages) {
    if (message.role !== 'tool' || !isTodoToolName(message.toolName)) continue

    const timestamp = message.timestamp || 0
    const argsPayload = parsePayload(message.toolArgs)
    const resultPayload = parsePayload(message.toolResult)
    const appliedArgs = applyPayload(state, argsPayload, timestamp)

    // Read-only todo calls usually have no args.todos and return the current list.
    // Treat that result as authoritative. For update calls, keep args-driven merge
    // semantics so partial result payloads do not accidentally erase items.
    if (!appliedArgs && applyPayload(state, resultPayload, timestamp)) {
      lastUpdatedAt = timestamp
      continue
    }
    if (appliedArgs) lastUpdatedAt = timestamp
  }

  const items = Array.from(state.values()).filter(item => VISIBLE_TODO_STATUSES.has(item.status)).sort((a, b) => {
    const statusOrder = TODO_STATUSES.indexOf(a.status) - TODO_STATUSES.indexOf(b.status)
    if (statusOrder !== 0) return statusOrder
    return b.updatedAt - a.updatedAt
  })

  const counts = TODO_STATUSES.reduce((acc, status) => {
    acc[status] = items.filter(item => item.status === status).length
    return acc
  }, {} as Record<TodoToolStatus, number>)

  const sections = TODO_STATUSES.map(status => ({
    status,
    label: t(`chat.todoStatus.${status}`),
    items: items.filter(item => item.status === status),
  })).filter(section => section.items.length > 0)

  return {
    items,
    sections,
    total: items.length,
    counts,
    lastUpdatedAt,
  }
}
