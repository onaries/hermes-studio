import type { Message } from '@/stores/hermes/chat'

type Translator = (key: string, params?: Record<string, unknown>) => string

type ToolCategory =
  | 'ranCommands'
  | 'searchedWorkspace'
  | 'checkedWeb'
  | 'listedFiles'
  | 'readFiles'
  | 'editedFiles'
  | 'loadedSkills'
  | 'updatedTodos'
  | 'ranCode'
  | 'delegatedTasks'
  | 'usedBrowser'
  | 'usedComputer'
  | 'usedTools'

export type ToolTraceLike = Pick<Message, 'id' | 'role' | 'toolName' | 'toolArgs' | 'timestamp' | 'toolDuration'>

export type ToolTraceGroup = {
  id: string
  role: 'tool_group'
  content: string
  timestamp: number
  tools: Message[]
  isToolTraceGroup: true
}

export type ToolTraceDisplayItem = Message | ToolTraceGroup

export const TOOL_TRACE_GROUP_MIN_SIZE = 4

const CATEGORY_ORDER: ToolCategory[] = [
  'ranCommands',
  'searchedWorkspace',
  'checkedWeb',
  'listedFiles',
  'readFiles',
  'editedFiles',
  'loadedSkills',
  'updatedTodos',
  'ranCode',
  'delegatedTasks',
  'usedBrowser',
  'usedComputer',
  'usedTools',
]

function parsePayload(raw: unknown): unknown {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed || !/^[{[]/.test(trimmed)) return trimmed
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizedToolName(toolName: string | undefined): string {
  return (toolName || '')
    .toLowerCase()
    .replace(/^functions\./, '')
}

function searchFilesTarget(toolArgs: unknown): string {
  const parsed = parsePayload(toolArgs)
  if (!isRecord(parsed)) return ''
  return typeof parsed.target === 'string' ? parsed.target : ''
}

function toolCategory(tool: ToolTraceLike): ToolCategory {
  const name = normalizedToolName(tool.toolName)
  if (name.includes('terminal')) return 'ranCommands'
  if (name.includes('search_files')) {
    return searchFilesTarget(tool.toolArgs) === 'files' ? 'listedFiles' : 'searchedWorkspace'
  }
  if (name.includes('web_search') || name.includes('web_extract')) return 'checkedWeb'
  if (name.includes('read_file')) return 'readFiles'
  if (name.includes('write_file') || name.includes('patch')) return 'editedFiles'
  if (name.includes('skill_view')) return 'loadedSkills'
  if (name === 'todo' || name.endsWith('.todo')) return 'updatedTodos'
  if (name.includes('execute_code')) return 'ranCode'
  if (name.includes('delegate_task')) return 'delegatedTasks'
  if (name.startsWith('browser_')) return 'usedBrowser'
  if (name.includes('computer_use')) return 'usedComputer'
  return 'usedTools'
}

function aggregateKey(category: ToolCategory, count: number): string {
  const suffix = count === 1 ? 'One' : 'Many'
  return `chat.toolAggregate.${category}${suffix}`
}

function formatPart(category: ToolCategory, count: number, t: Translator): string {
  return t(aggregateKey(category, count), { count })
}

export function isToolTraceGroup(item: unknown): item is ToolTraceGroup {
  return !!item && typeof item === 'object' && (item as ToolTraceGroup).isToolTraceGroup === true
}

export function buildToolTraceGroupId(tools: Message[]): string {
  const first = tools[0]?.id || 'start'
  const last = tools[tools.length - 1]?.id || 'end'
  return `tool-group-${first}-${last}-${tools.length}`
}

export function groupToolTraceMessages(
  messages: Message[],
  minGroupSize = TOOL_TRACE_GROUP_MIN_SIZE,
): ToolTraceDisplayItem[] {
  const result: ToolTraceDisplayItem[] = []
  let pendingTools: Message[] = []

  const flushTools = () => {
    if (!pendingTools.length) return
    if (pendingTools.length >= minGroupSize) {
      result.push({
        id: buildToolTraceGroupId(pendingTools),
        role: 'tool_group',
        content: '',
        timestamp: pendingTools[0]?.timestamp || 0,
        tools: pendingTools,
        isToolTraceGroup: true,
      })
    } else {
      result.push(...pendingTools)
    }
    pendingTools = []
  }

  for (const message of messages) {
    if (message.role === 'tool' && !!message.toolName) {
      pendingTools.push(message)
      continue
    }
    flushTools()
    result.push(message)
  }
  flushTools()

  return result
}

export function buildToolAggregateSummary(tools: ToolTraceLike[], t: Translator): string {
  if (!tools.length) return ''
  const counts = new Map<ToolCategory, number>()
  for (const tool of tools) {
    const category = toolCategory(tool)
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  return CATEGORY_ORDER
    .map((category) => {
      const count = counts.get(category) || 0
      return count > 0 ? formatPart(category, count, t) : ''
    })
    .filter(Boolean)
    .join(', ')
}

export function buildToolAggregateDurationSeconds(tools: ToolTraceLike[]): number | null {
  let total = 0
  let hasDuration = false

  for (const tool of tools) {
    if (typeof tool.toolDuration !== 'number' || !Number.isFinite(tool.toolDuration) || tool.toolDuration < 0) continue
    total += tool.toolDuration
    hasDuration = true
  }

  return hasDuration ? total : null
}

export function formatToolAggregateDuration(seconds: number | null, t: Translator): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return ''
  if (seconds > 0 && seconds < 1) return t('chat.toolAggregate.durationLessThanSecond')

  const rounded = Math.max(1, Math.round(seconds))
  if (rounded < 60) return t('chat.toolAggregate.durationSeconds', { count: rounded })

  const minutes = Math.floor(rounded / 60)
  const remainingSeconds = rounded % 60
  if (minutes < 60) return t('chat.toolAggregate.durationMinutes', { minutes, seconds: remainingSeconds })

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return t('chat.toolAggregate.durationHours', { hours, minutes: remainingMinutes })
}
