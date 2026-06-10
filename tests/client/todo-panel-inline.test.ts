// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TodoPanel from '@/components/hermes/chat/TodoPanel.vue'

const chatStore = vi.hoisted(() => ({
  activeSession: null as null | { messages: any[] },
}))

vi.mock('@/stores/hermes/chat', () => ({
  useChatStore: () => chatStore,
}))

function mountTodoPanel() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
      en: {
        drawer: {},
        chat: {
          todoPanel: {
            title: 'Todo',
            subtitle: 'All todo items from this active request.',
            total: 'items',
            hide: 'Hide Todo',
            show: 'Show Todo',
          },
          todoStatus: {
            in_progress: 'In progress',
            pending: 'Pending',
            completed: 'Completed',
            cancelled: 'Cancelled',
          },
        },
      },
    },
  })

  return mount(TodoPanel, {
    global: {
      plugins: [i18n],
    },
  })
}

describe('TodoPanel inline chat display', () => {
  beforeEach(() => {
    chatStore.activeSession = null
  })

  it('renders nothing when the current session has no todos', () => {
    chatStore.activeSession = { messages: [] }

    const wrapper = mountTodoPanel()

    expect(wrapper.find('.todo-panel').exists()).toBe(false)
  })

  it('shows all todo items directly in the chat panel', async () => {
    chatStore.activeSession = {
      messages: [{
        id: 'user-1',
        role: 'user',
        content: 'Use todo for this request',
        timestamp: 900,
      }, {
        id: 'tool-1',
        role: 'tool',
        timestamp: 1000,
        toolName: 'todo',
        toolArgs: JSON.stringify({ todos: [
          { id: 'a', content: 'Inspect current drawer UI', status: 'completed' },
          { id: 'b', content: 'Move todo list into chat window', status: 'in_progress' },
        ] }),
        toolStatus: 'done',
        content: '',
      }, {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Finished the todo-backed request',
        timestamp: 1100,
      }],
    }

    const wrapper = mountTodoPanel()

    expect(wrapper.find('.todo-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('Todo')
    expect(wrapper.text()).toContain('Move todo list into chat window')
    expect(wrapper.text()).toContain('Inspect current drawer UI')
    expect(wrapper.text()).toContain('Completed')
    expect(wrapper.text()).toContain('In progress')
    expect(wrapper.find('.todo-total').text()).toBe('2 items')
    expect(wrapper.find('.todo-heading-icon').classes()).toContain('is-running')
    expect(wrapper.find('.todo-item.in_progress .progress-mark').exists()).toBe(true)

    const toggle = wrapper.find('.todo-toggle')
    expect(toggle.attributes('aria-label')).toBe('Hide Todo')
    await toggle.trigger('click')
    expect(wrapper.find('.todo-items-wrap').exists()).toBe(false)
    expect(wrapper.find('.todo-toggle').attributes('aria-label')).toBe('Show Todo')
  })

  it('hides previous todo state when the latest turn did not use todo', () => {
    chatStore.activeSession = {
      messages: [{
        id: 'user-1',
        role: 'user',
        content: 'Earlier task with todo',
        timestamp: 900,
      }, {
        id: 'tool-1',
        role: 'tool',
        content: '',
        timestamp: 1000,
        toolName: 'todo',
        toolArgs: JSON.stringify({ todos: [
          { id: 'a', content: 'Old todo item', status: 'completed' },
        ] }),
        toolStatus: 'done',
      }, {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Done',
        timestamp: 1100,
      }, {
        id: 'user-2',
        role: 'user',
        content: 'Simple follow-up without todo',
        timestamp: 1200,
      }, {
        id: 'assistant-2',
        role: 'assistant',
        content: 'No todo needed',
        timestamp: 1300,
      }],
    }

    const wrapper = mountTodoPanel()

    expect(wrapper.find('.todo-panel').exists()).toBe(false)
  })
})
