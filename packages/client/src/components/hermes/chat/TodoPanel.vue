<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/hermes/chat'
import { buildTodoListState, type TodoListItem } from '@/utils/todo-list-state'

const chatStore = useChatStore()
const { t } = useI18n()
const isCollapsed = ref(false)

const currentTurnMessages = computed(() => {
  const messages = chatStore.activeSession?.messages || []
  let lastTurnStart = -1
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user' || messages[index].role === 'command') {
      lastTurnStart = index
      break
    }
  }
  return lastTurnStart >= 0 ? messages.slice(lastTurnStart + 1) : messages
})

const todoList = computed(() => buildTodoListState(currentTurnMessages.value, t))
const hasTodos = computed(() => todoList.value.total > 0)
const hasInProgress = computed(() => todoList.value.items.some((item) => item.status === 'in_progress'))

function itemTitle(item: TodoListItem): string {
  return item.id ? `${item.id} · ${item.content}` : item.content
}
</script>

<template>
  <section v-if="hasTodos" class="todo-panel" :aria-label="t('chat.todoPanel.title')">
    <header class="todo-header">
      <span class="todo-heading-icon" :class="{ 'is-running': hasInProgress }" aria-hidden="true">✓</span>
      <h3>{{ t('chat.todoPanel.title') }}</h3>
      <span class="todo-total">{{ todoList.total }} {{ t('chat.todoPanel.total') }}</span>
      <button
        type="button"
        class="todo-toggle"
        :aria-expanded="!isCollapsed"
        :aria-label="isCollapsed ? t('chat.todoPanel.show') : t('chat.todoPanel.hide')"
        :title="isCollapsed ? t('chat.todoPanel.show') : t('chat.todoPanel.hide')"
        @click="isCollapsed = !isCollapsed"
      >
        <span aria-hidden="true">{{ isCollapsed ? '+' : '−' }}</span>
      </button>
    </header>

    <div v-if="!isCollapsed" class="todo-items-wrap">
      <ul class="todo-items">
        <li
          v-for="item in todoList.items"
          :key="item.id"
          class="todo-item"
          :class="item.status"
          :title="itemTitle(item)"
        >
          <span class="todo-checkbox" aria-hidden="true">
            <svg v-if="item.status === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span v-else-if="item.status === 'in_progress'" class="progress-mark"></span>
            <span v-else-if="item.status === 'cancelled'" class="cancel-mark">×</span>
          </span>
          <span class="todo-status">{{ t(`chat.todoStatus.${item.status}`) }}</span>
          <span class="todo-content">{{ item.content }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.todo-panel {
  width: fit-content;
  min-width: min(280px, calc(100% - 32px));
  max-width: min(560px, calc(100% - 32px));
  box-sizing: border-box;
  flex-shrink: 0;
  margin: 4px 16px 0;
  padding: 5px 8px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  border-radius: $radius-sm;
  background: color-mix(in srgb, var(--bg-card) 94%, var(--accent-primary));
  color: $text-primary;
}

.todo-header {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;

  h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: $text-secondary;
    font-size: 11px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.todo-heading-icon {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
  font-size: 9px;
  font-weight: 700;

  &.is-running {
    animation: todo-heading-pulse 1.2s ease-in-out infinite;
  }
}

.todo-total {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: $text-secondary;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.todo-toggle {
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  background: rgba(var(--border-color-rgb), 0.28);
  color: $text-muted;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;

  &:hover {
    background: rgba(var(--accent-primary-rgb), 0.1);
    color: $text-secondary;
  }
}

.todo-items-wrap {
  max-height: 176px;
  margin-top: 4px;
  overflow: auto;
}

.todo-items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-item {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  min-width: 0;
  padding: 3px 8px;
  border: 1px solid rgba(var(--border-color-rgb), 0.5);
  border-radius: $radius-sm;
  background: color-mix(in srgb, var(--bg-primary) 86%, transparent);
}

.todo-checkbox {
  width: 12px;
  height: 12px;
  border: 1.25px solid $border-color;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #22c55e;
}

.todo-item.in_progress .todo-checkbox {
  position: relative;
  border-color: #3b82f6;
  animation: todo-progress-pulse 1.15s ease-in-out infinite;
}

.todo-item.in_progress .todo-checkbox::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 1px solid rgba(59, 130, 246, 0.35);
  border-radius: 6px;
  opacity: 0;
  animation: todo-progress-ring 1.15s ease-out infinite;
}

.todo-item.completed .todo-checkbox {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.todo-item.cancelled .todo-checkbox {
  color: #94a3b8;
}

.todo-item.completed .todo-content {
  color: $text-secondary;
  text-decoration: line-through;
}

.todo-item.cancelled .todo-content {
  color: $text-secondary;
}

.progress-mark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: todo-progress-dot 0.85s ease-in-out infinite;
}

.cancel-mark {
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}

.todo-status {
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: $text-secondary;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.25;
  white-space: nowrap;
}

.todo-item.in_progress .todo-status {
  color: #3b82f6;
}

.todo-item.completed .todo-status {
  color: #22c55e;
}

.todo-item.cancelled .todo-status {
  color: #94a3b8;
}

.todo-content {
  flex: 1;
  min-width: 0;
  color: $text-primary;
  font-size: 11px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes todo-heading-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@keyframes todo-progress-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.14);
  }
}

@keyframes todo-progress-ring {
  0% {
    opacity: 0.65;
    transform: scale(0.86);
  }
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

@keyframes todo-progress-dot {
  0%,
  100% {
    transform: scale(0.75);
    opacity: 0.55;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .todo-heading-icon.is-running,
  .todo-item.in_progress .todo-checkbox,
  .todo-item.in_progress .todo-checkbox::after,
  .progress-mark {
    animation: none;
  }
}

@media (max-width: $breakpoint-mobile) {
  .todo-panel {
    width: auto;
    min-width: 0;
    max-width: none;
    margin: 3px 8px 0;
    padding: 4px 6px;
  }

  .todo-items-wrap {
    max-height: 96px;
  }

  .todo-content {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>
