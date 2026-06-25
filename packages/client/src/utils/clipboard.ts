/**
 * Copy text or rich content to clipboard with fallbacks for non-secure contexts
 * (HTTP, non-localhost). `navigator.clipboard` is only available in secure
 * contexts; intranet HTTP deployments must fall back to the legacy
 * `document.execCommand('copy')` flow.
 */
export interface ClipboardContent {
  text: string
  html?: string
}

function legacyCopyText(text: string): boolean {
  if (typeof document === 'undefined') return false

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '0'
  textarea.style.left = '0'
  textarea.style.width = '1px'
  textarea.style.height = '1px'
  textarea.style.padding = '0'
  textarea.style.border = 'none'
  textarea.style.outline = 'none'
  textarea.style.boxShadow = 'none'
  textarea.style.background = 'transparent'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)

  let ok = false
  try {
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    document.body.removeChild(textarea)
  }
  return ok
}

function legacyCopyHtml(html: string, text: string): boolean {
  if (typeof document === 'undefined') return false

  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '1px'
  container.style.height = '1px'
  container.style.padding = '0'
  container.style.border = 'none'
  container.style.outline = 'none'
  container.style.boxShadow = 'none'
  container.style.background = 'transparent'
  container.style.opacity = '0'
  container.style.overflow = 'hidden'
  container.innerHTML = html
  document.body.appendChild(container)

  const selection = window.getSelection?.()
  const previousRanges: Range[] = []
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      previousRanges.push(selection.getRangeAt(index).cloneRange())
    }
  }

  let ok = false
  try {
    const range = document.createRange()
    range.selectNodeContents(container)
    selection?.removeAllRanges()
    selection?.addRange(range)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    selection?.removeAllRanges()
    for (const range of previousRanges) {
      selection?.addRange(range)
    }
    document.body.removeChild(container)
  }

  return ok || legacyCopyText(text)
}

export async function copyToClipboard(content: string | ClipboardContent): Promise<boolean> {
  const text = typeof content === 'string' ? content : content.text
  const html = typeof content === 'string' ? undefined : content.html

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    if (html && typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ])
        return true
      } catch {
        // fall through to plain text or legacy fallback
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to legacy fallback
    }
  }

  return html ? legacyCopyHtml(html, text) : legacyCopyText(text)
}
