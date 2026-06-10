import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = () => readFileSync('packages/client/src/views/hermes/HistoryView.vue', 'utf8')

describe('HistoryView mobile header layout', () => {
  it('stacks session title and workspace on mobile when a workspace is present', () => {
    const text = source()

    expect(text).toContain('class="header-title-stack"')
    expect(text).toContain("'has-workspace': historySession?.workspace")
    expect(text).toMatch(/\.header-title-stack\.has-workspace\s*\{[\s\S]*?flex-direction:\s*column;/)
    expect(text).toMatch(/\.header-title-stack\.has-workspace \.header-session-title\s*\{[\s\S]*?font-size:\s*13px;/)
    expect(text).toMatch(/\.header-title-stack\.has-workspace \.workspace-badge\s*\{[\s\S]*?font-size:\s*10px;/)
  })
})
