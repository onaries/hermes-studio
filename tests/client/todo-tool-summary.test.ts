import { describe, expect, it } from 'vitest'
import { buildTodoToolSummary } from '@/utils/todo-tool-summary'

const labels: Record<string, string> = {
  'chat.todoToolName': 'Todo',
  'chat.todoUpdated': 'Todo updated',
  'chat.todoList': 'Todo list',
  'chat.todoStatus.pending': 'Pending',
  'chat.todoStatus.in_progress': 'In progress',
  'chat.todoStatus.completed': 'Completed',
  'chat.todoStatus.cancelled': 'Cancelled',
}

function t(key: string, params?: Record<string, unknown>) {
  if (key === 'chat.todoMoreItems') return `+${params?.count} more`
  return labels[key] || key
}

describe('todo tool summary', () => {
  it('summarizes changed todo items from tool arguments', () => {
    const summary = buildTodoToolSummary(
      'todo',
      JSON.stringify({
        merge: true,
        todos: [
          { id: 'inspect', content: 'Inspect tool rendering', status: 'completed' },
          { id: 'implement', content: 'Implement todo summary', status: 'in_progress' },
        ],
      }),
      JSON.stringify({ todos: [], summary: { total: 2 } }),
      t,
    )

    expect(summary?.title).toBe('Todo updated')
    expect(summary?.preview).toBe('Completed: Inspect tool rendering · In progress: Implement todo summary')
    expect(summary?.items).toHaveLength(2)
  })

  it('falls back to the result todos for read-only todo list calls', () => {
    const summary = buildTodoToolSummary(
      'functions.todo',
      undefined,
      JSON.stringify({
        todos: [
          { id: 'a', content: 'First task', status: 'pending' },
          { id: 'b', content: 'Second task', status: 'completed' },
        ],
      }),
      t,
    )

    expect(summary?.title).toBe('Todo list')
    expect(summary?.preview).not.toContain('Pending: First task')
    expect(summary?.preview).toBe('Completed: Second task')
  })

  it('truncates long active/completed preview lists but keeps full items for expansion', () => {
    const summary = buildTodoToolSummary(
      'todo',
      JSON.stringify({
        todos: [
          { id: 'a', content: 'A', status: 'completed' },
          { id: 'b', content: 'B', status: 'in_progress' },
          { id: 'c', content: 'C', status: 'completed' },
          { id: 'd', content: 'D', status: 'completed' },
          { id: 'e', content: 'E', status: 'pending' },
        ],
      }),
      undefined,
      t,
    )

    expect(summary?.preview).toContain('+1 more')
    expect(summary?.preview).not.toContain('Pending')
    expect(summary?.items).toHaveLength(5)
  })

  it('keeps todo preview empty when there are only pending/cancelled items', () => {
    const summary = buildTodoToolSummary(
      'todo',
      JSON.stringify({
        todos: [
          { id: 'a', content: 'Waiting task', status: 'pending' },
          { id: 'b', content: 'Cancelled task', status: 'cancelled' },
        ],
      }),
      undefined,
      t,
    )

    expect(summary?.preview).toBe('')
    expect(summary?.items).toHaveLength(2)
  })

  it('ignores non-todo tools', () => {
    expect(buildTodoToolSummary('terminal', '{}', '{}', t)).toBeNull()
  })
})
