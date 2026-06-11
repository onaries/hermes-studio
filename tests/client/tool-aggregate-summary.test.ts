import { describe, expect, it } from 'vitest'
import type { Message } from '@/stores/hermes/chat'
import {
  buildToolAggregateDurationSeconds,
  buildToolAggregateSummary,
  formatToolAggregateDuration,
  groupToolTraceMessages,
  isToolTraceGroup,
} from '@/utils/tool-aggregate-summary'

const t = (key: string, params?: Record<string, unknown>) => {
  const templates: Record<string, string> = {
    'chat.toolAggregate.ranCommandsOne': 'Ran 1 command',
    'chat.toolAggregate.ranCommandsMany': 'Ran {count} commands',
    'chat.toolAggregate.searchedWorkspaceOne': 'searched workspace 1 time',
    'chat.toolAggregate.searchedWorkspaceMany': 'searched workspace {count} times',
    'chat.toolAggregate.checkedWebOne': 'checked the web',
    'chat.toolAggregate.checkedWebMany': 'checked the web {count} times',
    'chat.toolAggregate.listedFilesOne': 'listed files',
    'chat.toolAggregate.listedFilesMany': 'listed files {count} times',
    'chat.toolAggregate.readFilesOne': 'read 1 file',
    'chat.toolAggregate.readFilesMany': 'read {count} files',
    'chat.toolAggregate.editedFilesOne': 'edited 1 file',
    'chat.toolAggregate.editedFilesMany': 'edited {count} files',
    'chat.toolAggregate.loadedSkillsOne': 'loaded 1 skill',
    'chat.toolAggregate.loadedSkillsMany': 'loaded {count} skills',
    'chat.toolAggregate.updatedTodosOne': 'updated Todo',
    'chat.toolAggregate.updatedTodosMany': 'updated Todo {count} times',
    'chat.toolAggregate.ranCodeOne': 'ran code',
    'chat.toolAggregate.ranCodeMany': 'ran code {count} times',
    'chat.toolAggregate.delegatedTasksOne': 'delegated 1 task',
    'chat.toolAggregate.delegatedTasksMany': 'delegated {count} tasks',
    'chat.toolAggregate.usedBrowserOne': 'used browser',
    'chat.toolAggregate.usedBrowserMany': 'used browser {count} times',
    'chat.toolAggregate.usedComputerOne': 'used computer',
    'chat.toolAggregate.usedComputerMany': 'used computer {count} times',
    'chat.toolAggregate.usedToolsOne': 'used 1 tool',
    'chat.toolAggregate.usedToolsMany': 'used {count} tools',
    'chat.toolAggregate.durationLessThanSecond': '<1s',
    'chat.toolAggregate.durationSeconds': '{count}s',
    'chat.toolAggregate.durationMinutes': '{minutes}m {seconds}s',
    'chat.toolAggregate.durationHours': '{hours}h {minutes}m',
  }
  let out = templates[key] || key
  for (const [param, value] of Object.entries(params || {})) {
    out = out.replace(`{${param}}`, String(value))
  }
  return out
}

function tool(id: string, toolName: string, toolArgs?: unknown, toolDuration?: number): Message {
  return {
    id,
    role: 'tool',
    content: '',
    timestamp: Number(id.replace(/\D/g, '')) || 1,
    toolName,
    toolArgs,
    toolStatus: 'done',
    toolDuration,
  }
}

describe('tool aggregate summary', () => {
  it('summarizes repeated tool calls into ordered human-readable parts', () => {
    const summary = buildToolAggregateSummary([
      tool('t1', 'terminal'),
      tool('t2', 'functions.terminal'),
      tool('t3', 'search_files', { pattern: 'tool', target: 'content' }),
      tool('t4', 'web_search', { query: 'Hermes' }),
      tool('t5', 'search_files', { pattern: '*.ts', target: 'files' }),
    ], t)

    expect(summary).toBe('Ran 2 commands, searched workspace 1 time, checked the web, listed files')
  })

  it('groups only consecutive named tool messages above the minimum size', () => {
    const messages: Message[] = [
      { id: 'u1', role: 'user', content: 'go', timestamp: 1 },
      tool('t1', 'terminal'),
      tool('t2', 'terminal'),
      tool('t3', 'web_search'),
      tool('t4', 'read_file'),
      { id: 'a1', role: 'assistant', content: 'done', timestamp: 6 },
    ]

    const grouped = groupToolTraceMessages(messages)

    expect(grouped).toHaveLength(3)
    expect(grouped[0].id).toBe('u1')
    expect(isToolTraceGroup(grouped[1])).toBe(true)
    if (isToolTraceGroup(grouped[1])) {
      expect(grouped[1].tools.map(item => item.id)).toEqual(['t1', 't2', 't3', 't4'])
    }
    expect(grouped[2].id).toBe('a1')
  })

  it('keeps short tool runs as individual rows', () => {
    const grouped = groupToolTraceMessages([
      tool('t1', 'terminal'),
      tool('t2', 'terminal'),
      tool('t3', 'terminal'),
    ])

    expect(grouped.map(item => item.id)).toEqual(['t1', 't2', 't3'])
    expect(grouped.some(isToolTraceGroup)).toBe(false)
  })

  it('sums and formats completed tool durations', () => {
    const duration = buildToolAggregateDurationSeconds([
      tool('t1', 'terminal', undefined, 0.4),
      tool('t2', 'read_file', undefined, 12.2),
      tool('t3', 'web_search', undefined, 62.7),
      tool('t4', 'search_files'),
    ])

    expect(duration).toBeCloseTo(75.3)
    expect(formatToolAggregateDuration(duration, t)).toBe('1m 15s')
    expect(formatToolAggregateDuration(0.4, t)).toBe('<1s')
    expect(formatToolAggregateDuration(null, t)).toBe('')
  })
})
