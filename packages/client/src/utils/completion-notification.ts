interface CompletionNotificationPayload {
  title: string
  body?: string
  icon?: string
  tag?: string
  targetUrl?: string
  sessionId?: string
}

interface HermesDesktopBridge {
  isDesktop?: boolean
  notifyCompletion?: (payload: CompletionNotificationPayload) => Promise<boolean>
}

export interface CompletionNotificationPermissionResult {
  granted: boolean
  reason?: 'unsupported' | 'insecure' | 'denied'
}

type WindowWithHermesDesktop = Window & typeof globalThis & {
  hermesDesktop?: HermesDesktopBridge
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs)
    promise.then(
      value => {
        window.clearTimeout(timer)
        resolve(value)
      },
      () => {
        window.clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

function desktopBridge(): HermesDesktopBridge | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as WindowWithHermesDesktop).hermesDesktop
}

function supportsBrowserNotification(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function isBrowserNotificationSecureContext(): boolean {
  if (typeof window === 'undefined') return false
  return window.isSecureContext
}

function notificationTargetUrl(payload: CompletionNotificationPayload): string {
  if (payload.targetUrl?.startsWith('/#/hermes/')) return payload.targetUrl
  if (payload.sessionId) return `/#/hermes/session/${encodeURIComponent(payload.sessionId)}`
  return '/#/hermes/chat'
}

function openNotificationTarget(payload: CompletionNotificationPayload) {
  const targetUrl = notificationTargetUrl(payload)
  window.focus()
  const targetHash = targetUrl.startsWith('/#') ? targetUrl.slice(1) : targetUrl
  if (targetHash.startsWith('#/') && window.location.hash !== targetHash) {
    window.location.hash = targetHash
  }
}

function browserNotificationOptions(payload: CompletionNotificationPayload): NotificationOptions {
  return {
    body: payload.body,
    icon: payload.icon ? new URL(payload.icon, window.location.origin).href : undefined,
    tag: payload.tag,
    data: {
      targetUrl: notificationTargetUrl(payload),
      sessionId: payload.sessionId,
    },
  }
}

async function showServiceWorkerNotification(payload: CompletionNotificationPayload): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return false

  try {
    const registration = await withTimeout(
      navigator.serviceWorker.register('/notification-sw.js'),
      3000,
      null,
    )
    if (!registration) return false
    await withTimeout(navigator.serviceWorker.ready, 3000, registration)
    await registration.showNotification(payload.title, browserNotificationOptions(payload))
    return true
  } catch (err) {
    console.warn('Failed to show service worker notification:', err)
    return false
  }
}

export function isDesktopNotificationRuntime(): boolean {
  return desktopBridge()?.isDesktop === true
}

export async function requestCompletionNotificationPermission(): Promise<CompletionNotificationPermissionResult> {
  if (isDesktopNotificationRuntime()) return { granted: true }
  if (!supportsBrowserNotification()) return { granted: false, reason: 'unsupported' }
  if (!isBrowserNotificationSecureContext()) return { granted: false, reason: 'insecure' }
  if (Notification.permission === 'granted') return { granted: true }
  if (Notification.permission === 'denied') return { granted: false, reason: 'denied' }

  try {
    const permission = await withTimeout(
      Notification.requestPermission(),
      5000,
      'default' as NotificationPermission,
    )
    return permission === 'granted'
      ? { granted: true }
      : { granted: false, reason: permission === 'denied' ? 'denied' : 'unsupported' }
  } catch {
    return { granted: false, reason: 'unsupported' }
  }
}

export async function showCompletionNotification(payload: CompletionNotificationPayload): Promise<boolean> {
  const bridge = desktopBridge()
  if (bridge?.isDesktop && bridge.notifyCompletion) {
    try {
      return await bridge.notifyCompletion(payload)
    } catch (err) {
      console.warn('Failed to show desktop completion notification:', err)
      return false
    }
  }

  if (!supportsBrowserNotification() || !isBrowserNotificationSecureContext() || Notification.permission !== 'granted') {
    return false
  }

  try {
    if (await showServiceWorkerNotification(payload)) return true

    const notification = new Notification(payload.title, browserNotificationOptions(payload))
    notification.onclick = () => {
      openNotificationTarget(payload)
      notification.close()
    }
    return true
  } catch (err) {
    console.warn('Failed to show browser completion notification:', err)
    return false
  }
}
