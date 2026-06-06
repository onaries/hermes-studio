<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/hermes/chat'
import { buildTodoDrawerList, type TodoDrawerItem } from '@/utils/todo-drawer-list'

const chatStore = useChatStore()
const { t } = useI18n()
const statusOrder = ['in_progress', 'pending', 'completed', 'cancelled'] as const

const todoList = computed(() => buildTodoDrawerList(chatStore.activeSession?.messages || [], t))
const hasTodos = computed(() => todoList.value.total > 0)

function itemTitle(item: TodoDrawerItem): string {
  return item.id ? `${item.id} · ${item.content}` : item.content
}

function formatUpdatedAt(timestamp: number | null): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}
</script>

<template>
  <div class="todo-panel">
    <header class="todo-header">
      <div>
        <h3>{{ t('drawer.todo.title') }}</h3>
        <p>{{ t('drawer.todo.subtitle') }}</p>
      </div>
      <div v-if="hasTodos" class="todo-total">
        <span class="todo-total-value">{{ todoList.total }}</span>
        <span class="todo-total-label">{{ t('drawer.todo.total') }}</span>
      </div>
    </header>

    <div v-if="hasTodos" class="todo-summary" aria-label="Todo summary">
      <div
        v-for="status in statusOrder"
        :key="status"
        class="todo-summary-card"
      >
        <span class="summary-count">{{ todoList.counts[status] }}</span>
        <span class="summary-label">{{ t(`chat.todoStatus.${status}`) }}</span>
      </div>
    </div>

    <div v-if="todoList.lastUpdatedAt" class="todo-updated">
      {{ t('drawer.todo.lastUpdated', { time: formatUpdatedAt(todoList.lastUpdatedAt) }) }}
    </div>

    <div v-if="!hasTodos" class="todo-empty">
      <div class="todo-empty-icon">✓</div>
      <h4>{{ t('drawer.todo.emptyTitle') }}</h4>
      <p>{{ t('drawer.todo.emptyDescription') }}</p>
    </div>

    <div v-else class="todo-sections">
      <section
        v-for="section in todoList.sections"
        :key="section.status"
        class="todo-section"
      >
        <div class="section-header">
          <span class="section-dot" :class="section.status"></span>
          <span class="section-title">{{ section.label }}</span>
          <span class="section-count">{{ section.items.length }}</span>
        </div>

        <ul class="todo-items">
          <li
            v-for="item in section.items"
            :key="item.id"
            class="todo-item"
            :class="item.status"
            :title="itemTitle(item)"
          >
            <span class="todo-checkbox" aria-hidden="true">
              <svg v-if="item.status === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span v-else-if="item.status === 'in_progress'" class="progress-mark"></span>
              <span v-else-if="item.status === 'cancelled'" class="cancel-mark">×</span>
            </span>
            <span class="todo-content">{{ item.content }}</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.todo-panel {
  height: 100%;
  padding: 20px;
  overflow: auto;
  background: $bg-primary;
  color: $text-primary;
}

.todo-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;

  h3 {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: $text-secondary;
    font-size: 13px;
  }
}

.todo-total {
  min-width: 72px;
  padding: 10px 12px;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  background: $bg-card;
  text-align: center;
}

.todo-total-value {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-primary);
}

.todo-total-label {
  color: $text-secondary;
  font-size: 12px;
}

.todo-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;

  @media (max-width: $breakpoint-mobile) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.todo-summary-card {
  padding: 10px;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  background: $bg-card;
}

.summary-count {
  display: block;
  font-size: 18px;
  font-weight: 700;
}

.summary-label {
  color: $text-secondary;
  font-size: 12px;
}

.todo-updated {
  margin-bottom: 16px;
  color: $text-secondary;
  font-size: 12px;
}

.todo-empty {
  display: flex;
  height: min(420px, 60vh);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: $text-secondary;

  h4 {
    margin: 12px 0 6px;
    color: $text-primary;
    font-size: 16px;
  }

  p {
    max-width: 360px;
    margin: 0;
    line-height: 1.5;
  }
}

.todo-empty-icon {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
  font-size: 28px;
}

.todo-sections {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.todo-section {
  border: 1px solid $border-color;
  border-radius: $radius-lg;
  background: $bg-card;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid $border-color;
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.section-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: $text-secondary;

  &.in_progress { background: #3b82f6; }
  &.pending { background: #f59e0b; }
  &.completed { background: #22c55e; }
  &.cancelled { background: #94a3b8; }
}

.section-title {
  flex: 1;
  font-weight: 700;
}

.section-count {
  min-width: 26px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
  text-align: center;
  font-size: 12px;
  font-weight: 700;
}

.todo-items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.todo-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--border-color-rgb), 0.6);

  &:last-child {
    border-bottom: none;
  }

  &.completed .todo-content {
    color: $text-secondary;
    text-decoration: line-through;
  }

  &.cancelled .todo-content {
    color: $text-secondary;
  }
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border: 1.5px solid $border-color;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #22c55e;
}

.todo-item.in_progress .todo-checkbox {
  border-color: #3b82f6;
}

.todo-item.completed .todo-checkbox {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}

.todo-item.cancelled .todo-checkbox {
  color: #94a3b8;
}

.progress-mark {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
}

.cancel-mark {
  font-weight: 800;
  line-height: 1;
}

.todo-content {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
