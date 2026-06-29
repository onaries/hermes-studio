<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUsageStore } from '@/stores/hermes/usage'

const { t } = useI18n()
const usageStore = useUsageStore()
const maxAgentTokens = computed(() => Math.max(...usageStore.agentUsage.map(agent => agent.visualTokens), 1))

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}
</script>

<template>
  <div v-if="usageStore.hasAgentUsage" class="agent-breakdown">
    <h3 class="section-title">{{ t('usage.codingAgentBreakdown') }}</h3>

    <div class="agent-list">
      <div v-for="agent in usageStore.agentUsage" :key="`${agent.source}:${agent.agent}:${agent.model}`" class="agent-row">
        <span class="agent-swatch" :style="{ background: agent.color }" />
        <div class="agent-name-wrap">
          <span class="agent-name">{{ agent.label }}</span>
          <span class="agent-model" :title="agent.model">{{ agent.model }}</span>
        </div>
        <div class="agent-bar-wrap">
          <div class="agent-bar" :style="{ width: (agent.visualTokens / maxAgentTokens * 100) + '%' }">
            <div v-if="agent.inputTokens > 0" class="agent-bar-segment input" :style="{ width: agent.inputPercent + '%' }" />
            <div v-if="agent.outputTokens > 0" class="agent-bar-segment output" :style="{ width: agent.outputPercent + '%' }" />
            <div v-if="agent.cacheTokens > 0" class="agent-bar-segment cache" :style="{ width: agent.cachePercent + '%' }" />
          </div>
        </div>
        <span
          class="agent-tokens"
          :title="`${t('usage.inputTokens')}: ${formatTokens(agent.inputTokens)} · ${t('usage.outputTokens')}: ${formatTokens(agent.outputTokens)} · ${t('usage.cacheRead')}: ${formatTokens(agent.cacheTokens)}`"
        >
          {{ formatTokens(agent.totalTokens) }}
          <small v-if="agent.cacheTokens > 0">+{{ formatTokens(agent.cacheTokens) }}</small>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.agent-breakdown {
  background: $bg-card;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  padding: 16px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  margin: 0 0 12px;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agent-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.agent-name-wrap {
  display: flex;
  flex-direction: column;
  width: 140px;
  min-width: 0;
  flex-shrink: 0;
}

.agent-name {
  font-size: 12px;
  color: $text-secondary;
  font-weight: 600;
  line-height: 1.2;
}

.agent-model {
  font-size: 10px;
  color: $text-muted;
  font-family: $font-code;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-bar-wrap {
  flex: 1;
  height: 16px;
  background: $bg-secondary;
  border-radius: 3px;
  overflow: hidden;
}

.agent-bar {
  height: 100%;
  border-radius: 3px;
  min-width: 2px;
  transition: width 0.3s ease;
  display: flex;
  overflow: hidden;
}

.agent-bar-segment {
  height: 100%;
  min-width: 0;

  &.input {
    background: #5c6bc0;
  }

  &.output {
    background: #26a69a;
  }

  &.cache {
    background: #f6ad55;
  }
}

.agent-tokens {
  font-size: 12px;
  color: $text-muted;
  width: 86px;
  text-align: right;
  flex-shrink: 0;

  small {
    color: #f6ad55;
    margin-left: 4px;
    font-size: 10px;
  }
}
</style>
