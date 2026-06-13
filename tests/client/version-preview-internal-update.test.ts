import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../..')

function read(path: string): string {
  return readFileSync(resolve(root, path), 'utf-8')
}

describe('version preview internal update wiring', () => {
  it('exposes a protected apply endpoint for prepared preview code', () => {
    const routes = read('packages/server/src/routes/update.ts')
    const controller = read('packages/server/src/controllers/update.ts')

    expect(routes).toContain("/api/hermes/update/preview/apply")
    expect(routes).toContain('requireSuperAdmin, ctrl.applyPreview')
    expect(controller).toContain('export async function applyPreview')
    expect(controller).toContain("runNpmAsync(['run', 'build']")
    expect(controller).toContain("runNpmAsync(['pack', '--pack-destination', packDir, '--ignore-scripts']")
    expect(controller).toContain("runNpmAsync(['install', '-g', tarballPath]")
    expect(controller).toContain('scheduleServerRestart()')
  })

  it('wires the Version Preview UI to the apply action', () => {
    const api = read('packages/client/src/api/hermes/system.ts')
    const view = read('packages/client/src/components/hermes/settings/GithubPreviewSettings.vue')

    expect(api).toContain('export async function applyPreview')
    expect(api).toContain("/api/hermes/update/preview/apply")
    expect(view).toContain('applyPreview')
    expect(view).toContain("activeAction === 'apply'")
    expect(view).toContain("t('githubPreview.apply')")
    expect(view).toContain("githubPreview.applySuccess")
  })
})
