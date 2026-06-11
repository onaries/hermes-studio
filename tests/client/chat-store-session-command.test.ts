// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const chatApi = vi.hoisted(() => ({
  resumeSession: vi.fn(),
  registerSessionHandlers: vi.fn(),
  unregisterSessionHandlers: vi.fn(),
  getChatRunSocket: vi.fn(() => ({ emit: vi.fn() })),
  connectEmit: vi.fn(),
  connectChatRun: vi.fn(() => ({ emit: chatApi.connectEmit })),
  sessionCommandHandlers: [] as Array<(event: any) => void>,
  peerUserMessageHandlers: [] as Array<(event: any) => void>,
  sessionTitleUpdatedHandlers: [] as Array<(event: any) => void>,
}))

vi.mock('@/api/hermes/chat', () => ({
  startRunViaSocket: vi.fn(),
  resumeSession: chatApi.resumeSession,
  registerSessionHandlers: chatApi.registerSessionHandlers,
  unregisterSessionHandlers: chatApi.unregisterSessionHandlers,
  getChatRunSocket: chatApi.getChatRunSocket,
  connectChatRun: chatApi.connectChatRun,
  respondToolApproval: vi.fn(),
  respondClarify: vi.fn(),
  onPeerUserMessage: vi.fn((handler: (event: any) => void) => {
    chatApi.peerUserMessageHandlers.push(handler)
    return vi.fn()
  }),
  onSessionCommand: vi.fn((handler: (event: any) => void) => {
    chatApi.sessionCommandHandlers.push(handler)
    return vi.fn()
  }),
  onSessionTitleUpdated: vi.fn((handler: (event: any) => void) => {
    chatApi.sessionTitleUpdatedHandlers.push(handler)
    return vi.fn()
  }),
}))

vi.mock('@/api/client', () => ({
  getActiveProfileName: () => 'default',
}))

vi.mock('@/api/hermes/sessions', () => ({
  deleteSession: vi.fn(),
  fetchSession: vi.fn(),
  fetchSessions: vi.fn(),
  setSessionModel: vi.fn(),
}))

vi.mock('@/api/hermes/download', () => ({
  getDownloadUrl: (_path: string, name: string) => `/download/${name}`,
}))

vi.mock('@/stores/hermes/app', () => ({
  useAppStore: () => ({
    waitForModelsForRun: vi.fn(async () => undefined),
    selectedModel: 'gpt-test',
    selectedProvider: 'openai',
    modelGroups: [],
  }),
}))

vi.mock('@/utils/completion-sound', () => ({
  primeCompletionSound: vi.fn(),
  playCompletionSound: vi.fn(),
}))

import { useChatStore, type Session } from '@/stores/hermes/chat'

function makeSession(): Session {
  return {
    id: 'session-1',
    title: 'session',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('chat store session.command fanout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    chatApi.sessionCommandHandlers = []
    chatApi.peerUserMessageHandlers = []
    chatApi.sessionTitleUpdatedHandlers = []
    setActivePinia(createPinia())
  })

  it('attaches to a goal resume run started from another window', () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    expect(chatApi.sessionCommandHandlers).toHaveLength(1)

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'goal',
      action: 'resume',
      message: 'Goal resumed',
      started: true,
      terminal: false,
    })

    expect(store.isStreaming).toBe(true)
    expect(chatApi.registerSessionHandlers).toHaveBeenCalledWith('session-1', expect.objectContaining({
      onRunStarted: expect.any(Function),
      onSessionCommand: expect.any(Function),
    }))
    expect(store.messages).toEqual([
      expect.objectContaining({
        role: 'command',
        content: 'Goal resumed',
        commandAction: 'resume',
      }),
    ])
  })

  it('keeps the latest live TPS visible after a resumed run completes', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'streaming text' })
      expect(session.liveTps).toBeNull()
      vi.setSystemTime(3_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'more streaming text' })
      expect(session.liveTps).toBeGreaterThan(0)
      const finalTps = session.liveTps

      handlers.onRunCompleted({
        event: 'run.completed',
        session_id: 'session-1',
        queue_remaining: 0,
        output: 'streaming text',
      })

      expect(session.liveTps).toBe(finalTps)
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts live TPS timing at the first streamed token, not at run start', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      vi.setSystemTime(61_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      expect(session.liveTps).toBeNull()
      vi.setSystemTime(62_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      expect(session.liveTps).toBeNull()
      vi.setSystemTime(63_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })

      expect(session.liveTps).toBe(7.5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('uses final server output token delta for the completed TPS value when usage is available', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      session.outputTokens = 100
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      vi.setSystemTime(2_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'short' })
      vi.setSystemTime(4_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'short' })
      vi.setSystemTime(6_000)
      handlers.onRunCompleted({
        event: 'run.completed',
        session_id: 'session-1',
        queue_remaining: 0,
        output: 'shortshort',
        inputTokens: 50,
        outputTokens: 130,
      })

      expect(session.outputTokens).toBe(130)
      expect(session.liveTps).toBe(7.5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not show a huge completed TPS from a single streamed chunk', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      vi.setSystemTime(2_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'one chunk' })
      vi.setSystemTime(2_100)
      handlers.onRunCompleted({
        event: 'run.completed',
        session_id: 'session-1',
        queue_remaining: 0,
        output: 'one chunk',
        inputTokens: 50,
        outputTokens: 3_416,
      })

      expect(session.liveTps).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('falls back to streamed token estimates when completed usage is implausibly cumulative', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      vi.setSystemTime(2_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      vi.setSystemTime(4_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      vi.setSystemTime(6_000)
      handlers.onRunCompleted({
        event: 'run.completed',
        session_id: 'session-1',
        queue_remaining: 0,
        output: 'short stream',
        inputTokens: 50,
        outputTokens: 3_416,
      })

      expect(session.liveTps).toBeLessThan(100)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not let long tool gaps depress live TPS when reasoning resumes', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      vi.setSystemTime(2_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      vi.setSystemTime(3_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      vi.setSystemTime(4_000)
      handlers.onMessageDelta({ event: 'message.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })
      expect(session.liveTps).toBe(7.5)

      vi.setSystemTime(64_000)
      handlers.onReasoningDelta({ event: 'reasoning.delta', session_id: 'session-1', delta: 'abcdefghijklmnopqrst' })

      expect(session.liveTps).toBeGreaterThanOrEqual(7.5)
    } finally {
      vi.useRealTimers()
    }
  })

  it('updates live TPS while reasoning deltas stream before answer text', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000)
      const store = useChatStore()
      const session = makeSession()
      store.sessions = [session]
      store.activeSessionId = 'session-1'
      store.activeSession = session

      chatApi.sessionCommandHandlers[0]({
        event: 'session.command',
        session_id: 'session-1',
        command: 'goal',
        action: 'resume',
        message: 'Goal resumed',
        started: true,
        terminal: false,
      })

      const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
      handlers.onRunStarted({ event: 'run.started', session_id: 'session-1' })
      handlers.onReasoningDelta({ event: 'reasoning.delta', session_id: 'session-1', delta: 'thinking text' })
      expect(session.liveTps).toBeNull()
      vi.setSystemTime(3_000)
      handlers.onReasoningDelta({ event: 'reasoning.delta', session_id: 'session-1', delta: 'more thinking text' })

      expect(session.liveTps).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('handles approval events for resumed runs and clears stale approvals on completion', () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'goal',
      action: 'resume',
      message: 'Goal resumed',
      started: true,
      terminal: false,
    })

    const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
    expect(handlers?.onApprovalRequested).toEqual(expect.any(Function))
    expect(handlers?.onApprovalResolved).toEqual(expect.any(Function))

    handlers.onApprovalRequested({
      event: 'approval.requested',
      session_id: 'session-1',
      approval_id: 'approval-1',
      command: 'rm -rf /tmp/smoke',
      description: 'delete in root path',
      choices: ['deny'],
      timeout_ms: 300000,
    })

    expect(store.activePendingApproval?.approvalId).toBe('approval-1')
    expect(store.activePendingApproval?.timeoutMs).toBe(300000)

    handlers.onRunCompleted({
      event: 'run.completed',
      session_id: 'session-1',
      queue_remaining: 0,
      output: 'done',
    })

    expect(store.activePendingApproval).toBeNull()
  })

  it('clears stale approvals when a resumed run fails', () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'goal',
      action: 'resume',
      message: 'Goal resumed',
      started: true,
      terminal: false,
    })

    const handlers = chatApi.registerSessionHandlers.mock.calls[0]?.[1]
    handlers.onApprovalRequested({
      event: 'approval.requested',
      session_id: 'session-1',
      approval_id: 'approval-1',
      command: 'rm -rf /tmp/smoke',
      description: 'delete in root path',
      choices: ['deny'],
    })

    expect(store.activePendingApproval?.approvalId).toBe('approval-1')

    handlers.onRunFailed({
      event: 'run.failed',
      session_id: 'session-1',
      queue_remaining: 0,
      error: 'failed',
    })

    expect(store.activePendingApproval).toBeNull()
  })

  it('does not clear the transcript for goal done commands', () => {
    const store = useChatStore()
    const session = makeSession()
    session.messages = [
      { id: 'user-1', role: 'user', content: 'keep me', timestamp: 1 },
    ]
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'goal',
      action: 'clear',
      message: 'Goal cleared.',
      terminal: true,
    })

    expect(store.messages).toEqual([
      expect.objectContaining({ id: 'user-1', content: 'keep me' }),
      expect.objectContaining({
        role: 'command',
        content: 'Goal cleared.',
        commandAction: 'clear',
      }),
    ])
  })

  it('renders background command status as system so current assistant targeting survives', () => {
    const store = useChatStore()
    const session = makeSession()
    session.messages = [
      { id: 'user-1', role: 'user', content: 'foreground task', timestamp: 1 },
      { id: 'assistant-1', role: 'assistant', content: 'working...', timestamp: 2, isStreaming: true },
    ]
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'background',
      action: 'background',
      message: 'Background task started in session bg_test.',
      backgroundSessionId: 'bg_test',
      prompt: 'summarize docs',
      terminal: true,
    })

    expect(store.sessions[0].messages).toEqual([
      expect.objectContaining({
        role: 'user',
        content: 'summarize docs',
      }),
    ])
    expect(chatApi.registerSessionHandlers).toHaveBeenCalledWith('bg_test', expect.objectContaining({
      onRunStarted: expect.any(Function),
      onMessageDelta: expect.any(Function),
    }))
    expect(store.messages.at(-1)).toEqual(expect.objectContaining({
      role: 'system',
      content: 'Background task started in session bg_test.',
      commandAction: 'background',
    }))
    expect(store.sessions[0].messages.some(message => message.role === 'command' && message.commandAction === 'background')).toBe(false)
  })

  it('renders /btw as a prompt bubble plus a separate ephemeral result', () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'btw',
      action: 'btw',
      sideQuestionId: 'btw_test',
      prompt: 'quick check',
      started: true,
      terminal: false,
    })
    session.messages.push({ id: 'foreground-assistant', role: 'assistant', content: 'foreground still running', timestamp: 2, isStreaming: true })
    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'btw',
      action: 'btw',
      sideQuestionId: 'btw_test',
      prompt: 'quick check',
      delta: 'answer',
      terminal: false,
    })
    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'btw',
      action: 'btw',
      sideQuestionId: 'btw_test',
      prompt: 'quick check',
      output: 'answer',
      done: true,
      terminal: true,
    })

    expect(store.sessions.some(item => item.id.startsWith('bg_'))).toBe(false)
    expect(chatApi.registerSessionHandlers).not.toHaveBeenCalled()
    expect(store.isStreaming).toBe(false)
    expect(store.messages).toEqual([
      expect.objectContaining({
        id: 'btw-btw_test',
        role: 'assistant',
        content: '',
        isStreaming: false,
        commandAction: 'btw',
        commandData: expect.objectContaining({ prompt: 'quick check' }),
      }),
      expect.objectContaining({
        id: 'btw-result-btw_test',
        role: 'assistant',
        content: 'answer',
        isStreaming: false,
        commandAction: 'btw_result',
        commandData: expect.objectContaining({ prompt: 'quick check' }),
      }),
      expect.objectContaining({
        id: 'foreground-assistant',
        role: 'assistant',
        content: 'foreground still running',
      }),
    ])
  })

  it('dismisses ephemeral /btw bubbles and drops them when leaving the session', async () => {
    const store = useChatStore()
    const session = makeSession()
    const otherSession: Session = { ...makeSession(), id: 'session-2', title: 'other' }
    store.sessions = [session, otherSession]
    store.activeSessionId = 'session-1'
    store.activeSession = session
    chatApi.resumeSession.mockImplementation((sessionId: string, callback: (data: any) => void) => {
      callback({ session_id: sessionId, messages: [], isWorking: false })
    })

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'btw',
      action: 'btw',
      sideQuestionId: 'btw_test',
      prompt: 'quick check',
      output: 'answer',
      done: true,
      terminal: true,
    })

    expect(store.messages).toHaveLength(2)
    store.dismissBtwMessage('btw-result-btw_test')
    expect(store.messages).toHaveLength(0)

    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'btw',
      action: 'btw',
      sideQuestionId: 'btw_again',
      output: 'temporary answer',
      done: true,
      terminal: true,
    })
    expect(session.messages.some(message => String(message.commandAction || '').startsWith('btw'))).toBe(true)

    await store.switchSession('session-2')
    expect(session.messages.some(message => String(message.commandAction || '').startsWith('btw'))).toBe(false)
    await store.switchSession('session-1')
    expect(store.messages.some(message => String(message.commandAction || '').startsWith('btw'))).toBe(false)
  })

  it('sends /btw out-of-band while the foreground session is active', async () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session
    chatApi.sessionCommandHandlers[0]({
      event: 'session.command',
      session_id: 'session-1',
      command: 'goal',
      action: 'resume',
      started: true,
      terminal: false,
    })
    session.messages = []

    await store.sendMessage('/btw another check')

    expect(chatApi.connectEmit).toHaveBeenCalledTimes(1)
    expect(chatApi.connectEmit).toHaveBeenNthCalledWith(1, 'run', expect.objectContaining({
      session_id: 'session-1',
      input: '/btw another check',
      source: 'cli',
    }))
    expect(store.messages).toEqual([])
    expect(store.isStreaming).toBe(true)
  })

  it('updates session title from the global generated-title event', () => {
    const store = useChatStore()
    const session = makeSession()
    store.sessions = [session]
    store.activeSessionId = 'session-1'
    store.activeSession = session

    expect(chatApi.sessionTitleUpdatedHandlers).toHaveLength(1)

    chatApi.sessionTitleUpdatedHandlers[0]({
      event: 'session.title.updated',
      session_id: 'session-1',
      title: 'Generated Title',
    })

    expect(store.sessions[0].title).toBe('Generated Title')
    expect(store.activeSession?.title).toBe('Generated Title')
  })
})
