#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repo = 'onaries/hermes-web-ui';
const requiredMainRuns = ['NPM Lockfile Check', 'Build', 'Playwright'];
const releaseRunNames = ['Publish Web UI Artifact to Release'];
const desktopWorkflow = 'desktop-release.yml';
const dockerRunName = 'Build and Push Docker Image to Docker Hub';

const args = process.argv.slice(2);
const options = new Set(args.filter((arg) => arg.startsWith('--')));
const positional = args.filter((arg) => !arg.startsWith('--'));

if (options.has('--help') || options.has('-h')) {
  usage(0);
}

const dryRun = options.has('--dry-run');
const skipLocalChecks = options.has('--skip-local-checks');
const skipDesktopBuild = options.has('--skip-desktop-build');
const skipCiWatch = options.has('--skip-ci-watch');
const skipDesktopArtifacts = options.has('--skip-desktop-artifacts');
const yes = options.has('--yes');

for (const opt of options) {
  if (![
    '--dry-run',
    '--skip-local-checks',
    '--skip-desktop-build',
    '--skip-ci-watch',
    '--skip-desktop-artifacts',
    '--yes',
    '--help',
    '-h',
  ].includes(opt)) {
    fail(`Unknown option: ${opt}`);
  }
}

main();

function main() {
  requireCommand('git');
  requireCommand('npm');
  requireCommand('gh');

  const requestedVersion = positional[0] || nextPatchVersion(readPackageVersion('package.json'));
  assertSemver(requestedVersion);
  const tag = `v${requestedVersion}`;

  log(`Preparing ${tag}`);
  log(`Repository: ${repo}`);
  if (dryRun) log('DRY RUN: commands that mutate git/GitHub/npm files will be printed, not executed.');

  ensureCleanTree();
  run('gh', ['auth', 'status'], { allowFailure: false });

  run('git', ['fetch', 'origin', 'main', '--prune']);
  run('git', ['switch', 'main']);
  run('git', ['pull', '--ff-only', 'origin', 'main']);
  ensureCleanTree();

  ensureTagDoesNotExist(tag);
  ensureReleaseDoesNotExist(tag);

  const currentRoot = readPackageVersion('package.json');
  const currentDesktop = readPackageVersion('packages/desktop/package.json');
  if (currentRoot !== currentDesktop) {
    fail(`Root version (${currentRoot}) and desktop version (${currentDesktop}) differ before bump.`);
  }
  if (compareSemver(requestedVersion, currentRoot) <= 0) {
    fail(`Requested version ${requestedVersion} must be greater than current version ${currentRoot}.`);
  }

  if (!yes) {
    log('Use --yes to run release steps non-interactively.');
    log(`Planned release: ${currentRoot} -> ${requestedVersion}`);
    process.exit(2);
  }

  run('npm', ['version', requestedVersion, '--no-git-tag-version']);
  run('npm', ['--prefix', 'packages/desktop', 'version', requestedVersion, '--no-git-tag-version']);

  if (!skipLocalChecks) {
    run('npm', ['run', 'harness:check']);
    run('npm', ['run', 'build']);
    if (!skipDesktopBuild) {
      run('npm', ['ci', '--prefix', 'packages/desktop', '--include=dev', '--no-audit', '--no-fund']);
      run('npm', ['--prefix', 'packages/desktop', 'run', 'build']);
    }
  } else {
    log('Skipping local checks by request.');
  }

  run('git', ['add', 'package.json', 'package-lock.json', 'packages/desktop/package.json', 'packages/desktop/package-lock.json']);
  run('git', ['commit', '-m', `chore: bump version to ${requestedVersion}`]);
  run('git', ['push', 'origin', 'main']);

  const sha = trim(run('git', ['rev-parse', 'HEAD'], { capture: true }));
  if (!skipCiWatch) {
    waitForMainCi(sha);
  } else {
    log('Skipping main CI watch by request.');
  }

  const notesFile = writeReleaseNotes(tag, sha);
  run('gh', ['release', 'create', tag, '--repo', repo, '--target', sha, '--title', tag, '--notes-file', notesFile]);
  log(`Created release ${tag}`);

  if (!skipDesktopArtifacts) {
    const beforeDesktopRuns = new Set(listWorkflowRunIds(desktopWorkflow));
    run('gh', ['workflow', 'run', desktopWorkflow, '--repo', repo, '--ref', 'main', '-f', `tag=${tag}`]);
    const desktopRunId = waitForNewWorkflowRun(desktopWorkflow, beforeDesktopRuns);
    if (!skipCiWatch) waitForRun(desktopRunId, 'desktop artifacts');
  } else {
    log('Skipping desktop artifact dispatch by request.');
  }

  if (!skipCiWatch) {
    waitForReleaseRuns(tag);
  }

  const assets = listReleaseAssets(tag);
  log(`Release ${tag} assets (${assets.length}):`);
  for (const asset of assets) log(`  - ${asset}`);
  log(`Done: https://github.com/${repo}/releases/tag/${tag}`);
}

function usage(code) {
  console.log(`Usage: npm run release -- [version] --yes [options]\n\nExamples:\n  npm run release -- --yes                 # bump patch version and release\n  npm run release -- 0.6.27 --yes          # release an explicit version\n  npm run release -- 0.6.27 --yes --dry-run\n\nOptions:\n  --yes                     required for non-interactive execution\n  --dry-run                 print mutating commands instead of running them\n  --skip-local-checks       skip harness/build/desktop local checks\n  --skip-desktop-build      skip local desktop TypeScript build only\n  --skip-ci-watch           do not wait for GitHub Actions completion\n  --skip-desktop-artifacts  create Web UI release only; do not dispatch desktop artifacts\n`);
  process.exit(code);
}

function requireCommand(command) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) fail(`Required command not found or unusable: ${command}`);
}

function run(command, args = [], opts = {}) {
  const mutates = isMutatingCommand(command, args);
  const label = [command, ...args.map(shellQuote)].join(' ');
  if (dryRun && mutates) {
    log(`[dry-run] ${label}`);
    return '';
  }
  log(`$ ${label}`);
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) fail(`${command} failed: ${result.error.message}`);
  if (result.status !== 0 && !opts.allowFailure) {
    if (opts.capture && result.stderr) process.stderr.write(result.stderr);
    fail(`${label} exited with ${result.status}`);
  }
  if (opts.capture) return result.stdout || '';
  return '';
}

function isMutatingCommand(command, args) {
  const joined = [command, ...args].join(' ');
  return [
    /^npm version /,
    /^npm --prefix packages\/desktop version /,
    /^git switch /,
    /^git pull /,
    /^git add /,
    /^git commit /,
    /^git push /,
    /^gh release create /,
    /^gh workflow run /,
  ].some((pattern) => pattern.test(joined));
}

function ensureCleanTree() {
  const status = trim(run('git', ['status', '--porcelain'], { capture: true }));
  const lines = status.split('\n').filter(Boolean).filter((line) => !line.endsWith(' .omx/') && !line.includes(' .omx/'));
  if (lines.length) {
    fail(`Working tree must be clean before release. Dirty files:\n${lines.join('\n')}`);
  }
}

function ensureTagDoesNotExist(tag) {
  run('git', ['fetch', 'origin', '--tags', '--force']);
  const local = spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], { stdio: 'ignore' });
  if (local.status === 0) fail(`Local tag already exists: ${tag}`);
  const remote = trim(run('git', ['ls-remote', '--tags', 'origin', tag], { capture: true }));
  if (remote) fail(`Remote tag already exists: ${tag}`);
}

function ensureReleaseDoesNotExist(tag) {
  const result = spawnSync('gh', ['release', 'view', tag, '--repo', repo], { stdio: 'ignore' });
  if (result.status === 0) fail(`GitHub release already exists: ${tag}`);
}

function readPackageVersion(path) {
  return trim(run('node', ['-e', `process.stdout.write(require(${JSON.stringify(`./${path}`)}).version)`], { capture: true }));
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) fail(`Invalid semver version: ${version}`);
}

function nextPatchVersion(version) {
  assertSemver(version);
  const [major, minor, patch] = version.split(/[+-]/)[0].split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function compareSemver(a, b) {
  const aa = a.split(/[+-]/)[0].split('.').map(Number);
  const bb = b.split(/[+-]/)[0].split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (aa[i] !== bb[i]) return aa[i] - bb[i];
  }
  return 0;
}

function waitForMainCi(sha) {
  log(`Waiting for main CI on ${sha}`);
  const deadline = Date.now() + 45 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = ghJson(['run', 'list', '--repo', repo, '--commit', sha, '--json', 'databaseId,name,status,conclusion,url', '--limit', '20']);
    const byName = new Map(runs.map((run) => [run.name, run]));
    const missing = requiredMainRuns.filter((name) => !byName.has(name));
    const failed = requiredMainRuns.map((name) => byName.get(name)).filter((run) => run && run.status === 'completed' && run.conclusion !== 'success');
    for (const name of requiredMainRuns) {
      const run = byName.get(name);
      log(`  ${name}: ${run ? `${run.status}/${run.conclusion || 'pending'}` : 'missing'}`);
    }
    if (failed.length) fail(`Main CI failed: ${failed.map((run) => `${run.name} ${run.url}`).join(', ')}`);
    if (!missing.length && requiredMainRuns.every((name) => byName.get(name)?.status === 'completed')) return;
    sleep(15000);
  }
  fail('Timed out waiting for main CI.');
}

function writeReleaseNotes(tag, sha) {
  const previous = previousReachableTag(tag);
  const range = previous ? `${previous}..${sha}` : sha;
  const commits = trim(run('git', ['log', '--oneline', '--no-merges', range], { capture: true }));
  const dir = mkdtempSync(join(tmpdir(), 'hermes-release-'));
  const file = join(dir, `${tag}.md`);
  writeFileSync(file, [
    "## What's Changed",
    commits || `- Release ${tag}`,
    '',
    '## Verification',
    '- `npm run harness:check`',
    '- `npm run build`',
    '- `npm ci --prefix packages/desktop --include=dev --no-audit --no-fund`',
    '- `npm --prefix packages/desktop run build`',
    '- Main branch CI: NPM Lockfile Check, Build, Playwright',
    '',
  ].join('\n'));
  return file;
}

function previousReachableTag(newTag) {
  const tags = trim(run('git', ['tag', '--merged', 'HEAD', '--sort=-v:refname', 'v[0-9]*'], { capture: true }))
    .split('\n')
    .filter(Boolean)
    .filter((tag) => tag !== newTag);
  return tags[0] || '';
}

function listWorkflowRunIds(workflow) {
  return ghJson(['run', 'list', '--repo', repo, '--workflow', workflow, '--json', 'databaseId', '--limit', '20']).map((run) => String(run.databaseId));
}

function waitForNewWorkflowRun(workflow, beforeIds) {
  log(`Waiting for new ${workflow} run`);
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = ghJson(['run', 'list', '--repo', repo, '--workflow', workflow, '--json', 'databaseId,status,conclusion,url', '--limit', '10']);
    const run = runs.find((candidate) => !beforeIds.has(String(candidate.databaseId)));
    if (run) {
      log(`  ${workflow}: ${run.url}`);
      return String(run.databaseId);
    }
    sleep(10000);
  }
  fail(`Timed out waiting for ${workflow} dispatch.`);
}

function waitForRun(runId, label) {
  log(`Waiting for ${label}: ${runId}`);
  const deadline = Date.now() + 90 * 60 * 1000;
  while (Date.now() < deadline) {
    const run = ghJson(['run', 'view', runId, '--repo', repo, '--json', 'status,conclusion,url']);
    log(`  ${label}: ${run.status}/${run.conclusion || 'pending'}`);
    if (run.status === 'completed') {
      if (run.conclusion !== 'success') fail(`${label} failed: ${run.url}`);
      return;
    }
    sleep(20000);
  }
  fail(`Timed out waiting for ${label}.`);
}

function waitForReleaseRuns(tag) {
  log(`Waiting for release-triggered workflows for ${tag}`);
  const deadline = Date.now() + 45 * 60 * 1000;
  while (Date.now() < deadline) {
    const runs = ghJson(['run', 'list', '--repo', repo, '--event', 'release', '--json', 'databaseId,name,displayTitle,status,conclusion,url', '--limit', '20'])
      .filter((run) => run.displayTitle === tag);
    const byName = new Map(runs.map((run) => [run.name, run]));
    for (const name of [...releaseRunNames, dockerRunName]) {
      const run = byName.get(name);
      if (run) log(`  ${name}: ${run.status}/${run.conclusion || 'pending'}`);
    }
    for (const name of releaseRunNames) {
      const run = byName.get(name);
      if (run?.status === 'completed' && run.conclusion !== 'success') fail(`${name} failed: ${run.url}`);
    }
    if (releaseRunNames.every((name) => byName.get(name)?.status === 'completed')) {
      const dockerRun = byName.get(dockerRunName);
      if (dockerRun?.status === 'completed' && dockerRun.conclusion !== 'success') {
        log(`Non-blocking: Docker workflow did not succeed (${dockerRun.conclusion}). ${dockerRun.url}`);
      }
      return;
    }
    sleep(15000);
  }
  fail('Timed out waiting for release workflows.');
}

function listReleaseAssets(tag) {
  return ghJson(['release', 'view', tag, '--repo', repo, '--json', 'assets']).assets.map((asset) => asset.name).sort();
}

function ghJson(args) {
  const out = run('gh', [...args, '--jq', '.'], { capture: true });
  try {
    return JSON.parse(out);
  } catch (error) {
    fail(`Failed to parse gh JSON output for: gh ${args.join(' ')}\n${error.message}\n${out}`);
  }
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function trim(value) {
  return String(value || '').trim();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function log(message) {
  console.log(`[release] ${message}`);
}

function fail(message) {
  console.error(`[release] ERROR: ${message}`);
  process.exit(1);
}
