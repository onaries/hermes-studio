import { describe, expect, it } from 'vitest'
import { isSessionInProgress, sortSessionsWithInProgressFirst } from '@/utils/session-sort'

describe('session sorting', () => {
  it('puts in-progress sessions before newer completed sessions', () => {
    const sessions = [
      { id: 'completed-new', updatedAt: 300, endedAt: 400 },
      { id: 'running-old', updatedAt: 100, endedAt: null },
      { id: 'completed-old', updatedAt: 200, endedAt: 250 },
    ]

    expect(sortSessionsWithInProgressFirst(sessions).map(session => session.id)).toEqual([
      'running-old',
      'completed-new',
      'completed-old',
    ])
  })

  it('keeps recency order within running and completed groups', () => {
    const sessions = [
      { id: 'running-old', updatedAt: 100, endedAt: null },
      { id: 'completed-old', updatedAt: 50, endedAt: 75 },
      { id: 'running-new', updatedAt: 200, endedAt: undefined },
      { id: 'completed-new', updatedAt: 300, endedAt: 350 },
    ]

    expect(sortSessionsWithInProgressFirst(sessions).map(session => session.id)).toEqual([
      'running-new',
      'running-old',
      'completed-new',
      'completed-old',
    ])
  })

  it('treats client live state as in-progress even when endedAt is present', () => {
    const sessions = [
      { id: 'completed-new', updatedAt: 300, endedAt: 400 },
      { id: 'live-old', updatedAt: 100, endedAt: 150 },
    ]

    expect(isSessionInProgress(sessions[1], id => id === 'live-old')).toBe(true)
    expect(sortSessionsWithInProgressFirst(sessions, id => id === 'live-old').map(session => session.id)).toEqual([
      'live-old',
      'completed-new',
    ])
  })
})
