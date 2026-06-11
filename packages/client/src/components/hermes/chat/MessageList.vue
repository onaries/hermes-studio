<script lang="ts">
type SessionScrollSnapshot = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  wasNearBottom: boolean;
}

type BottomScrollOptions = number | {
  frames?: number;
  keepAliveMs?: number;
}

const sessionScrollPositions = new Map<string, SessionScrollSnapshot>();
</script>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NInput } from "naive-ui";
import VirtualMessageList from "./VirtualMessageList.vue";
import MessageItem from "./MessageItem.vue";
import TodoPanel from "./TodoPanel.vue";
import ToolTraceGroup from "./ToolTraceGroup.vue";
import { useChatStore, type Message } from "@/stores/hermes/chat";
import {
  groupToolTraceMessages,
  isToolTraceGroup,
  type ToolTraceDisplayItem,
} from "@/utils/tool-aggregate-summary";
import thinkingImageLight from "@/assets/thinking-light.gif";
import thinkingImageDark from "@/assets/thinking-dark.gif";
import { useTheme } from "@/composables/useTheme";
import { useToolTraceVisibility } from "@/composables/useToolTraceVisibility";

const chatStore = useChatStore();
const { t } = useI18n();
const { isDark } = useTheme();
const { toolTraceVisible } = useToolTraceVisibility();
const listRef = ref<InstanceType<typeof VirtualMessageList> | null>(null);
const pendingInitialScrollSessionId = ref<string | null>(null);
const initialBottomScrollOptions = { frames: 8, keepAliveMs: 1200 };

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

function formatToolDuration(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`
  if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}m ${secs}s`
}

type ToolCallLike = {
  toolName?: string
  toolPreview?: string
  toolArgs?: unknown
  toolDuration?: number
  toolStatus?: string
}

function parseToolArgs(raw: unknown): unknown {
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

function rawString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function firstRawString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = rawString(record[key])
    if (value) return value
  }
  return ''
}

function fullToolPreview(tool: ToolCallLike): string {
  const name = (tool.toolName || '').toLowerCase()
  const args = parseToolArgs(tool.toolArgs)
  if (isRecord(args)) {
    if (name.includes('read_file') || name.includes('write_file') || name.includes('patch')) {
      return firstRawString(args, ['path']) || tool.toolPreview || ''
    }
    if (name.includes('skill_view')) {
      return firstRawString(args, ['name']) || tool.toolPreview || ''
    }
    if (name.includes('terminal')) {
      return firstRawString(args, ['command']) || tool.toolPreview || ''
    }
    if (name.includes('web_search')) {
      return firstRawString(args, ['query']) || tool.toolPreview || ''
    }
    if (name.includes('search_files')) {
      return [firstRawString(args, ['pattern']), firstRawString(args, ['path'])]
        .filter(Boolean)
        .join(' ')
        || tool.toolPreview
        || ''
    }
  }
  return tool.toolPreview || ''
}

function toolCallPreview(tool: ToolCallLike): string {
  return tool.toolPreview || fullToolPreview(tool)
}

function toolCallTitle(tool: ToolCallLike): string {
  const parts = [tool.toolName, fullToolPreview(tool)]
  if (tool.toolDuration && tool.toolStatus !== 'running') parts.push(formatToolDuration(tool.toolDuration))
  if (tool.toolStatus === 'done') parts.push('✓')
  if (tool.toolStatus === 'error') parts.push('✕')
  return parts.filter(Boolean).join(' ')
}

const currentToolCalls = computed(() => {
  const msgs = chatStore.messages;
  // Find the last user message index
  let lastUserIdx = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  // Only tool calls after the last user message, newest on top
  const tools = msgs.filter((m, i) => m.role === "tool" && i > lastUserIdx);
  return [...tools].reverse();
});

const visibleToolCalls = computed(() =>
  currentToolCalls.value.filter((tool) => !!tool.toolName),
);

const enteringToolCallIds = ref<Set<string>>(new Set());
const enteringToolCallTimers = new Map<string, number>();

function markToolCallEntering(id: string) {
  window.clearTimeout(enteringToolCallTimers.get(id));
  enteringToolCallIds.value = new Set(enteringToolCallIds.value).add(id);
  enteringToolCallTimers.set(id, window.setTimeout(() => {
    enteringToolCallTimers.delete(id);
    const nextIds = new Set(enteringToolCallIds.value);
    nextIds.delete(id);
    enteringToolCallIds.value = nextIds;
  }, 900));
}

function isToolCallEntering(tool: Message): boolean {
  return enteringToolCallIds.value.has(tool.id);
}

watch(
  () => visibleToolCalls.value.map((tool) => tool.id),
  (toolIds, previousToolIds = []) => {
    const previousIds = new Set(previousToolIds);
    for (const id of toolIds) {
      if (!previousIds.has(id)) markToolCallEntering(id);
    }
  },
);

const emptyState = computed(() => {
  const session = chatStore.activeSession;
  const codingAgentId = session?.codingAgentId || (session?.agent === "codex" ? "codex" : session?.agent === "claude" ? "claude-code" : undefined);
  if (codingAgentId === "codex") {
    return {
      logo: "/coding-agents/codex-openai.png",
      alt: "Codex",
      text: t("chat.emptyStateAgent", { agent: "Codex" }),
    };
  }
  if (codingAgentId === "claude-code") {
    return {
      logo: "/coding-agents/claude-code.svg",
      alt: "Claude Code",
      text: t("chat.emptyStateAgent", { agent: "Claude Code" }),
    };
  }
  return {
    logo: "/logo.png",
    alt: "Hermes",
    text: t("chat.emptyState"),
  };
});

const displayMessages = computed<ToolTraceDisplayItem[]>(() => {
  const currentToolIds = new Set(currentToolCalls.value.map((tool) => tool.id));
  const visibleMessages: Message[] = chatStore.messages.filter((m) => {
    if (m.role === "tool") {
      return toolTraceVisible.value && !!m.toolName && !(chatStore.isRunActive && currentToolIds.has(m.id));
    }
    if (
      m.role === "assistant" &&
      m.isStreaming &&
      !m.content?.trim() &&
      !!m.reasoning?.trim() &&
      currentToolCalls.value.length === 0
    ) {
      return false;
    }
    return true;
  });
  return groupToolTraceMessages(visibleMessages);
});

const queuedMessages = computed(() => {
  const sid = chatStore.activeSessionId;
  if (!sid) return [];
  return chatStore.queuedUserMessages.get(sid) || [];
});
const visibleApproval = computed(() => chatStore.activePendingApproval);
const visibleClarify = computed(() => chatStore.activePendingClarify);
const clarifyResponse = ref("");
const hasFloatingPrompt = computed(() => !!visibleApproval.value || !!visibleClarify.value);
const virtualListPadding = computed(() => {
  if (queuedMessages.value.length > 0 && hasFloatingPrompt.value) return "20px 20px 380px";
  if (queuedMessages.value.length > 0 || hasFloatingPrompt.value) return "20px 20px 260px";
  return "20px";
});

function handleApproval(choice: "once" | "session" | "always" | "deny") {
  chatStore.respondApproval(choice);
}

function handleClarify(response?: string) {
  const finalResponse = response !== undefined ? response : clarifyResponse.value.trim();
  chatStore.respondToClarify(finalResponse);
  clarifyResponse.value = "";
}

function removeQueuedMessage(messageId: string) {
  const sid = chatStore.activeSessionId;
  if (!sid) return;
  chatStore.removeQueuedMessage(sid, messageId);
}

function queuedPreview(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 48)}...` : normalized;
}

function shouldAutoFollowBottom(threshold = 100): boolean {
  return listRef.value?.shouldAutoFollowBottom(threshold) ?? true;
}

function scrollToBottom(options?: BottomScrollOptions) {
  listRef.value?.scrollToBottom(options);
}

function scrollToMessage(messageId: string) {
  listRef.value?.scrollToMessage(messageId);
}

function scrollToAnchor(messageId: string, anchorId: string) {
  listRef.value?.scrollToAnchor(messageId, anchorId);
}

function saveSessionScrollPosition(sessionId: string | null | undefined) {
  if (!sessionId) return;
  const snapshot = listRef.value?.captureViewportPosition() ?? null;
  if (snapshot) sessionScrollPositions.set(sessionId, snapshot);
}

function applyInitialSessionScroll(sessionId: string) {
  if (chatStore.activeSessionId !== sessionId) return;
  if (chatStore.focusMessageId) {
    pendingInitialScrollSessionId.value = null;
    scrollToMessage(chatStore.focusMessageId);
    return;
  }

  const snapshot = sessionScrollPositions.get(sessionId);
  if (snapshot) {
    pendingInitialScrollSessionId.value = null;
    if (snapshot.wasNearBottom) {
      scrollToBottom(initialBottomScrollOptions);
    } else {
      listRef.value?.restoreViewportPosition(snapshot);
    }
    return;
  }

  scrollToBottom(initialBottomScrollOptions);
  if (chatStore.messages.length > 0 && !chatStore.isLoadingMessages) {
    pendingInitialScrollSessionId.value = null;
  }
}

async function handleTopReach() {
  const session = chatStore.activeSession;
  if (!session?.hasMoreBefore || session.isLoadingOlderMessages) return;
  const snapshot = listRef.value?.captureScrollPosition() ?? null;
  const loaded = await chatStore.loadOlderMessages(session.id);
  if (!loaded) return;
  await nextTick();
  listRef.value?.restoreScrollPosition(snapshot);
}

watch(
  () => chatStore.activeSessionId,
  async (id, previousId) => {
    saveSessionScrollPosition(previousId);
    if (!id) return;
    pendingInitialScrollSessionId.value = id;
    await nextTick();
    applyInitialSessionScroll(id);
  },
  { immediate: true },
);

watch(
  () => [chatStore.activeSessionId, chatStore.messages.length] as const,
  ([id, length]) => {
    if (!id || pendingInitialScrollSessionId.value !== id || length === 0) return;
    applyInitialSessionScroll(id);
  },
  { flush: "post" },
);

watch(
  () => chatStore.isLoadingMessages,
  async (isLoading, wasLoading) => {
    if (isLoading || !wasLoading) return;
    const id = chatStore.activeSessionId;
    if (!id || pendingInitialScrollSessionId.value !== id) return;
    if (chatStore.focusMessageId) {
      pendingInitialScrollSessionId.value = null;
      return;
    }
    await nextTick();
    if (chatStore.activeSessionId !== id) return;
    scrollToBottom(initialBottomScrollOptions);
    pendingInitialScrollSessionId.value = null;
  },
  { flush: "post" },
);

watch(
  () => chatStore.focusMessageId,
  (messageId) => {
    if (!messageId) return;
    scrollToMessage(messageId);
  },
);

// When a run starts (user just sent a message), always scroll to bottom once
watch(
  () => chatStore.isRunActive,
  (v) => {
    if (v) scrollToBottom({ frames: 3, keepAliveMs: 400 });
  },
);

// During streaming, only auto-scroll if the user is already near the bottom
watch(
  () => chatStore.messages[chatStore.messages.length - 1]?.content,
  () => {
    if (pendingInitialScrollSessionId.value === chatStore.activeSessionId) return;
    if (chatStore.focusMessageId) {
      scrollToMessage(chatStore.focusMessageId);
      return;
    }
    if (!shouldAutoFollowBottom()) return;
    scrollToBottom({ frames: 1, keepAliveMs: 0 });
  },
);
watch(currentToolCalls, () => {
  if (pendingInitialScrollSessionId.value === chatStore.activeSessionId) return;
  if (chatStore.focusMessageId) {
    scrollToMessage(chatStore.focusMessageId);
    return;
  }
  if (!shouldAutoFollowBottom()) return;
  scrollToBottom({ frames: 1, keepAliveMs: 0 });
});

watch(
  () => queuedMessages.value.length,
  async (length, previousLength) => {
    if (pendingInitialScrollSessionId.value === chatStore.activeSessionId) return;
    if (chatStore.focusMessageId) return;
    if (length <= previousLength) return;
    const wasNearBottom = shouldAutoFollowBottom(320);
    await nextTick();
    if (!wasNearBottom && !chatStore.isRunActive) return;
    scrollToBottom({ frames: 4, keepAliveMs: 600 });
  },
);

onBeforeUnmount(() => {
  saveSessionScrollPosition(chatStore.activeSessionId);
  for (const timer of enteringToolCallTimers.values()) {
    window.clearTimeout(timer);
  }
  enteringToolCallTimers.clear();
});

defineExpose({
  scrollToBottom,
  scrollToMessage,
  scrollToAnchor,
});
</script>

<template>
  <div class="message-list-shell">
    <VirtualMessageList
      :key="chatStore.activeSessionId || 'chat-empty'"
      ref="listRef"
      :messages="displayMessages"
      :padding="virtualListPadding"
      @top-reach="handleTopReach"
    >
      <template #empty>
        <div class="empty-state">
          <img :src="emptyState.logo" :alt="emptyState.alt" class="empty-logo" />
          <p>{{ emptyState.text }}</p>
        </div>
      </template>
      <template #before>
        <div
          v-if="chatStore.activeSession?.hasMoreBefore || chatStore.activeSession?.isLoadingOlderMessages"
          class="history-loader"
        >
          <span v-if="chatStore.activeSession?.isLoadingOlderMessages" class="history-loader-spinner"></span>
        </div>
      </template>
      <template #item="{ message: msg }">
        <ToolTraceGroup
          v-if="isToolTraceGroup(msg)"
          :id="msg.id"
          :tools="msg.tools"
          :highlight="chatStore.focusMessageId === msg.id"
        />
        <MessageItem
          v-else
          :message="msg"
          :highlight="chatStore.focusMessageId === msg.id"
        />
      </template>
      <template #after>
        <Transition name="fade">
        <div v-if="chatStore.isRunActive || chatStore.abortState" class="streaming-indicator">
          <img
            :src="isDark ? thinkingImageDark : thinkingImageLight"
            alt=""
            aria-hidden="true"
            class="thinking-video"
          >
          <div v-if="visibleToolCalls.length > 0 || chatStore.compressionState || chatStore.abortState" class="tool-calls-panel">
            <!-- Abort indicator -->
            <div v-if="chatStore.abortState" class="tool-call-item compression-item">
              <svg
                v-if="chatStore.abortState.aborting"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="tool-call-icon"
              >
                <path d="M10 9v6m4-6v6M5 5h14v14H5z" />
              </svg>
              <svg
                v-else
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="tool-call-icon"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span class="tool-call-name">
                {{
                  chatStore.abortState.aborting
                    ? chatStore.abortState.timedOut
                      ? (chatStore.abortState.message || 'Still stopping... new messages will be queued')
                      : 'Pausing... waiting for the run to stop and sync'
                    : chatStore.abortState.synced
                      ? 'Paused and synced'
                      : 'Paused'
                }}
              </span>
              <span
                v-if="chatStore.abortState.aborting"
                class="tool-call-spinner"
              ></span>
            </div>
            <!-- Compression indicator -->
            <div v-if="chatStore.compressionState" class="tool-call-item compression-item">
              <svg
                v-if="chatStore.compressionState.compressing"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="tool-call-icon"
              >
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg
                v-else-if="chatStore.compressionState.compressed"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                class="tool-call-icon"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              <span class="tool-call-name">
                {{
                  chatStore.compressionState.compressing
                    ? `Compressing... (${chatStore.compressionState.messageCount} msgs, ~${formatTokens(chatStore.compressionState.beforeTokens)} tokens)`
                    : chatStore.compressionState.compressed
                      ? `Compressed ${chatStore.compressionState.messageCount} msgs: ~${formatTokens(chatStore.compressionState.beforeTokens)} → ~${formatTokens(chatStore.compressionState.afterTokens)} tokens`
                      : `Compression skipped`
                }}
              </span>
              <span
                v-if="chatStore.compressionState.compressing"
                class="tool-call-spinner"
              ></span>
            </div>
            <!-- Tool calls -->
            <TransitionGroup appear name="tool-call-list" tag="div" class="tool-call-list">
              <div
                v-for="tc in visibleToolCalls"
                :key="tc.id"
                class="tool-call-item"
                :class="{
                  'tool-call-item--entering': isToolCallEntering(tc),
                  'tool-call-item--running': tc.toolStatus === 'running',
                  'tool-call-item--done': tc.toolStatus === 'done',
                  'tool-call-item--error': tc.toolStatus === 'error',
                }"
                :title="toolCallTitle(tc)"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  class="tool-call-icon"
                >
                  <path
                    d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                  />
                </svg>
                <span class="tool-call-name">{{ tc.toolName }}</span>
                <span v-if="toolCallPreview(tc)" class="tool-call-preview">{{
                  toolCallPreview(tc)
                }}</span>
                <span
                  v-if="tc.toolDuration && tc.toolStatus !== 'running'"
                  class="tool-call-duration"
                  :title="t('chat.executionDuration')"
                >{{ formatToolDuration(tc.toolDuration) }}</span
                >
                <svg
                  v-if="tc.toolStatus === 'done'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  class="tool-call-success-icon"
                >
                  <circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.15"/>
                  <path
                    d="M8 12L11 15L16 9"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="none"
                  />
                </svg>
                <span
                  v-if="tc.toolStatus === 'running'"
                  class="tool-call-spinner"
                ></span>
                <svg
                  v-if="tc.toolStatus === 'error'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  class="tool-call-error-icon"
                >
                  <circle cx="12" cy="12" r="10" fill="currentColor" fill-opacity="0.15"/>
                  <path
                    d="M15 9L9 15M9 9L15 15"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </TransitionGroup>
          </div>
        </div>
        </Transition>
        <TodoPanel />
      </template>
    </VirtualMessageList>
    <div
      v-if="visibleApproval || visibleClarify || queuedMessages.length > 0"
      class="message-float-stack"
    >
      <Transition name="queue-float">
        <div v-if="visibleApproval" class="approval-float-panel">
          <div class="float-panel-header">
            <span class="approval-float-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <span>{{ t("chat.approvalKicker") }}</span>
          </div>
          <div class="approval-float-title">{{ t("chat.approvalTitle") }}</div>
          <div class="approval-float-desc">{{ visibleApproval.description }}</div>
          <code class="approval-float-command">{{ visibleApproval.command }}</code>
          <div class="approval-float-actions">
            <NButton
              v-if="visibleApproval.isMemoryWrite"
              size="small"
              type="primary"
              @click="handleApproval('once')"
            >
              {{ t("chat.approvalAgree") }}
            </NButton>
            <NButton
              v-if="!visibleApproval.isMemoryWrite && visibleApproval.choices.includes('once')"
              size="small"
              type="primary"
              @click="handleApproval('once')"
            >
              {{ t("chat.approvalAllowOnce") }}
            </NButton>
            <NButton
              v-if="!visibleApproval.isMemoryWrite && visibleApproval.choices.includes('session')"
              size="small"
              secondary
              @click="handleApproval('session')"
            >
              {{ t("chat.approvalAllowSession") }}
            </NButton>
            <NButton
              v-if="!visibleApproval.isMemoryWrite && visibleApproval.choices.includes('always')"
              size="small"
              secondary
              @click="handleApproval('always')"
            >
              {{ t("chat.approvalAlways") }}
            </NButton>
            <NButton
              v-if="visibleApproval.isMemoryWrite || visibleApproval.choices.includes('deny')"
              size="small"
              type="error"
              secondary
              @click="handleApproval('deny')"
            >
              {{ t("chat.approvalDeny") }}
            </NButton>
          </div>
        </div>
      </Transition>
      <Transition name="queue-float">
        <div v-if="!visibleApproval && visibleClarify" class="approval-float-panel">
          <div class="float-panel-header">
            <span class="approval-float-icon" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span>{{ t("chat.clarifyKicker") }}</span>
          </div>
          <div class="approval-float-title">{{ t("chat.clarifyTitle") }}</div>
          <div class="approval-float-desc">{{ visibleClarify.question }}</div>
          <div v-if="visibleClarify.choices && visibleClarify.choices.length" class="approval-float-actions">
            <NButton
              v-for="choice in visibleClarify.choices"
              :key="choice"
              size="small"
              type="primary"
              @click="handleClarify(choice)"
            >
              {{ choice }}
            </NButton>
            <NButton size="small" type="error" secondary @click="handleClarify('')">
              {{ t("chat.clarifyDismiss") }}
            </NButton>
          </div>
          <div v-else class="clarify-float-input-row">
            <NInput
              v-model:value="clarifyResponse"
              size="small"
              :placeholder="t('chat.clarifyPlaceholder')"
            />
            <NButton size="small" type="primary" @click="handleClarify()">
              {{ t("chat.clarifySubmit") }}
            </NButton>
          </div>
        </div>
      </Transition>
      <Transition name="queue-float">
        <div v-if="queuedMessages.length > 0" class="queue-float-panel">
          <div class="queue-float-header">
            <span class="queue-orbit" aria-hidden="true">
              <span></span>
            </span>
            <span>{{ t('chat.messageQueue') }}</span>
            <strong>{{ queuedMessages.length }}</strong>
          </div>
          <div class="queue-float-list">
            <div
              v-for="(message, index) in queuedMessages"
              :key="message.id"
              class="queue-float-item"
            >
              <span class="queue-index">{{ index + 1 }}</span>
              <span class="queue-text">{{ queuedPreview(message.content) }}</span>
              <button
                type="button"
                class="queue-remove"
                :title="t('chat.removeQueuedMessage')"
                @click="removeQueuedMessage(message.id)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/variables" as *;

.message-list-shell {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
}

.message-float-stack {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 8;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(720px, calc(100% - 32px));
  pointer-events: none;
}

.approval-float-panel,
.queue-float-panel {
  pointer-events: auto;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(var(--accent-info-rgb), 0.22);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(14px);

  .dark & {
    background: #262626;
  }
}

.approval-float-panel {
  border-color: rgba(var(--accent-primary-rgb), 0.24);
}

.queue-float-panel {
  align-self: flex-end;
  width: min(380px, 100%);
}

.float-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 8px;
  color: var(--accent-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.approval-float-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
  border: 1px solid rgba(var(--accent-primary-rgb), 0.24);
}

.approval-float-title {
  padding: 0 4px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
  color: $text-primary;
}

.approval-float-desc {
  padding: 0 4px;
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: $text-secondary;
}

.approval-float-command {
  display: block;
  margin: 8px 4px 0;
  max-height: 96px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: "SFMono-Regular", "Cascadia Code", "Roboto Mono", Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: $text-primary;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid $border-color;
  border-radius: 11px;
  padding: 8px 10px;

  .dark & {
    background: rgba(255, 255, 255, 0.08);
  }
}

.approval-float-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 4px 0;
  border-top: 1px solid $border-color;
}

.clarify-float-input-row {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 4px 0;
  border-top: 1px solid $border-color;

  :deep(.n-input) {
    flex: 1 1 auto;
    min-width: 0;
  }

  :deep(.n-button) {
    flex: 0 0 auto;
  }
}

.queue-float-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px 8px;
  color: $text-secondary;
  font-size: 12px;
  font-weight: 600;

  strong {
    margin-left: auto;
    min-width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(var(--accent-info-rgb), 0.16);
    color: var(--accent-info);
  }
}

.queue-orbit {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-info-rgb), 0.28);
  position: relative;
  animation: queue-spin 1.6s linear infinite;

  span {
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    right: -2px;
    top: 5px;
    background: var(--accent-info);
    box-shadow: 0 0 12px rgba(var(--accent-info-rgb), 0.65);
  }
}

.queue-float-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 172px;
  overflow-y: auto;
}

.queue-float-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 7px 8px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.68);
  color: $text-primary;

  .dark & {
    background: rgba(255, 255, 255, 0.08);
  }
}

.queue-index {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: var(--accent-info);
  background: rgba(var(--accent-info-rgb), 0.12);
}

.queue-text {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.queue-remove {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  background: transparent;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    color: $error;
    background: rgba($error, 0.1);
  }
}

@media (max-width: 640px) {
  .message-float-stack {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    gap: 8px;
  }

  .approval-float-panel,
  .queue-float-panel {
    padding: 7px;
    border-radius: 14px;
  }

  .queue-float-header {
    padding: 0 2px;
    font-size: 11px;

    span:nth-child(2) {
      display: none;
    }
  }

  .queue-orbit {
    width: 16px;
    height: 16px;

    span {
      width: 5px;
      height: 5px;
      top: 5px;
    }
  }

  .queue-float-list {
    margin-top: 6px;
    max-height: min(220px, 34dvh);
    overflow-y: auto;
  }

  .queue-float-item {
    min-height: 30px;
    padding: 5px 6px;
  }

  .queue-index {
    width: 18px;
    height: 18px;
    border-radius: 6px;
    font-size: 10px;
  }

  .queue-text {
    font-size: 11px;
  }

  .queue-remove {
    width: 22px;
    height: 22px;
  }

  .approval-float-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    :deep(.n-button) {
      width: 100%;
    }
  }

  .clarify-float-input-row {
    flex-direction: column;

    :deep(.n-button) {
      width: 100%;
    }
  }
}

@keyframes queue-spin {
  to {
    transform: rotate(360deg);
  }
}

.queue-float-enter-active,
.queue-float-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.queue-float-enter-from,
.queue-float-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  gap: 12px;

  .empty-logo {
    width: 48px;
    height: 48px;
    opacity: 0.25;
  }

  p {
    font-size: 14px;
  }
}

.history-loader {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.history-loader-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(0, 0, 0, 0.16);
  border-top-color: $accent-primary;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;

  .dark & {
    border-color: rgba(255, 255, 255, 0.18);
    border-top-color: $accent-primary;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.streaming-indicator {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 4px;
  .thinking-video {
    width: 120px;
    height: 213px;
    border-radius: $radius-md;
    object-fit: contain;
    flex-shrink: 0;
  }
}

.tool-calls-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 213px;
  overflow-y: auto;
  padding-top: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

.tool-call-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-call-list-enter-active,
.tool-call-list-appear-active {
  animation: tool-call-row-enter 0.46s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.tool-call-list-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
    filter 0.24s ease;
}

.tool-call-list-enter-from,
.tool-call-list-appear-from {
  opacity: 0;
  filter: saturate(1.35);
  transform: translateY(-8px) scale(0.985);
}

.tool-call-list-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.985);
}

.tool-call-list-move {
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

.tool-call-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: $text-secondary;
  padding: 3px 8px 3px 10px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: $radius-sm;
  border: 1px solid transparent;
  text-align: left;
  overflow: hidden;
  transition:
    background $transition-fast,
    border-color $transition-fast,
    box-shadow $transition-fast;

  .dark & {
    background: rgba(255, 255, 255, 0.06);
  }

  &.compression-item {
    color: $text-muted;
    font-size: 10px;
  }

  &.tool-call-item--entering {
    animation: tool-call-row-enter-highlight 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  &.tool-call-item--running {
    background: rgba(var(--accent-primary-rgb), 0.08);
    border-color: rgba(var(--accent-primary-rgb), 0.2);
    box-shadow: 0 0 0 1px rgba(var(--accent-primary-rgb), 0.04) inset;

    .tool-call-icon,
    .tool-call-name {
      color: $accent-primary;
    }

    &::before {
      content: '';
      position: absolute;
      top: 4px;
      bottom: 4px;
      left: 4px;
      width: 2px;
      border-radius: 999px;
      background: $accent-primary;
      animation: tool-running-pulse 1.15s ease-in-out infinite;
    }

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(
        100deg,
        transparent 0%,
        rgba(var(--accent-primary-rgb), 0.14) 45%,
        transparent 70%
      );
      transform: translateX(-120%);
      animation: tool-running-sweep 1.8s ease-in-out infinite;
    }
  }

  .tool-call-icon {
    flex-shrink: 0;
    color: $text-muted;
  }

  .tool-call-name {
    font-family: $font-code;
    flex-shrink: 0;
  }

  .tool-call-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 300px;
    color: $text-muted;
  }

  &:hover {
    align-items: flex-start;
  }

  &:hover .tool-call-preview {
    white-space: normal;
    overflow: visible;
    text-overflow: initial;
    max-width: min(760px, 72vw);
    overflow-wrap: anywhere;
    color: $text-secondary;
  }
}

.tool-call-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid $text-muted;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

.tool-call-error-icon {
  color: #ff4d4f;
  flex-shrink: 0;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-call-duration {
  font-size: 10px;
  color: $text-muted;
  font-family: $font-code;
  margin-left: 4px;
  flex-shrink: 0;
}

.tool-call-success-icon {
  color: #52c41a;
  flex-shrink: 0;
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes tool-call-row-enter {
  0% {
    opacity: 0;
    filter: saturate(1.3);
    transform: translateY(-12px) scale(0.96);
  }
  65% {
    opacity: 1;
    filter: saturate(1.12);
    transform: translateY(1px) scale(1.01);
  }
  100% {
    opacity: 1;
    filter: none;
    transform: translateY(0) scale(1);
  }
}

@keyframes tool-call-row-enter-highlight {
  0% {
    opacity: 0;
    filter: saturate(1.35);
    transform: translateY(-14px) scale(0.96);
    box-shadow:
      0 0 0 1px rgba(var(--accent-primary-rgb), 0.22) inset,
      0 12px 28px rgba(var(--accent-primary-rgb), 0.18);
  }
  45% {
    opacity: 1;
    filter: saturate(1.18);
    transform: translateY(0) scale(1.015);
    box-shadow:
      0 0 0 1px rgba(var(--accent-primary-rgb), 0.24) inset,
      0 8px 20px rgba(var(--accent-primary-rgb), 0.14);
  }
  100% {
    opacity: 1;
    filter: none;
    transform: translateY(0) scale(1);
    box-shadow: 0 0 0 1px rgba(var(--accent-primary-rgb), 0.04) inset;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes tool-running-pulse {
  0%, 100% {
    opacity: 0.45;
    transform: scaleY(0.7);
  }
  50% {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes tool-running-sweep {
  0% {
    transform: translateX(-120%);
  }
  55%, 100% {
    transform: translateX(120%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-call-list-enter-active,
  .tool-call-list-appear-active,
  .tool-call-list-leave-active,
  .tool-call-list-move {
    transition: none;
    animation: none;
  }

  .tool-call-list-enter-from,
  .tool-call-list-appear-from,
  .tool-call-list-leave-to {
    opacity: 1;
    filter: none;
    transform: none;
  }

  .tool-call-item--entering,
  .tool-call-item--running::before,
  .tool-call-item--running::after,
  .tool-call-spinner {
    animation: none;
  }

  .tool-call-item--running::after {
    display: none;
  }
}
</style>
