import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf-8')
}

describe('desktop WebUI server output forwarding', () => {
  it('guards child output forwarding against closed process stdio pipes', () => {
    const source = read('packages/desktop/src/main/webui-server.ts')

    expect(source).toContain('isIgnorableProcessOutputError')
    expect(source).toContain("error.code === 'EPIPE'")
    expect(source).toContain("error.code === 'ERR_STREAM_DESTROYED'")
    expect(source).toContain('installProcessOutputGuards()')
    expect(source).toContain("writeProcessOutput('stdout'")
    expect(source).toContain("writeProcessOutput('stderr'")
    expect(source).not.toContain('process.stdout.write(`[webui] ${chunk}`)')
    expect(source).not.toContain('process.stderr.write(`[webui] ${chunk}`)')
  })
})
