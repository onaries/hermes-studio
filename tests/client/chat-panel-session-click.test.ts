import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

describe('ChatPanel session clicks', () => {
  it('switches the store when the route is already on the clicked session', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('if (chatStore.activeSessionId !== sessionId)')
    expect(source).toContain('await chatStore.switchSession(sessionId)')
  })

  it('allows session model switching for coding agent sessions', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('contextSession.value?.source === "coding_agent"')
    expect(source).toContain('isSessionModelScopedCodingAgent')
    expect(source).toContain('!isCodingAgentAuthProvider(group.provider)')
    expect(source).toContain('showSessionModelModeModal')
    expect(source).toContain('pendingSessionModelSwitch')
    expect(source).toContain('chatStore.switchSessionModel(model, provider, sessionModelSessionId.value, apiMode)')
    expect(source).not.toContain('header-model-button--readonly')
    expect(source).not.toContain('if (isActiveSessionCodingAgent.value) return')
  })

  it('uses the active sidebar model as the new chat default for the active profile', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('const selectedProvider = appStore.selectedProvider || ""')
    expect(source).toContain('const selectedModel = appStore.selectedModel || ""')
    expect(source).toContain('profile === activeProfileName')
    expect(source).toContain('selectedGroup?.models.includes(selectedModel)')
  })

  it('groups unpinned sessions by agent while keeping the pinned group separate', () => {
    const source = readFileSync('packages/client/src/components/hermes/chat/ChatPanel.vue', 'utf8')

    expect(source).toContain('import { groupSessionsByAgent } from "@/shared/session-display"')
    expect(source).toContain('const unpinnedSessionGroups = computed(() => groupSessionsByAgent(unpinnedSessions.value))')
    expect(source).toContain('v-for="group in unpinnedSessionGroups"')
    expect(source).toContain('t(group.labelKey)')
    expect(source).toContain('t("chat.pinned")')
  })
})
