// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { extractGeneratedMessageArtifacts } from '@/utils/chat-artifact-references'

describe('chat artifact references', () => {
  it('extracts generated file links from assistant messages', () => {
    expect(extractGeneratedMessageArtifacts({
      role: 'assistant',
      content: 'Created [report.md](/tmp/report.md) and <a href="/tmp/chart.png">chart.png</a>',
    })).toEqual([
      { path: '/tmp/report.md', name: 'report.md' },
      { path: '/tmp/chart.png', name: 'chart.png' },
    ])
  })

  it('excludes user-uploaded file and image content blocks', () => {
    expect(extractGeneratedMessageArtifacts({
      role: 'user',
      content: JSON.stringify([
        { type: 'image', name: 'photo.png', path: '/Users/me/uploads/photo.png' },
        { type: 'file', name: 'brief.pdf', path: '/Users/me/uploads/brief.pdf' },
      ]),
    })).toEqual([])
  })

  it('excludes user markdown links even when they point to local files', () => {
    expect(extractGeneratedMessageArtifacts({
      role: 'user',
      content: 'Please inspect [input.csv](/Users/me/input.csv)',
    })).toEqual([])
  })
})
