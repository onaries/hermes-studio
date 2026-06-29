import { describe, expect, it } from 'vitest'
import { getSessionAgentKind, getSessionAgentLogo, groupSessionsByAgent } from '@/shared/session-display'

describe('session display helpers', () => {
  it('classifies coding-agent sessions by agent kind and keeps legacy sessions under Hermes', () => {
    expect(getSessionAgentKind({ source: 'coding_agent', agent: 'codex' })).toBe('codex')
    expect(getSessionAgentKind({ source: 'coding_agent', codingAgentId: 'codex' })).toBe('codex')
    expect(getSessionAgentKind({ source: 'coding_agent', agent: 'claude' })).toBe('claude-code')
    expect(getSessionAgentKind({ source: 'coding_agent' })).toBe('claude-code')
    expect(getSessionAgentKind({ source: 'cli', agent: 'hermes' })).toBe('hermes')
    expect(getSessionAgentKind({})).toBe('hermes')
  })

  it('returns the matching logo metadata for the session group', () => {
    expect(getSessionAgentLogo({ source: 'coding_agent', agent: 'codex' })).toEqual({
      label: 'Codex',
      src: '/coding-agents/codex-openai.png',
    })
    expect(getSessionAgentLogo({ source: 'coding_agent', agent: 'claude' })).toEqual({
      label: 'Claude Code',
      src: '/coding-agents/claude-code.svg',
    })
    expect(getSessionAgentLogo({ source: 'cli', agent: 'hermes' })).toEqual({
      label: 'Hermes',
      src: '/coding-agents/hermes.png',
    })
  })

  it('groups unpinned sidebar sessions as Codex, Claude Code, then Hermes while preserving input order inside groups', () => {
    const sessions = [
      { id: 'hermes-new', source: 'cli', agent: 'hermes' },
      { id: 'codex-live', source: 'coding_agent', agent: 'codex' },
      { id: 'claude', source: 'coding_agent', agent: 'claude' },
      { id: 'codex-old', source: 'coding_agent', codingAgentId: 'codex' },
      { id: 'legacy', source: undefined, agent: undefined },
    ]

    expect(groupSessionsByAgent(sessions).map(group => ({
      kind: group.kind,
      labelKey: group.labelKey,
      ids: group.sessions.map(session => session.id),
    }))).toEqual([
      { kind: 'codex', labelKey: 'chat.agentGroups.codex', ids: ['codex-live', 'codex-old'] },
      { kind: 'claude-code', labelKey: 'chat.agentGroups.claudeCode', ids: ['claude'] },
      { kind: 'hermes', labelKey: 'chat.agentGroups.hermes', ids: ['hermes-new', 'legacy'] },
    ])
  })
})
