// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  DRAWER_BUTTON_POSITION_STORAGE_KEY,
  drawerButtonAnchorY,
  loadDrawerButtonPosition,
  saveDrawerButtonPosition,
  snapDrawerButtonPosition,
} from '@/utils/drawer-button-position'

describe('drawer button position helpers', () => {
  it('loads a persisted drawer button magnet position with middle as fallback', () => {
    const storage = window.localStorage
    storage.removeItem(DRAWER_BUTTON_POSITION_STORAGE_KEY)

    expect(loadDrawerButtonPosition(storage)).toBe('middle')

    storage.setItem(DRAWER_BUTTON_POSITION_STORAGE_KEY, 'top')
    expect(loadDrawerButtonPosition(storage)).toBe('top')

    storage.setItem(DRAWER_BUTTON_POSITION_STORAGE_KEY, 'sideways')
    expect(loadDrawerButtonPosition(storage)).toBe('middle')
  })

  it('saves drawer button magnet positions', () => {
    const storage = window.localStorage

    saveDrawerButtonPosition(storage, 'bottom')

    expect(storage.getItem(DRAWER_BUTTON_POSITION_STORAGE_KEY)).toBe('bottom')
  })

  it('snaps drag positions to top, middle, or bottom anchors', () => {
    const height = 900

    expect(drawerButtonAnchorY('top', height)).toBe(88)
    expect(drawerButtonAnchorY('middle', height)).toBe(450)
    expect(drawerButtonAnchorY('bottom', height)).toBe(804)
    expect(snapDrawerButtonPosition(40, height)).toBe('top')
    expect(snapDrawerButtonPosition(460, height)).toBe('middle')
    expect(snapDrawerButtonPosition(860, height)).toBe('bottom')
  })
})
