import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createShutdownHandler,
  getShutdownForceExitMs,
  shouldForceRestartWithCodingAgents,
  shouldStopAgentBridgeOnShutdown,
  shouldStopManagedGatewaysOnShutdown,
} from '../../packages/server/src/services/shutdown'

describe('shutdown bridge policy', () => {
  const originalValue = process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN
  const originalGatewayValue = process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN
  const originalNodeEnv = process.env.NODE_ENV
  const originalDesktop = process.env.HERMES_DESKTOP
  const originalForceExitMs = process.env.HERMES_WEB_UI_SHUTDOWN_FORCE_EXIT_MS
  const originalForceCodingAgentRestart = process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS
  const originalForceActiveRunsRestart = process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS

  afterEach(() => {
    if (originalValue === undefined) delete process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN
    else process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN = originalValue
    if (originalGatewayValue === undefined) delete process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN
    else process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN = originalGatewayValue
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalDesktop === undefined) delete process.env.HERMES_DESKTOP
    else process.env.HERMES_DESKTOP = originalDesktop
    if (originalForceExitMs === undefined) delete process.env.HERMES_WEB_UI_SHUTDOWN_FORCE_EXIT_MS
    else process.env.HERMES_WEB_UI_SHUTDOWN_FORCE_EXIT_MS = originalForceExitMs
    if (originalForceCodingAgentRestart === undefined) delete process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS
    else process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS = originalForceCodingAgentRestart
    if (originalForceActiveRunsRestart === undefined) delete process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS
    else process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS = originalForceActiveRunsRestart
  })

  it('stops the bridge for restart and service shutdown signals by default', () => {
    delete process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN

    expect(shouldStopAgentBridgeOnShutdown('SIGUSR2')).toBe(true)
    expect(shouldStopAgentBridgeOnShutdown('SIGTERM')).toBe(true)
    expect(shouldStopAgentBridgeOnShutdown('SIGINT')).toBe(true)
  })

  it('allows operators to force either bridge shutdown policy', () => {
    process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN = '1'
    expect(shouldStopAgentBridgeOnShutdown('SIGUSR2')).toBe(true)

    process.env.HERMES_AGENT_BRIDGE_STOP_ON_SHUTDOWN = '0'
    expect(shouldStopAgentBridgeOnShutdown('SIGUSR2')).toBe(false)
    expect(shouldStopAgentBridgeOnShutdown('SIGTERM')).toBe(false)
  })

  it('stops managed gateways by default in production only', () => {
    delete process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN

    process.env.NODE_ENV = 'development'
    expect(shouldStopManagedGatewaysOnShutdown()).toBe(false)

    process.env.NODE_ENV = 'production'
    expect(shouldStopManagedGatewaysOnShutdown()).toBe(true)
  })

  it('allows operators to force either managed gateway shutdown policy', () => {
    process.env.NODE_ENV = 'development'
    process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN = '1'
    expect(shouldStopManagedGatewaysOnShutdown()).toBe(true)

    process.env.NODE_ENV = 'production'
    process.env.HERMES_WEB_UI_STOP_GATEWAYS_ON_SHUTDOWN = '0'
    expect(shouldStopManagedGatewaysOnShutdown()).toBe(false)
  })

  it('allows forcing restart while coding agents are active only through an explicit opt-in', () => {
    delete process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS
    expect(shouldForceRestartWithCodingAgents()).toBe(false)

    process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS = '1'
    expect(shouldForceRestartWithCodingAgents()).toBe(true)

    process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS = 'false'
    expect(shouldForceRestartWithCodingAgents()).toBe(false)

    process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS = '1'
    expect(shouldForceRestartWithCodingAgents()).toBe(true)
  })

  it('skips desktop restart while a normal chat run is active', async () => {
    delete process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_CODING_AGENTS
    delete process.env.HERMES_WEB_UI_FORCE_RESTART_WITH_ACTIVE_RUNS
    const close = vi.fn()
    const handler = createShutdownHandler(
      { close },
      undefined,
      {
        hasActiveRuns: () => true,
        activeRunSummary: () => [{ sessionId: 'chat-session-1', source: 'cli', profile: 'default', queueLength: 0 }],
      },
    )

    await handler('SIGUSR2')

    expect(close).not.toHaveBeenCalled()
  })

  it('keeps desktop shutdown force-exit timing long enough for runtime cleanup by default', () => {
    delete process.env.HERMES_WEB_UI_SHUTDOWN_FORCE_EXIT_MS

    delete process.env.HERMES_DESKTOP
    expect(getShutdownForceExitMs()).toBe(15_000)

    process.env.HERMES_DESKTOP = 'true'
    expect(getShutdownForceExitMs()).toBe(15_000)
  })

  it('allows operators to override shutdown force-exit timing', () => {
    process.env.HERMES_DESKTOP = 'true'
    process.env.HERMES_WEB_UI_SHUTDOWN_FORCE_EXIT_MS = '7000'

    expect(getShutdownForceExitMs()).toBe(7_000)
  })
})
