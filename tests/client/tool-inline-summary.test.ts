import { describe, expect, it } from 'vitest'
import { buildToolInlineSummary } from '@/utils/tool-inline-summary'

const t = (key: string, params?: Record<string, unknown>) => {
  const templates: Record<string, string> = {
    'chat.toolSummary.query': 'Query: {value}',
    'chat.toolSummary.path': 'Path: {value}',
    'chat.toolSummary.url': 'URL: {value}',
    'chat.toolSummary.command': 'Command: {value}',
    'chat.toolSummary.pattern': 'Pattern: {value}',
    'chat.toolSummary.action': 'Action: {value}',
    'chat.toolSummary.items': '{count} items',
    'chat.toolSummary.urls': '{count} URLs',
    'chat.toolSummary.results': '{count} results',
    'chat.toolSummary.matches': '{count} matches',
    'chat.toolSummary.files': '{count} files',
    'chat.toolSummary.success': 'Success',
    'chat.toolSummary.failure': 'Failed',
    'chat.toolSummary.exitCode': 'Exit {code}',
    'chat.toolSummary.status': 'Status: {value}',
    'chat.toolSummary.output': 'Output: {value}',
    'chat.toolSummary.topResult': 'Top: {value}',
    'chat.toolSummary.code': 'Code: {value}',
    'chat.toolSummary.goal': 'Goal: {value}',
    'chat.toolSummary.tasks': '{count} tasks',
    'chat.toolSummary.text': 'Text: {value}',
    'chat.toolSummary.target': 'Target: {value}',
    'chat.toolSummary.key': 'Key: {value}',
    'chat.toolSummary.direction': 'Direction: {value}',
  }
  let out = templates[key] || key
  for (const [param, value] of Object.entries(params || {})) {
    out = out.replace(`{${param}}`, String(value))
  }
  return out
}

describe('buildToolInlineSummary', () => {
  it('shows a concise web search query and result count', () => {
    const summary = buildToolInlineSummary(
      'web_search',
      { query: 'Hermes Studio updater signing' },
      { results: [{ title: 'Electron code signing guide' }, { title: 'Notarization' }] },
      undefined,
      t,
    )

    expect(summary).toContain('Query: Hermes Studio updater signing')
    expect(summary).toContain('2 results')
    expect(summary).toContain('Top: Electron code signing guide')
  })

  it('summarizes terminal commands with exit code and first output line', () => {
    const summary = buildToolInlineSummary(
      'terminal',
      { command: 'npm run harness:check' },
      { exit_code: 0, output: 'Harness check passed\nextra logs' },
      undefined,
      t,
    )

    expect(summary).toContain('Command: npm run harness:check')
    expect(summary).toContain('Exit 0')
    expect(summary).toContain('Output: Harness check passed')
  })

  it('falls back to existing preview without exposing raw JSON braces', () => {
    const summary = buildToolInlineSummary(
      'custom_tool',
      undefined,
      undefined,
      'short preview text',
      t,
    )

    expect(summary).toBe('short preview text')
  })
})
