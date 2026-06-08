const LOCAL_WEBUI_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1'])

export function isLocalWebUiOrigin(origin: string | undefined, port: number): boolean {
  if (!origin) return false
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    if (!LOCAL_WEBUI_HOSTS.has(parsed.hostname)) return false
    return parsed.port === String(port)
  } catch {
    return false
  }
}

export function shouldGrantDesktopPermission(permission: string, origin: string | undefined, port: number): boolean {
  return permission === 'notifications' && isLocalWebUiOrigin(origin, port)
}
