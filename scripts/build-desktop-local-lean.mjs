#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const rootDir = resolve(import.meta.dirname, '..')
const desktopDir = join(rootDir, 'packages', 'desktop')
const releaseDir = join(desktopDir, 'release')
const runtimeReleasePath = join(desktopDir, 'build', 'runtime-release.json')

const passthroughArgs = process.argv.slice(2).filter(arg => arg !== '--')
const options = {
  cleanRelease: !passthroughArgs.includes('--no-clean'),
  restoreDev: !passthroughArgs.includes('--no-restore-dev'),
}
const electronArgs = passthroughArgs.filter(arg => arg !== '--no-clean' && arg !== '--no-restore-dev')

function defaultElectronArgs() {
  if (process.platform === 'darwin') {
    return ['--mac', 'zip', '--arm64', '--publish', 'never', '--config.mac.notarize=false']
  }
  if (process.platform === 'win32') {
    return ['--win', 'nsis', '--x64', '--publish', 'never']
  }
  return ['--linux', 'AppImage', '--x64', '--publish', 'never']
}

function run(command, args, opts = {}) {
  console.log(`\n$ ${[command, ...args].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: opts.cwd || rootDir,
    env: opts.env || process.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`)
  }
}

function runOptional(command, args, opts = {}) {
  try {
    run(command, args, opts)
  } catch (err) {
    console.warn(`[local-lean-desktop] skipped optional command: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function bytes(path) {
  try {
    return statSync(path).size
  } catch {
    return 0
  }
}

function formatBytes(value) {
  if (!value) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let index = 0
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function restoreRuntimeRelease(snapshot) {
  if (snapshot === null) {
    rmSync(runtimeReleasePath, { force: true })
  } else {
    writeFileSync(runtimeReleasePath, snapshot)
  }
}

let prunedRoot = false
let buildFailed = false
let runtimeReleaseSnapshot = null
let runtimeReleaseSnapshotCaptured = false

try {
  const finalElectronArgs = electronArgs.length > 0 ? electronArgs : defaultElectronArgs()

  console.log('[local-lean-desktop] Building WebUI before pruning dev dependencies')
  run('npm', ['run', 'build'])

  if (options.cleanRelease) {
    console.log(`\n[local-lean-desktop] Removing stale desktop release directory: ${releaseDir}`)
    rmSync(releaseDir, { recursive: true, force: true })
  }

  console.log('\n[local-lean-desktop] Pruning root node_modules to production dependencies only')
  run('npm', ['prune', '--omit=dev', '--no-audit', '--no-fund'])
  prunedRoot = true

  console.log('\n[local-lean-desktop] Installing desktop package dependencies with dev tools')
  run('npm', ['ci', '--prefix', 'packages/desktop', '--include=dev', '--no-audit', '--no-fund'])

  console.log('\n[local-lean-desktop] Writing runtime release metadata')
  runtimeReleaseSnapshot = existsSync(runtimeReleasePath) ? readFileSync(runtimeReleasePath) : null
  runtimeReleaseSnapshotCaptured = true
  run('npm', ['--prefix', 'packages/desktop', 'run', 'write:runtime-release'])

  console.log('\n[local-lean-desktop] Building desktop main process')
  run('npm', ['--prefix', 'packages/desktop', 'run', 'build'])

  const electronBuilder = process.platform === 'win32'
    ? join(desktopDir, 'node_modules', '.bin', 'electron-builder.cmd')
    : join(desktopDir, 'node_modules', '.bin', 'electron-builder')
  console.log('\n[local-lean-desktop] Packaging desktop app with pruned WebUI node_modules')
  run(electronBuilder, finalElectronArgs, {
    cwd: desktopDir,
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: process.env.CSC_IDENTITY_AUTO_DISCOVERY ?? 'false',
    },
  })

  const version = JSON.parse(readFileSync(join(desktopDir, 'package.json'), 'utf-8')).version
  const defaultZip = process.platform === 'darwin'
    ? join(releaseDir, `Hermes.Studio-${version}-arm64.zip`)
    : null
  if (defaultZip) {
    console.log(`\n[local-lean-desktop] Default macOS zip size: ${formatBytes(bytes(defaultZip))}`)
    console.log(`[local-lean-desktop] Default macOS zip path: ${defaultZip}`)
  }
} catch (err) {
  buildFailed = true
  console.error(`\n[local-lean-desktop] Build failed: ${err instanceof Error ? err.message : String(err)}`)
} finally {
  if (runtimeReleaseSnapshotCaptured) {
    restoreRuntimeRelease(runtimeReleaseSnapshot)
  }
  if (prunedRoot && options.restoreDev) {
    console.log('\n[local-lean-desktop] Restoring root dev dependencies for local development')
    try {
      run('npm', ['ci', '--include=dev', '--ignore-scripts'])
      runOptional('npm', ['rebuild', 'node-pty'])
    } catch (err) {
      console.error(`[local-lean-desktop] Failed to restore root dev dependencies: ${err instanceof Error ? err.message : String(err)}`)
      buildFailed = true
    }
  } else if (prunedRoot) {
    console.warn('\n[local-lean-desktop] Root node_modules is still pruned. Run `npm ci --include=dev --ignore-scripts && npm rebuild node-pty` before development.')
  }
}

process.exit(buildFailed ? 1 : 0)
