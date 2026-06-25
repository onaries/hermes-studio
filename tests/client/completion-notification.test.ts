// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showCompletionNotification } from '@/utils/completion-notification'

type NotificationInstance = {
  title: string
  options?: NotificationOptions
  onclick?: (() => void) | null
  close: ReturnType<typeof vi.fn>
}

describe('completion notification navigation', () => {
  let notifications: NotificationInstance[]
  let originalNotification: typeof Notification | undefined
  let originalServiceWorker: unknown
  let originalHermesDesktop: unknown

  beforeEach(() => {
    notifications = []
    originalNotification = window.Notification
    originalServiceWorker = navigator.serviceWorker
    originalHermesDesktop = (window as typeof window & { hermesDesktop?: unknown }).hermesDesktop

    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true })
    Object.defineProperty(window, 'focus', { configurable: true, value: vi.fn() })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined })
    window.location.hash = '#/hermes/chat'
    delete (window as typeof window & { hermesDesktop?: unknown }).hermesDesktop

    class FakeNotification {
      static permission: NotificationPermission = 'granted'
      title: string
      options?: NotificationOptions
      onclick: (() => void) | null = null
      close = vi.fn()

      constructor(title: string, options?: NotificationOptions) {
        this.title = title
        this.options = options
        notifications.push(this)
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: FakeNotification,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'Notification', { configurable: true, value: originalNotification })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: originalServiceWorker })
    if (originalHermesDesktop === undefined) {
      delete (window as typeof window & { hermesDesktop?: unknown }).hermesDesktop
    } else {
      ;(window as typeof window & { hermesDesktop?: unknown }).hermesDesktop = originalHermesDesktop
    }
    vi.restoreAllMocks()
  })

  it('stores the target URL in browser notification data and opens it on click', async () => {
    await expect(showCompletionNotification({
      title: 'Done',
      body: 'Finished',
      sessionId: 'session 1',
      targetUrl: '/#/hermes/session/session%201',
    })).resolves.toBe(true)

    expect(notifications).toHaveLength(1)
    expect(notifications[0].options?.data).toEqual({
      sessionId: 'session 1',
      targetUrl: '/#/hermes/session/session%201',
    })

    notifications[0].onclick?.()

    expect(window.location.hash).toBe('#/hermes/session/session%201')
    expect(notifications[0].close).toHaveBeenCalledTimes(1)
  })

  it('passes target URL and session id through the desktop bridge', async () => {
    const notifyCompletion = vi.fn().mockResolvedValue(true)
    ;(window as typeof window & { hermesDesktop?: unknown }).hermesDesktop = {
      isDesktop: true,
      notifyCompletion,
    }

    await expect(showCompletionNotification({
      title: 'Done',
      sessionId: 'session-2',
      targetUrl: '/#/hermes/session/session-2',
    })).resolves.toBe(true)

    expect(notifyCompletion).toHaveBeenCalledWith({
      title: 'Done',
      sessionId: 'session-2',
      targetUrl: '/#/hermes/session/session-2',
    })
  })
})
