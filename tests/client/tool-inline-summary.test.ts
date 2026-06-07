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

  it('summarizes terminal commands as the command only', () => {
    const summary = buildToolInlineSummary(
      'terminal',
      { command: 'npm run harness:check' },
      { exit_code: 0, output: 'Harness check passed\nextra logs' },
      undefined,
      t,
    )

    expect(summary).toBe('npm run harness:check')
  })

  it('shows read/write file paths without labels', () => {
    expect(buildToolInlineSummary(
      'read_file',
      { path: '/Users/safemotion/project/package.json' },
      { content: '{"name":"demo"}' },
      undefined,
      t,
    )).toBe('/Users/safemotion/project/package.json')

    expect(buildToolInlineSummary(
      'write_file',
      { path: '/Users/safemotion/project/README.md' },
      { bytes_written: 42 },
      undefined,
      t,
    )).toBe('/Users/safemotion/project/README.md')
  })

  it('shows skill_view skill names', () => {
    const summary = buildToolInlineSummary(
      'skill_view',
      { name: 'hermes-webui-maintenance' },
      { success: true, content: 'long skill content' },
      undefined,
      t,
    )

    expect(summary).toBe('hermes-webui-maintenance')
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
