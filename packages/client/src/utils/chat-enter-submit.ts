export function isMobileLikeInputDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const coarsePointer = typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false
  const touchPoints = navigator.maxTouchPoints || 0
  const userAgent = navigator.userAgent || ''
  return coarsePointer || touchPoints > 0 || /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
}

export function shouldSubmitOnEnter(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey'>,
  options: { isMobileLike?: boolean; mobileEnterToSend?: boolean },
): boolean {
  if (event.key !== 'Enter' || event.shiftKey) return false
  if (options.isMobileLike && options.mobileEnterToSend !== true) return false
  return true
}
