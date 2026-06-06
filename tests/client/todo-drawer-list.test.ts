import { describe, expect, it } from 'vitest'
import { buildTodoDrawerList } from '@/utils/todo-drawer-list'
import type { Message } from '@/stores/hermes/chat'

const t = (key: string) => ({
  'chat.todoStatus.in_progress': 'In progress',
  'chat.todoStatus.pending': 'Pending',
  'chat.todoStatus.completed': 'Completed',
  'chat.todoStatus.cancelled': 'Cancelled',
}[key] || key)

function toolMessage(id: string, timestamp: number, toolArgs?: unknown, toolResult?: unknown): Message {
  return {
    id,
    role: 'tool',
    content: '',
    timestamp,
    toolName: 'todo',
    toolArgs,
    toolResult,
    toolStatus: 'done',
  }
}

describe('todo drawer list', () => {
  it('builds the current todo list from merged todo updates', () => {
    const messages = [
      toolMessage('1', 1000, JSON.stringify({ merge: false, todos: [
        { id: 'a', content: 'Inspect drawer', status: 'pending' },
        { id: 'b', content: 'Implement panel', status: 'pending' },
      ] })),
      toolMessage('2', 2000, JSON.stringify({ merge: true, todos: [
        { id: 'a', content: 'Inspect drawer', status: 'completed' },
        { id: 'c', content: 'Run tests', status: 'in_progress' },
      ] })),
    ]

    const list = buildTodoDrawerList(messages, t)

    expect(list.total).toBe(3)
    expect(list.counts.completed).toBe(1)
    expect(list.counts.pending).toBe(1)
    expect(list.counts.in_progress).toBe(1)
    expect(list.sections.map(section => section.status)).toEqual(['in_progress', 'pending', 'completed'])
    expect(list.items.map(item => [item.id, item.status])).toEqual([
      ['c', 'in_progress'],
      ['b', 'pending'],
      ['a', 'completed'],
    ])
  })

  it('uses read-only todo results when args do not contain todos', () => {
    const messages = [
      toolMessage('1', 1000, undefined, JSON.stringify({ todos: [
        { id: 'a', content: 'Review current list', status: 'pending' },
      ] })),
    ]

    const list = buildTodoDrawerList(messages, t)

    expect(list.total).toBe(1)
    expect(list.items[0]).toMatchObject({ id: 'a', content: 'Review current list', status: 'pending' })
  })

  it('ignores non-todo tool messages and invalid todo payloads', () => {
    const messages: Message[] = [
      { ...toolMessage('1', 1000, JSON.stringify({ todos: [{ id: 'x', content: 'Nope', status: 'pending' }] })), toolName: 'web_search' },
      toolMessage('2', 2000, JSON.stringify({ todos: [{ id: 'bad', content: '', status: 'pending' }] })),
    ]

    const list = buildTodoDrawerList(messages, t)

    expect(list.total).toBe(0)
    expect(list.sections).toEqual([])
  })
})
