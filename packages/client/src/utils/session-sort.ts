export interface SortableSession {
  id: string
  updatedAt?: number | null
  endedAt?: number | null
}

export function isSessionInProgress(
  session: SortableSession,
  isLiveSession?: (sessionId: string) => boolean,
): boolean {
  if (isLiveSession?.(session.id)) return true
  return session.endedAt == null
}

export function sortSessionsWithInProgressFirst<T extends SortableSession>(
  items: T[],
  isLiveSession?: (sessionId: string) => boolean,
): T[] {
  return [...items].sort((a, b) => {
    const activeDelta = Number(isSessionInProgress(b, isLiveSession)) - Number(isSessionInProgress(a, isLiveSession))
    if (activeDelta !== 0) return activeDelta
    return (b.updatedAt || 0) - (a.updatedAt || 0)
  })
}
