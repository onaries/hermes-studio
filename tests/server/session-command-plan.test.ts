import { beforeEach, describe, expect, it, vi } from 'vitest'

const addMessageMock = vi.fn()
const createSessionMock = vi.fn()
const getSessionMock = vi.fn()
const updateSessionStatsMock = vi.fn()
const compressionMocks = vi.hoisted(() => ({
  buildDbHistory: vi.fn(async () => []),
  buildSnapshotAwareHistory: vi.fn(async (_sessionId: string, _profile: string, history: any[]) => history),
}))

vi.mock('../../packages/server/src/db/hermes/session-store', () => ({
  addMessage: addMessageMock,
  clearSessionMessages: vi.fn(),
  createSession: createSessionMock,
  getSession: getSessionMock,
  renameSession: vi.fn(),
  updateSessionStats: updateSessionStatsMock,
}))

vi.mock('../../packages/server/src/services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../packages/server/src/services/hermes/run-chat/compression', () => ({
  buildDbHistory: compressionMocks.buildDbHistory,
  buildSnapshotAwareHistory: compressionMocks.buildSnapshotAwareHistory,
  estimateSnapshotAwareHistoryUsage: vi.fn(),
  forceCompressBridgeHistory: vi.fn(),
  getOrCreateSession: vi.fn((_map: Map<string, any>, sessionId: string) => _map.get(sessionId)),
  replaceState: vi.fn(),
}))

vi.mock('../../packages/server/src/services/hermes/run-chat/usage', () => ({
  calcAndUpdateUsage: vi.fn(),
  contextTokensWithCachedOverhead: vi.fn(),
  estimateUsageTokensFromMessages: vi.fn((messages: any[]) => ({
    inputTokens: messages.filter(message => message.role === 'user').reduce((sum, message) => sum + Math.ceil(String(message.content || '').length / 4), 0),
    outputTokens: messages.filter(message => message.role !== 'user').reduce((sum, message) => sum + Math.ceil(String(message.content || '').length / 4), 0),
  })),
  updateMessageContextTokenUsage: vi.fn(),
}))

vi.mock('../../packages/server/src/services/hermes/run-chat/abort', () => ({
  handleAbort: vi.fn(),
}))

vi.mock('../../packages/server/src/services/hermes/run-chat/bridge-message', () => ({
  flushBridgePendingToDb: vi.fn(),
}))

function makeContext(state: any, commandResult: Record<string, unknown> = {
  handled: true,
  message: '[IMPORTANT: expanded plan skill prompt]',
}) {
  const namespaceEmit = vi.fn()
  const nsp = {
    to: vi.fn(() => ({ emit: namespaceEmit })),
    adapter: { rooms: new Map([['session:session-1', new Set(['socket-1'])]]) },
  }
  const socket = {
    id: 'socket-1',
    connected: true,
    join: vi.fn(),
    emit: vi.fn(),
  }
  const sessionMap = new Map([['session-1', state]])
  const runQueuedItem = vi.fn()
  const bridge: any = {
    command: vi.fn(async () => commandResult),
    chat: vi.fn(async () => ({ ok: true, run_id: 'btw-run-id', session_id: 'tmp-btw', status: 'running' })),
    streamOutput: vi.fn(async function* () {
      yield { ok: true, run_id: 'btw-run-id', session_id: 'tmp-btw', status: 'complete', delta: 'side answer', cursor: 11, output: 'side answer', done: true, events: [], event_cursor: 0 }
    }),
    destroy: vi.fn(async () => ({ ok: true })),
    mcpReload: vi.fn(async () => ({ ok: true, message: 'MCP servers reloaded' })),
    reloadSkills: vi.fn(async () => ({
      ok: true,
      action: 'reload-skills',
      added: [{ name: 'demo-external-skill', description: 'Demo skill' }],
      removed: [],
      unchanged: [],
      total: 1,
      commands: 1,
    })),
    status: vi.fn(async () => ({
      exists: true,
      running: false,
      current_run_id: null,
      message_count: 0,
    })),
  }
  return { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket }
}

describe('plan session command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    compressionMocks.buildDbHistory.mockResolvedValue([])
    compressionMocks.buildSnapshotAwareHistory.mockImplementation(async (_sessionId: string, _profile: string, history: any[]) => history)
    getSessionMock.mockReturnValue({ id: 'session-1', profile: 'default', source: 'cli' })
  })

  it('queues running plan commands once without visible command echo', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/plan build the feature')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'client-queue-id',
      runQueuedItem,
    })

    expect(addMessageMock).not.toHaveBeenCalled()
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(state.queue).toEqual([expect.objectContaining({
      queue_id: 'client-queue-id',
      input: '[IMPORTANT: expanded plan skill prompt]',
      displayInput: '/plan build the feature',
      displayRole: 'command',
      storageMessage: '/plan build the feature',
    })])
    expect(namespaceEmit).toHaveBeenCalledWith('run.queued', expect.objectContaining({
      queue_length: 1,
      queued_messages: [expect.objectContaining({
        id: 'client-queue-id',
        role: 'command',
        content: '/plan build the feature',
        queued: true,
      })],
    }))
    expect(namespaceEmit).not.toHaveBeenCalledWith('session.command', expect.anything())
  })

  it('creates a new slash-command session with a command-derived title', async () => {
    getSessionMock.mockReturnValueOnce(null)
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'set',
      message: 'Goal set.',
      kickoff_prompt: 'build a todo app',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal build a todo app')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(createSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      id: 'session-1',
      profile: 'default',
      source: 'cli',
      title: '[goal] build a todo app',
    }))
  })

  it('starts an idle /skill command with expanded storage and visible command display', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'skill',
      message: '[IMPORTANT: expanded skill prompt]',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/skill github-pr-review check PR 123')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'work',
      queueId: 'skill-queue-id',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', '/github-pr-review check PR 123', 'work')
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      role: 'command',
      content: '/skill github-pr-review check PR 123',
    }))
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      content: '[IMPORTANT: expanded skill prompt]',
    }))
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      action: 'skill',
      started: true,
    }))
    expect(runQueuedItem).toHaveBeenCalledWith(socket, 'session-1', expect.objectContaining({
      queue_id: 'skill-queue-id',
      input: '[IMPORTANT: expanded skill prompt]',
      displayInput: '/skill github-pr-review check PR 123',
      displayRole: 'command',
      storageMessage: '[IMPORTANT: expanded skill prompt]',
      profile: 'work',
    }), 'work')
  })

  it('queues /skill commands while the bridge session is running', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'skill',
      message: '[IMPORTANT: expanded skill prompt]',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/skill review follow up')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'queued-skill',
      runQueuedItem,
    })

    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(bridge.command).toHaveBeenCalledWith('session-1', '/review follow up', 'default')
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      role: 'command',
      content: '/skill review follow up',
    }))
    expect(state.queue).toEqual([expect.objectContaining({
      queue_id: 'queued-skill',
      input: '[IMPORTANT: expanded skill prompt]',
      displayInput: '/skill review follow up',
      displayRole: 'command',
      storageMessage: '[IMPORTANT: expanded skill prompt]',
    })])
    expect(namespaceEmit).toHaveBeenCalledWith('run.queued', expect.objectContaining({
      queued_messages: [expect.objectContaining({
        id: 'queued-skill',
        role: 'command',
        content: '/skill review follow up',
      })],
    }))
  })

  it('starts an idle /learn command with generated prompt input and command storage', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'learn',
      message: '[IMPORTANT: expanded learn prompt]',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/learn from docs/workflow.md')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'work',
      queueId: 'learn-queue-id',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', '/learn from docs/workflow.md', 'work')
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      role: 'command',
      content: '/learn from docs/workflow.md',
    }))
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      content: '[IMPORTANT: expanded learn prompt]',
    }))
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      action: 'learn',
      started: true,
    }))
    expect(runQueuedItem).toHaveBeenCalledWith(socket, 'session-1', expect.objectContaining({
      queue_id: 'learn-queue-id',
      input: '[IMPORTANT: expanded learn prompt]',
      displayInput: '/learn from docs/workflow.md',
      displayRole: 'command',
      storageMessage: '/learn from docs/workflow.md',
      profile: 'work',
    }), 'work')
  })

  it('queues /learn commands while the bridge session is running', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'learn',
      message: '[IMPORTANT: expanded learn prompt]',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/learn the workflow we just performed')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'queued-learn',
      runQueuedItem,
    })

    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(bridge.command).toHaveBeenCalledWith('session-1', '/learn the workflow we just performed', 'default')
    expect(addMessageMock).not.toHaveBeenCalledWith(expect.objectContaining({
      role: 'command',
      content: '/learn the workflow we just performed',
    }))
    expect(state.queue).toEqual([expect.objectContaining({
      queue_id: 'queued-learn',
      input: '[IMPORTANT: expanded learn prompt]',
      displayInput: '/learn the workflow we just performed',
      displayRole: 'command',
      storageMessage: '/learn the workflow we just performed',
    })])
    expect(namespaceEmit).toHaveBeenCalledWith('run.queued', expect.objectContaining({
      queued_messages: [expect.objectContaining({
        id: 'queued-learn',
        role: 'command',
        content: '/learn the workflow we just performed',
      })],
    }))
  })

  it('accepts bare /learn and sends an empty argument to the bridge', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: true,
      type: 'learn',
      message: '[IMPORTANT: expanded bare learn prompt]',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/learn')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'bare-learn',
      runQueuedItem,
    })

    expect(command).toEqual(expect.objectContaining({ name: 'learn', rawName: 'learn', args: '' }))
    expect(bridge.command).toHaveBeenCalledWith('session-1', '/learn', 'default')
    expect(runQueuedItem).toHaveBeenCalledWith(socket, 'session-1', expect.objectContaining({
      queue_id: 'bare-learn',
      input: '[IMPORTANT: expanded bare learn prompt]',
      displayInput: '/learn',
      storageMessage: '/learn',
    }), 'default')
  })

  it('reports unsupported /learn without starting a run', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, nsp, runQueuedItem, sessionMap, socket } = makeContext(state, {
      handled: false,
      type: 'learn',
      message: '/learn requires a newer Hermes Agent runtime with agent.learn_prompt.',
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/learn from docs')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', '/learn from docs', 'default')
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'learn',
      ok: false,
      action: 'learn',
      message: '/learn requires a newer Hermes Agent runtime with agent.learn_prompt.',
    }))
  })

  it('keeps the client known-command registry accepted by the server parser', async () => {
    const { BRIDGE_SESSION_COMMAND_NAMES, isKnownBridgeSessionCommand } = await import('../../packages/client/src/utils/hermes/bridge-session-commands')
    const { parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')

    for (const commandName of BRIDGE_SESSION_COMMAND_NAMES) {
      expect(isKnownBridgeSessionCommand(`/${commandName}`)).toBe(true)
      const parsed = parseSessionCommand(`/${commandName}`)
      expect(parsed).not.toBeNull()
      if (commandName === 'fork') {
        expect(parsed).toEqual(expect.objectContaining({ name: 'branch', rawName: 'fork' }))
      } else {
        expect(parsed).toEqual(expect.objectContaining({ name: commandName }))
      }
    }

    expect(isKnownBridgeSessionCommand('/reload_skills')).toBe(true)
    expect(isKnownBridgeSessionCommand('/learn something')).toBe(true)
    expect(parseSessionCommand('/learn from docs')).toEqual(expect.objectContaining({
      name: 'learn',
      rawName: 'learn',
      args: 'from docs',
    }))
    expect(parseSessionCommand('/reload_skills')).toEqual(expect.objectContaining({
      name: 'reload-skills',
      rawName: 'reload_skills',
    }))
  })

  it('returns null for unknown slash commands so bridge runs can pass them through', async () => {
    const { isSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')

    expect(parseSessionCommand('/not-a-command test')).toBeNull()
    expect(isSessionCommand('/not-a-command test')).toBe(false)
  })

  it('starts an idle goal command as a hidden kickoff run', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'set',
      message: 'Goal set.',
      kickoff_prompt: 'fix the tests',
      max_turns: 20,
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal fix the tests')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'goal-queue-id',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', 'goal fix the tests', 'default')
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      action: 'set',
      message: 'Goal set.',
      terminal: false,
      started: true,
    }))
    expect(runQueuedItem).toHaveBeenCalledWith(socket, 'session-1', expect.objectContaining({
      queue_id: 'goal-queue-id',
      input: 'fix the tests',
      displayInput: null,
      storageMessage: 'fix the tests',
      source: 'cli',
    }), 'default')
  })

  it('clears queued goal continuations when pausing a goal', async () => {
    const state = {
      messages: [],
      isWorking: true,
      events: [],
      queue: [
        { queue_id: 'goal-1', input: 'continue', displayInput: null, storageMessage: 'continue', profile: 'default', goalContinuation: true },
        { queue_id: 'user-1', input: 'user message', profile: 'default' },
      ],
    }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'pause',
      message: 'Goal paused.',
      clear_goal_continuations: true,
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal pause')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(state.queue).toEqual([expect.objectContaining({ queue_id: 'user-1' })])
    expect(namespaceEmit).toHaveBeenCalledWith('run.queued', expect.objectContaining({
      queue_length: 1,
      queued_messages: [expect.objectContaining({ id: 'user-1', content: 'user message' })],
    }))
  })

  it('emits a goal-specific clear action for goal done', async () => {
    const state = {
      messages: [],
      isWorking: false,
      events: [],
      queue: [
        { queue_id: 'goal-1', input: 'continue', displayInput: null, storageMessage: 'continue', profile: 'default', goalContinuation: true },
      ],
    }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'clear',
      message: 'Goal cleared.',
      clear_goal_continuations: true,
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal done')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', 'goal done', 'default')
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(state.queue).toEqual([])
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'goal',
      action: 'goal_clear',
      message: 'Goal cleared.',
      terminal: true,
      started: false,
    }))
  })

  it('starts a resumed goal as a hidden continuation run', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'resume',
      message: 'Goal resumed.',
      kickoff_prompt: '[Continuing toward your standing goal]\nGoal: fix the tests',
      max_turns: 20,
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal resume')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      queueId: 'resume-queue-id',
      runQueuedItem,
    })

    expect(bridge.command).toHaveBeenCalledWith('session-1', 'goal resume', 'default')
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      action: 'resume',
      message: 'Goal resumed.',
      terminal: false,
      started: true,
    }))
    expect(runQueuedItem).toHaveBeenCalledWith(socket, 'session-1', expect.objectContaining({
      queue_id: 'resume-queue-id',
      input: '[Continuing toward your standing goal]\nGoal: fix the tests',
      displayInput: null,
      storageMessage: '[Continuing toward your standing goal]\nGoal: fix the tests',
      source: 'cli',
    }), 'default')
  })

  it('includes bridge run state in goal status output', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state, {
      handled: true,
      type: 'goal',
      action: 'goal_status',
      message: 'Goal (active, 0/20 turns): build docs',
    })
    bridge.status.mockResolvedValueOnce({
      exists: true,
      running: true,
      current_run_id: 'run-123',
      message_count: 4,
    })
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/goal status')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      action: 'goal_status',
      message: 'Goal (active, 0/20 turns): build docs\nCurrent turn: 1/20 running (completed turns: 0/20; count updates after the judge).\nRun: running (run-123)',
      bridgeStatus: expect.objectContaining({
        running: true,
        currentRunId: 'run-123',
      }),
    }))
  })

  it('runs /btw prompts as ephemeral side questions in the current session context', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/btw summarize docs')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      model: 'gpt-test',
      provider: 'openai',
      queueId: 'btw-queue-id',
      runQueuedItem,
    })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(command.name).toBe('btw')
    expect(addMessageMock).not.toHaveBeenCalled()
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'btw',
      action: 'btw',
      started: true,
      terminal: false,
      ephemeral: true,
      sideQuestionId: expect.stringMatching(/^btw_/),
      prompt: 'summarize docs',
    }))
    expect(bridge.chat).toHaveBeenCalledWith(
      expect.stringMatching(/^session-1__btw_/),
      expect.stringContaining('<side_question>\nsummarize docs\n</side_question>'),
      expect.anything(),
      expect.stringContaining('Answer only the side question itself'),
      'default',
      expect.objectContaining({
        model: 'gpt-test',
        provider: 'openai',
        persist: false,
        workerKey: expect.stringMatching(/^btw_btw_/),
      }),
    )
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'btw',
      action: 'btw',
      delta: 'side answer',
    }))
  })

  it('trims /btw history before starting the temporary side-question run', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const longHistory = Array.from({ length: 80 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index} ${'x'.repeat(2000)}`,
      tool_calls: [{ id: `call-${index}`, type: 'function', function: { name: 'tool', arguments: '{}' } }],
    }))
    ;(compressionMocks.buildDbHistory as any).mockResolvedValue(longHistory)
    compressionMocks.buildSnapshotAwareHistory.mockImplementation(async (_sessionId: string, _profile: string, history: any[]) => history)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/btw summarize docs')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      model: 'gpt-test',
      provider: 'openai',
      runQueuedItem,
    })
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(bridge.chat).toHaveBeenCalled()
    const historyArg = bridge.chat.mock.calls[0][2]
    expect(historyArg.length).toBeLessThanOrEqual(32)
    expect(historyArg.length).toBeLessThan(longHistory.length)
    expect(historyArg.every((message: any) => message.role === 'user' || message.role === 'assistant')).toBe(true)
    expect(historyArg.every((message: any) => !('tool_calls' in message))).toBe(true)
  })

  it('drops the active foreground turn from /btw context history', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const history = [
      { role: 'user', content: 'older question' },
      { role: 'assistant', content: 'older answer' },
      { role: 'user', content: 'current foreground task about KISA streaming' },
      { role: 'assistant', content: 'current foreground answer details' },
    ]
    ;(compressionMocks.buildDbHistory as any).mockResolvedValue(history)
    compressionMocks.buildSnapshotAwareHistory.mockImplementation(async (_sessionId: string, _profile: string, inputHistory: any[]) => inputHistory)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/btw 너는 누구야')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })
    await new Promise(resolve => setTimeout(resolve, 200))

    expect(bridge.chat).toHaveBeenCalled()
    const historyArg = bridge.chat.mock.calls[0][2]
    expect(historyArg).toEqual([
      expect.objectContaining({ role: 'user', content: 'older question' }),
      expect.objectContaining({ role: 'assistant', content: 'older answer' }),
    ])
    expect(JSON.stringify(historyArg)).not.toContain('KISA streaming')
    expect(JSON.stringify(historyArg)).not.toContain('current foreground answer details')
  })

  it('rejects /background without a prompt', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/background')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: {} as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'background',
      ok: false,
      action: 'background',
      message: 'Usage: /background <prompt>',
    }))
  })

  it('rejects MCP reload while the session is running', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/reload-mcp github')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(bridge.mcpReload).not.toHaveBeenCalled()
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'reload-mcp',
      ok: false,
      action: 'reload-mcp',
      terminal: false,
      message: 'MCP reload can only run while the session is idle. Wait for the current run to finish or abort it first.',
    }))
  })

  it('reloads skills while idle without queuing a model run', async () => {
    const state = { messages: [], isWorking: false, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/reload-skills')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(bridge.reloadSkills).toHaveBeenCalledWith('default')
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(state.queue).toEqual([])
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'reload-skills',
      action: 'reload-skills',
      message: 'Skills reloaded successfully.\nAdded skills:\n- demo-external-skill: Demo skill\nTotal skills: 1.',
    }))
  })

  it('rejects skills reload while the session is running', async () => {
    const state = { messages: [], isWorking: true, events: [], queue: [] }
    const { bridge, namespaceEmit, runQueuedItem, sessionMap, socket, nsp } = makeContext(state)
    const { handleSessionCommand, parseSessionCommand } = await import('../../packages/server/src/services/hermes/run-chat/session-command')
    const command = parseSessionCommand('/reload-skills')!

    await handleSessionCommand('session-1', command, {
      nsp: nsp as any,
      socket: socket as any,
      sessionMap,
      bridge: bridge as any,
      profile: 'default',
      runQueuedItem,
    })

    expect(bridge.reloadSkills).not.toHaveBeenCalled()
    expect(runQueuedItem).not.toHaveBeenCalled()
    expect(state.queue).toEqual([])
    expect(namespaceEmit).toHaveBeenCalledWith('session.command', expect.objectContaining({
      command: 'reload-skills',
      ok: false,
      action: 'reload-skills',
      terminal: false,
      message: 'Skills reload can only run while the session is idle. Wait for the current run to finish or abort it first.',
    }))
  })
})
