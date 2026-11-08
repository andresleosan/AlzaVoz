import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_ORIGIN = 'https://github.com/andresleosan/AlzaVoz.git';

function githubRepository(url) {
  return url.match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/?#]+\/[^/?#]+?)(?:\.git)?\/?$/i)?.[1].toLowerCase();
}

export function isExpectedOrigin(url, expected = EXPECTED_ORIGIN) {
  const expectedRepository = githubRepository(expected);
  return expectedRepository ? githubRepository(url) === expectedRepository : url === expected;
}

function git(cwd, args) {
  const result = spawnSync('git', args, {
    cwd, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
  if (result.error || result.status !== 0) {
    // Do not echo remote URLs or credential-helper output into logs.
    throw new Error(`Falló git ${args[0]}; no se pudo confirmar el repositorio. Revisa conexión, acceso y estado de Git.`);
  }
  return result.stdout.trimEnd();
}

function changes(cwd) {
  const status = git(cwd, ['status', '--porcelain=v1', '--untracked-files=normal']);
  return status ? status.split(/\r?\n/) : [];
}

export function verifyRepository({ cwd = process.cwd(), sync = false, expectedOrigin = EXPECTED_ORIGIN } = {}) {
  const root = git(cwd, ['rev-parse', '--show-toplevel']).trim();
  const branch = git(root, ['branch', '--show-current']).trim();
  if (branch !== 'main') throw new Error('Se requiere main; no se cambia de rama automáticamente ni se continúa con HEAD separado.');

  for (const args of [['--all'], ['--push', '--all']]) {
    const urls = git(root, ['remote', 'get-url', ...args, 'origin']).split(/\r?\n/);
    if (!urls.length || urls.some(url => !isExpectedOrigin(url, expectedOrigin))) {
      throw new Error('origin debe apuntar a andresleosan/AlzaVoz tanto para leer como para enviar cambios.');
    }
  }

  for (const operation of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer']) {
    const path = git(root, ['rev-parse', '--git-path', operation]).trim();
    if (existsSync(resolve(root, path))) throw new Error('Hay una operación Git en curso; resuélvela antes de iniciar otra tarea.');
  }
  if (git(root, ['diff', '--name-only', '--diff-filter=U'])) {
    throw new Error('Hay conflictos sin resolver; conserva los cambios y resuélvelos primero.');
  }

  // The leading + refreshes only the remote-tracking ref, including remote rewrites.
  // It never rewrites main, commits, the index or working files.
  git(root, ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
  let localCommit = git(root, ['rev-parse', 'HEAD']).trim();
  const remoteCommit = git(root, ['rev-parse', 'refs/remotes/origin/main']).trim();
  const [ahead, behind] = git(root, ['rev-list', '--left-right', '--count', `${localCommit}...${remoteCommit}`]).split(/\s+/).map(Number);
  let localChanges = changes(root);
  let fastForwarded = false;
  if (sync && behind > 0 && ahead === 0 && localChanges.length === 0) {
    git(root, ['merge', '--ff-only', '--no-autostash', '--no-overwrite-ignore', remoteCommit]);
    localCommit = git(root, ['rev-parse', 'HEAD']).trim();
    localChanges = changes(root);
    fastForwarded = true;
  }

  const state = localCommit === remoteCommit ? 'synchronized'
    : ahead > 0 && behind > 0 ? 'diverged' : ahead > 0 ? 'ahead' : 'behind';
  const reasons = {
    synchronized: 'Los commits local y remoto coinciden. Los cambios sin commit se conservan y no forman parte de GitHub.',
    ahead: 'Hay commits locales sin enviar. Revisa y resuelve el cierre pendiente antes de elegir otra tarea; no hagas push a ciegas.',
    behind: localChanges.length
      ? 'Hay cambios locales y commits remotos nuevos. Integra conservando el trabajo antes de elegir otra tarea; no se hace stash ni reset automático.'
      : 'Hay commits remotos nuevos. Ejecuta de nuevo con --sync para actualizar únicamente por fast-forward.',
    diverged: 'Los historiales divergen. Integra conservando ambos trabajos antes de elegir otra tarea; no fuerces el push.',
  };
  return {
    ok: state === 'synchronized', state, root, branch, localCommit, remoteCommit,
    ahead: fastForwarded ? 0 : ahead, behind: fastForwarded ? 0 : behind,
    changes: localChanges, fastForwarded, reason: reasons[state],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--sync')) throw new Error('Uso: node scripts/verificar-repositorio.mjs [--sync]');
    const result = verifyRepository({ sync: args.includes('--sync') });
    console.log(`Repositorio: andresleosan/AlzaVoz | rama: ${result.branch}`);
    console.log(`HEAD:        ${result.localCommit}\norigin/main: ${result.remoteCommit}`);
    if (result.fastForwarded) console.log('Checkout actualizado por fast-forward.');
    console.log(`${result.state}: ${result.reason}`);
    if (result.changes.length) console.log(`Cambios locales conservados (${result.changes.length}):\n${result.changes.join('\n')}`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'No se pudo verificar el repositorio.');
    process.exitCode = 1;
  }
}
