import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync('packages/client/src/components/hermes/chat/MessageList.vue', 'utf8')

describe('queued message panel editing', () => {
  it('renders queued messages as editable full text instead of truncated previews', () => {
    const file = source()

    expect(file).toContain('startQueuedEdit(message)')
    expect(file).toContain('saveQueuedEdit(message.id)')
    expect(file).toContain('chatStore.editQueuedMessage')
    expect(file).toContain('{{ message.content }}')
    expect(file).toContain('white-space: pre-wrap;')
    expect(file).toContain('overflow-wrap: anywhere;')
    expect(file).not.toContain('queuedPreview(')
  })

  it('hides the destructive remove button while a queued message is being edited', () => {
    const file = source()

    expect(file).toContain('v-if="editingQueuedMessageId !== message.id"')
    expect(file).toContain('class="queue-remove"')
    expect(file).toContain(':title="t(\'chat.removeQueuedMessage\')"')
  })
})
