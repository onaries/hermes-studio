export type DrawerButtonPosition = 'top' | 'middle' | 'bottom'

export const DRAWER_BUTTON_POSITION_STORAGE_KEY = 'hermes_drawer_button_position'
export const DRAWER_BUTTON_TOP_OFFSET_PX = 88
export const DRAWER_BUTTON_BOTTOM_OFFSET_PX = 96
export const DRAWER_BUTTON_EDGE_MARGIN_PX = 44

export function isDrawerButtonPosition(value: unknown): value is DrawerButtonPosition {
  return value === 'top' || value === 'middle' || value === 'bottom'
}

export function loadDrawerButtonPosition(storage: Storage | null | undefined): DrawerButtonPosition {
  try {
    const stored = storage?.getItem(DRAWER_BUTTON_POSITION_STORAGE_KEY)
    return isDrawerButtonPosition(stored) ? stored : 'middle'
  } catch {
    return 'middle'
  }
}

export function saveDrawerButtonPosition(
  storage: Storage | null | undefined,
  position: DrawerButtonPosition,
): void {
  try {
    storage?.setItem(DRAWER_BUTTON_POSITION_STORAGE_KEY, position)
  } catch {
    // Ignore unavailable storage (private mode/tests).
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return Math.max(0, value)
  return Math.min(max, Math.max(min, value))
}

export function drawerButtonAnchorY(position: DrawerButtonPosition, containerHeight: number): number {
  const safeHeight = Number.isFinite(containerHeight) && containerHeight > 0 ? containerHeight : 0
  const minY = Math.min(DRAWER_BUTTON_EDGE_MARGIN_PX, Math.max(0, safeHeight / 2))
  const maxY = Math.max(minY, safeHeight - DRAWER_BUTTON_EDGE_MARGIN_PX)

  if (position === 'top') {
    return clamp(DRAWER_BUTTON_TOP_OFFSET_PX, minY, maxY)
  }
  if (position === 'bottom') {
    return clamp(safeHeight - DRAWER_BUTTON_BOTTOM_OFFSET_PX, minY, maxY)
  }
  return clamp(safeHeight / 2, minY, maxY)
}

export function snapDrawerButtonPosition(y: number, containerHeight: number): DrawerButtonPosition {
  const candidates: DrawerButtonPosition[] = ['top', 'middle', 'bottom']
  let best: DrawerButtonPosition = 'middle'
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const distance = Math.abs(y - drawerButtonAnchorY(candidate, containerHeight))
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}
