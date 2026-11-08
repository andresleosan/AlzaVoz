import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const script = fileURLToPath(new URL('./actualizar-seguimiento.mjs', import.meta.url));
const initialMarkdown = '# Plan\r\n\r\n### [x] Tarea 0: Preparación\r\n### [ ] Tarea 1: Formulario\r\n- **Objetivo:** Validar entradas.\r\n';
const dataBlock = /(<script type="application\/json" id="initial-data">)([\s\S]*?)(<\/script>)/;

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'alzavoz-sync-test-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('alzavoz-sync-test-'));
    await rm(directory, { recursive: true, force: true });
  });
  const html = '<!doctype html>\r\n<style>body{color:cyan}</style>\r\n'
    + '<script type="application/json" id="initial-data">'
    + JSON.stringify({ markdown: initialMarkdown, date: '2026-11-05', label: 'Copia inicial', custom: 'conservar' })
    + '</script>\r\n<main>Diseño existente</main>\r\n<script>window.original = true;</script>\r\n';
  await writeFile(join(directory, 'TASKS.md'), initialMarkdown);
  await writeFile(join(directory, 'seguimiento.html'), html);
  return directory;
}

function run(directory, ...args) {
  const result = spawnSync(process.execPath, [script, '--project-dir', directory, ...args], { encoding: 'utf8' });
  assert.ifError(result.error);
  return result;
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

async function outputs(directory) {
  const html = await readFile(join(directory, 'seguimiento.html'), 'utf8');
  const sidecar = await readFile(join(directory, 'seguimiento-data.js'), 'utf8');
  const seed = JSON.parse(html.match(dataBlock)[2]);
  const received = [];
  runInNewContext(sidecar, { window: { AlzaVozSeguimiento: { receive: payload => received.push(JSON.parse(JSON.stringify(payload))) } } });
  assert.equal(received.length, 1, 'El sidecar debe entregar un solo payload al callback público.');
  assert.deepEqual(received[0], seed);
  return { html, sidecar, seed };
}

test('una tarea completada actualiza ambas salidas, preservando referencia, diseño y TASKS.md', async t => {
  const directory = await fixture(t);
  const originalHtml = await readFile(join(directory, 'seguimiento.html'), 'utf8');
  succeeds(run(directory));
  const changedMarkdown = initialMarkdown.replace('[ ] Tarea 1', '[x] Tarea 1');
  await writeFile(join(directory, 'TASKS.md'), changedMarkdown);

  succeeds(run(directory));

  const actual = await outputs(directory);
  assert.equal(actual.seed.markdown, changedMarkdown);
  assert.equal(actual.seed.referenceMarkdown, initialMarkdown);
  assert.equal(actual.seed.version, 1);
  assert.equal(actual.seed.autoSync, true);
  assert.equal(actual.seed.revision, createHash('sha256').update(changedMarkdown).digest('hex'));
  assert.equal(new Date(actual.seed.date).toISOString(), actual.seed.date);
  assert.equal(actual.seed.label, 'Actualizado automáticamente desde TASKS.md');
  assert.equal(actual.seed.custom, 'conservar');
  assert.equal(actual.html.replace(dataBlock, '$1DATA$3'), originalHtml.replace(dataBlock, '$1DATA$3'));
  assert.equal(await readFile(join(directory, 'TASKS.md'), 'utf8'), changedMarkdown);
});

test('--check detecta Markdown, configuración y sidecar desfasados sin escribir', async t => {
  const directory = await fixture(t);
  const beforeNames = await readdir(directory);
  const initialHtml = await readFile(join(directory, 'seguimiento.html'), 'utf8');
  assert.notEqual(run(directory, '--check').status, 0);
  assert.deepEqual(await readdir(directory), beforeNames);
  assert.equal(await readFile(join(directory, 'seguimiento.html'), 'utf8'), initialHtml);
  succeeds(run(directory));
  const good = await outputs(directory);
  succeeds(run(directory, '--check'));

  await writeFile(join(directory, 'TASKS.md'), initialMarkdown.replace('[ ]', '[x]'));
  assert.notEqual(run(directory, '--check').status, 0);
  assert.deepEqual(await outputs(directory), good);
  await writeFile(join(directory, 'TASKS.md'), initialMarkdown);

  for (const patch of [{ autoSync: false }, { version: 2 }, { revision: 'incorrecto' }, { date: 'inválida' }]) {
    const tampered = good.html.replace(dataBlock, (_, open, json, close) => open + JSON.stringify({ ...JSON.parse(json), ...patch }) + close);
    await writeFile(join(directory, 'seguimiento.html'), tampered);
    assert.notEqual(run(directory, '--check').status, 0);
    assert.equal(await readFile(join(directory, 'seguimiento.html'), 'utf8'), tampered);
  }
  await writeFile(join(directory, 'seguimiento.html'), good.html);
  await writeFile(join(directory, 'seguimiento-data.js'), 'window.AlzaVozSeguimiento.receive({});\n');
  assert.notEqual(run(directory, '--check').status, 0);
  assert.equal(await readFile(join(directory, 'seguimiento-data.js'), 'utf8'), 'window.AlzaVozSeguimiento.receive({});\n');
});

test('datos inválidos no sobrescriben salidas existentes', async t => {
  const invalidCases = [
    ['lista vacía', '# Plan sin tareas\n'],
    ['número duplicado', '### [ ] Tarea 1: Primera\n### [x] Tarea 1: Segunda\n'],
    ['título vacío', '### [ ] Tarea 1:   \n'],
    ['estado inválido entre tareas válidas', '### [x] Tarea 0: Lista\n### [-] Tarea 1: Incompleta\n'],
    ['número no representable', '### [ ] Tarea 9007199254740993: Insegura\n'],
  ];
  for (const [name, markdown] of invalidCases) {
    await t.test(name, async child => {
      const directory = await fixture(child);
      succeeds(run(directory));
      const good = await outputs(directory);
      await writeFile(join(directory, 'TASKS.md'), markdown);
      assert.notEqual(run(directory).status, 0);
      assert.deepEqual(await outputs(directory), good);
      assert.equal(await readFile(join(directory, 'TASKS.md'), 'utf8'), markdown);
      assert.deepEqual((await readdir(directory)).sort(), ['TASKS.md', 'seguimiento-data.js', 'seguimiento.html'].sort());
    });
  }
});

test('JSON corrupto o marcador duplicado impiden cambiar cualquiera de las salidas', async t => {
  const directory = await fixture(t);
  succeeds(run(directory));
  const good = await outputs(directory);
  const invalidHtml = [
    good.html.replace(dataBlock, '$1{incorrecto}$3'),
    good.html + '<script type="application/json" id="initial-data">{}</script>',
  ];
  for (const html of invalidHtml) {
    await writeFile(join(directory, 'seguimiento.html'), html);
    assert.notEqual(run(directory).status, 0);
    assert.equal(await readFile(join(directory, 'seguimiento.html'), 'utf8'), html);
    assert.equal(await readFile(join(directory, 'seguimiento-data.js'), 'utf8'), good.sidecar);
  }
});

test('las ejecuciones idénticas conservan fecha y archivos; el contenido no puede cerrar script', async t => {
  const directory = await fixture(t);
  const markdown = '### [ ] Tarea 1: Texto </script><script>throw "injected"</script>\n- **Objetivo:** "comillas" y \\ barras.\n';
  await writeFile(join(directory, 'TASKS.md'), markdown);
  succeeds(run(directory));
  const first = await outputs(directory);
  const firstTimes = await Promise.all(['seguimiento.html', 'seguimiento-data.js'].map(name => stat(join(directory, name), { bigint: true }).then(value => value.mtimeNs)));
  succeeds(run(directory));
  succeeds(run(directory, '--check'));
  assert.deepEqual(await outputs(directory), first);
  const nextTimes = await Promise.all(['seguimiento.html', 'seguimiento-data.js'].map(name => stat(join(directory, name), { bigint: true }).then(value => value.mtimeNs)));
  assert.deepEqual(nextTimes, firstTimes);
  assert.equal(first.seed.markdown, markdown);
  assert.ok(first.html.match(dataBlock)[2].includes('\\u003c/script>'));
  assert.ok(!first.sidecar.includes('<'));
});

test('la ubicación por defecto depende del script, no del directorio actual', async t => {
  const directory = await fixture(t);
  await mkdir(join(directory, 'scripts'));
  const copy = join(directory, 'scripts', 'actualizar-seguimiento.mjs');
  await copyFile(script, copy);
  succeeds(spawnSync(process.execPath, [copy], { cwd: tmpdir(), encoding: 'utf8' }));
  assert.equal((await outputs(directory)).seed.markdown, initialMarkdown);
});
