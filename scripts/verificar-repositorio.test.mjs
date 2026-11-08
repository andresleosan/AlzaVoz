import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { isExpectedOrigin, verifyRepository } from './verificar-repositorio.mjs';

function git(cwd, ...args) {
  const result = spawnSync('git', [
    '-c', 'user.name=AlzaVoz Test', '-c', 'user.email=test@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args,
  ], { cwd, encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'alzavoz-repo-test-'));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('alzavoz-repo-test-'));
    rmSync(directory, { recursive: true, force: true });
  });
  const remote = join(directory, 'remote.git');
  const local = join(directory, 'local');
  const peer = join(directory, 'peer');
  git(directory, 'init', '--bare', '--initial-branch=main', remote);
  git(directory, 'clone', remote, local);
  writeFileSync(join(local, 'app.txt'), 'initial\n');
  git(local, 'add', 'app.txt');
  git(local, 'commit', '-m', 'initial');
  git(local, 'push', 'origin', 'main');
  git(directory, 'clone', remote, peer);
  return { local, peer, remote, check: (sync = false) => verifyRepository({ cwd: local, expectedOrigin: remote, sync }) };
}

function commit(cwd, content) {
  writeFileSync(join(cwd, 'app.txt'), content);
  git(cwd, 'add', 'app.txt');
  git(cwd, 'commit', '-m', content.trim());
  return git(cwd, 'rev-parse', 'HEAD');
}

function snapshot(cwd) {
  return {
    head: git(cwd, 'rev-parse', 'HEAD'),
    status: git(cwd, 'status', '--porcelain=v1'),
    staged: git(cwd, 'diff', '--cached'),
    content: readFileSync(join(cwd, 'app.txt'), 'utf8'),
  };
}

test('acepta solo las variantes HTTPS/SSH del repositorio indicado', () => {
  for (const url of [
    'https://github.com/andresleosan/AlzaVoz.git',
    'https://github.com/andresleosan/AlzaVoz',
    'git@github.com:andresleosan/AlzaVoz.git',
    'ssh://git@github.com/andresleosan/AlzaVoz.git',
  ]) assert.equal(isExpectedOrigin(url), true, url);
  for (const url of [
    'https://github.com/other/AlzaVoz.git',
    'https://github.com/andresleosan/AlzaVoz-copy.git',
    'https://github.com.evil.invalid/andresleosan/AlzaVoz.git',
    'https://user:secret@github.com/andresleosan/AlzaVoz.git',
    'https://github.com/andresleosan/AlzaVoz.git?redirect=other',
  ]) assert.equal(isExpectedOrigin(url), false);
});

test('confirma igualdad con el remoto recién consultado', t => {
  const f = fixture(t);
  const result = f.check();
  assert.equal(result.state, 'synchronized');
  assert.equal(result.ok, true);
  assert.equal(result.localCommit, result.remoteCommit);
  assert.equal(result.changes.length, 0);
});

test('informa cambios preparados, sin preparar y nuevos sin modificarlos', t => {
  const f = fixture(t);
  writeFileSync(join(f.local, 'app.txt'), 'staged\n');
  git(f.local, 'add', 'app.txt');
  writeFileSync(join(f.local, 'app.txt'), 'unstaged\n');
  writeFileSync(join(f.local, 'notes.txt'), 'private notes\n');
  const before = snapshot(f.local);
  const result = f.check(true);
  assert.equal(result.ok, true);
  assert.equal(result.changes.length, 2);
  assert.deepEqual(snapshot(f.local), before);
  assert.equal(readFileSync(join(f.local, 'notes.txt'), 'utf8'), 'private notes\n');
});

test('detecta atraso aunque origin/main local estuviera obsoleto', t => {
  const f = fixture(t);
  const next = commit(f.peer, 'remote update\n');
  git(f.peer, 'push', 'origin', 'main');
  const before = snapshot(f.local);
  const result = f.check();
  assert.equal(result.state, 'behind');
  assert.equal(result.ok, false);
  assert.equal(result.remoteCommit, next);
  assert.equal(result.behind, 1);
  assert.deepEqual(snapshot(f.local), before);
});

test('actualiza un atraso limpio solo por fast-forward y confirma igualdad', t => {
  const f = fixture(t);
  const next = commit(f.peer, 'remote update\n');
  git(f.peer, 'push', 'origin', 'main');
  const result = f.check(true);
  assert.equal(result.ok, true);
  assert.equal(result.fastForwarded, true);
  assert.equal(result.localCommit, next);
  assert.equal(result.remoteCommit, next);
});

test('no actualiza un atraso con cambios locales ni altera el índice', t => {
  const f = fixture(t);
  commit(f.peer, 'remote update\n');
  git(f.peer, 'push', 'origin', 'main');
  writeFileSync(join(f.local, 'app.txt'), 'local pending\n');
  git(f.local, 'add', 'app.txt');
  const before = snapshot(f.local);
  const result = f.check(true);
  assert.equal(result.state, 'behind');
  assert.equal(result.ok, false);
  assert.deepEqual(snapshot(f.local), before);
});

test('detecta commits sin enviar sin hacer push automático', t => {
  const f = fixture(t);
  commit(f.local, 'unpublished\n');
  const remoteBefore = git(f.peer, 'rev-parse', 'origin/main');
  const result = f.check(true);
  assert.equal(result.state, 'ahead');
  assert.equal(result.ok, false);
  assert.equal(result.ahead, 1);
  assert.equal(git(f.peer, 'ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0], remoteBefore);
});

test('conserva archivos ignorados si el remoto empieza a rastrear esa ruta', t => {
  const f = fixture(t);
  writeFileSync(join(f.local, '.git/info/exclude'), 'private.txt\n');
  writeFileSync(join(f.local, 'private.txt'), 'private local content\n');
  writeFileSync(join(f.peer, 'private.txt'), 'remote content\n');
  git(f.peer, 'add', 'private.txt');
  git(f.peer, 'commit', '-m', 'track previously ignored file');
  git(f.peer, 'push', 'origin', 'main');
  const before = snapshot(f.local);
  assert.throws(() => f.check(true), /merge/);
  assert.deepEqual(snapshot(f.local), before);
  assert.equal(readFileSync(join(f.local, 'private.txt'), 'utf8'), 'private local content\n');
});

test('detecta divergencia sin fusionar ni perder cambios locales', t => {
  const f = fixture(t);
  commit(f.local, 'local commit\n');
  commit(f.peer, 'remote commit\n');
  git(f.peer, 'push', 'origin', 'main');
  const before = snapshot(f.local);
  const result = f.check(true);
  assert.equal(result.state, 'diverged');
  assert.equal(result.ok, false);
  assert.deepEqual(snapshot(f.local), before);
});

for (const target of ['fetch', 'push']) {
  test(`rechaza un remoto ${target} diferente antes de conectarse`, t => {
    const f = fixture(t);
    if (target === 'fetch') git(f.local, 'remote', 'set-url', 'origin', 'https://example.invalid/wrong.git');
    else git(f.local, 'remote', 'set-url', '--push', 'origin', 'https://example.invalid/wrong.git');
    const before = snapshot(f.local);
    assert.throws(() => f.check(true), /origin/);
    assert.deepEqual(snapshot(f.local), before);
  });
}

for (const branch of ['other', 'detached']) {
  test(`rechaza ${branch} sin cambiar de rama`, t => {
    const f = fixture(t);
    if (branch === 'other') git(f.local, 'switch', '-c', 'other');
    else git(f.local, 'checkout', '--detach');
    const before = snapshot(f.local);
    assert.throws(() => f.check(true), /main/);
    assert.deepEqual(snapshot(f.local), before);
  });
}

test('un fetch fallido no reutiliza origin/main anterior como éxito', t => {
  const f = fixture(t);
  git(f.remote, 'config', 'uploadpack.hideRefs', 'refs/heads/main');
  assert.throws(() => f.check(true), /fetch/);
});

test('rechaza una operación Git en curso y mantiene sus conflictos', t => {
  const f = fixture(t);
  commit(f.local, 'local conflict\n');
  commit(f.peer, 'remote conflict\n');
  git(f.peer, 'push', 'origin', 'main');
  git(f.local, 'fetch', 'origin');
  const merge = spawnSync('git', ['merge', 'origin/main'], { cwd: f.local, encoding: 'utf8' });
  assert.notEqual(merge.status, 0);
  const before = snapshot(f.local);
  assert.throws(() => f.check(true), /curso|conflictos/);
  assert.deepEqual(snapshot(f.local), before);
});
