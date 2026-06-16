import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf-8')
}

describe('local lean desktop build script', () => {
  it('packages desktop releases after pruning root dev dependencies and restores them', () => {
    const pkg = JSON.parse(read('package.json'))
    const script = read('scripts/build-desktop-local-lean.mjs')

    expect(pkg.scripts['build:desktop:mac:lean']).toContain('scripts/build-desktop-local-lean.mjs')
    expect(pkg.scripts['build:desktop:mac:lean']).toContain('--mac zip --arm64')
    expect(script).toContain("run('npm', ['prune', '--omit=dev', '--no-audit', '--no-fund'])")
    expect(script).toContain('restoreRuntimeRelease(runtimeReleaseSnapshot)')
    expect(script).toContain("run('npm', ['ci', '--include=dev', '--ignore-scripts'])")
    expect(script).toContain("runOptional('npm', ['rebuild', 'node-pty'])")
    expect(script).toContain('electron-builder')
    expect(script).toContain('CSC_IDENTITY_AUTO_DISCOVERY')
  })
})
