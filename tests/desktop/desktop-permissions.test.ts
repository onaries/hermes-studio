import { describe, expect, it } from 'vitest'
import { isLocalWebUiOrigin, shouldGrantDesktopPermission } from '../../packages/desktop/src/main/desktop-permissions'

describe('desktop notification permissions', () => {
  it('grants notifications for the packaged local WebUI origin', () => {
    expect(shouldGrantDesktopPermission('notifications', 'http://127.0.0.1:8748', 8748)).toBe(true)
    expect(shouldGrantDesktopPermission('notifications', 'http://localhost:8748', 8748)).toBe(true)
  })

  it('rejects non-notification permissions and non-desktop origins', () => {
    expect(shouldGrantDesktopPermission('media', 'http://127.0.0.1:8748', 8748)).toBe(false)
    expect(shouldGrantDesktopPermission('notifications', 'http://127.0.0.1:8648', 8748)).toBe(false)
    expect(shouldGrantDesktopPermission('notifications', 'https://example.com', 8748)).toBe(false)
    expect(shouldGrantDesktopPermission('notifications', undefined, 8748)).toBe(false)
  })

  it('requires an exact configured desktop port', () => {
    expect(isLocalWebUiOrigin('http://127.0.0.1:9000', 9000)).toBe(true)
    expect(isLocalWebUiOrigin('http://127.0.0.1:9001', 9000)).toBe(false)
  })
})
