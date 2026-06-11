<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Message } from '@/stores/hermes/chat'
import { buildToolAggregateSummary } from '@/utils/tool-aggregate-summary'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  id: string
  tools: Message[]
  highlight?: boolean
}>()

const { t } = useI18n()
const expanded = ref(false)
const summary = computed(() => buildToolAggregateSummary(props.tools, t))
const toolCount = computed(() => props.tools.length)

function toggleExpanded() {
  expanded.value = !expanded.value
}
</script>

<template>
  <div
    class="tool-trace-group"
    :class="{ highlight, expanded }"
    :id="`message-${id}`"
  >
    <button
      type="button"
      class="tool-trace-summary"
      :aria-expanded="expanded"
      :title="expanded ? t('chat.toolAggregate.collapse') : t('chat.toolAggregate.expand')"
      @click="toggleExpanded"
    >
      <span class="tool-summary-dot" aria-hidden="true"></span>
      <span class="tool-summary-text">{{ summary }}</span>
      <span class="tool-summary-count">{{ toolCount }}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        class="tool-summary-chevron"
        :class="{ rotated: expanded }"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
    <div v-if="expanded" class="tool-trace-group-details">
      <MessageItem
        v-for="tool in tools"
        :key="tool.id"
        :message="tool"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.tool-trace-group {
  min-width: 0;
  max-width: 100%;

  &.highlight .tool-trace-summary {
    box-shadow: 0 0 0 2px rgba(var(--accent-info-rgb), 0.24);
  }
}

.tool-trace-summary {
  width: fit-content;
  max-width: min(820px, 100%);
  border: none;
  border-radius: 999px;
  padding: 5px 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.035);
  color: $text-secondary;
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.055);
    color: $text-primary;
  }

  .dark & {
    background: rgba(255, 255, 255, 0.065);

    &:hover {
      background: rgba(255, 255, 255, 0.095);
    }
  }
}

.tool-summary-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}

.tool-summary-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-summary-count {
  flex: 0 0 auto;
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--accent-info-rgb), 0.12);
  color: var(--accent-info);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.tool-summary-chevron {
  flex: 0 0 auto;
  opacity: 0.65;
  transition: transform 0.15s ease;

  &.rotated {
    transform: rotate(90deg);
  }
}

.tool-trace-group-details {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 18px;
  border-left: 1px solid rgba(0, 0, 0, 0.08);

  .dark & {
    border-left-color: rgba(255, 255, 255, 0.12);
  }
}

@media (max-width: 640px) {
  .tool-trace-summary {
    max-width: 100%;
    font-size: 11px;
    padding: 5px 8px;
  }

  .tool-summary-count {
    display: none;
  }
}
</style>
