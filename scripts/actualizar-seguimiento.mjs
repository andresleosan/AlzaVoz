#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function options(args) {
  let projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let check = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--check') {
      check = true;
    } else if (args[index] === '--project-dir' && args[index + 1] && !args[index + 1].startsWith('--')) {
      projectDir = resolve(args[++index]);
    } else {
      throw new Error('Uso: node actualizar-seguimiento.mjs [--project-dir RUTA] [--check]');
    }
  }
  return { projectDir, check };
}

function validateTasks(markdown, sourceName) {
  if (typeof markdown !== 'string') throw new Error(`${sourceName}: falta el Markdown del plan.`);
  const ids = new Set();
  const lines = markdown.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!/^###\s+(?:\[[^\]]*\]\s+)?Tarea\b/i.test(line)) continue;
    const heading = /^###\s+\[([ xX])\]\s+Tarea\s+(\d+)\s*:\s*(\S.*)$/i.exec(line);
    if (!heading) throw new Error(`${sourceName}:${index + 1}: tarea sin número, casilla válida o título.`);
    const id = Number(heading[2]);
    if (!Number.isSafeInteger(id)) throw new Error(`${sourceName}:${index + 1}: número de tarea fuera del rango seguro.`);
    if (ids.has(id)) throw new Error(`${sourceName}:${index + 1}: número de tarea repetido (${id}).`);
    ids.add(id);
  }
  if (!ids.size) throw new Error(`${sourceName}: el plan no contiene tareas válidas.`);
}

function readSeed(html) {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
    .filter(match => /(?:^|\s)id\s*=\s*(["'])initial-data\1(?:\s|$)/i.test(match[1]));
  if (blocks.length !== 1) throw new Error('seguimiento.html debe tener un único script con id="initial-data".');
  const block = blocks[0];
  if (!/(?:^|\s)type\s*=\s*(["'])application\/json\1(?:\s|$)/i.test(block[1])) {
    throw new Error('El script initial-data debe ser de tipo application/json.');
  }
  let seed;
  try {
    seed = JSON.parse(block[2]);
  } catch {
    throw new Error('El bloque initial-data contiene JSON inválido.');
  }
  if (!seed || typeof seed !== 'object' || Array.isArray(seed)) throw new Error('initial-data debe contener un objeto JSON.');
  validateTasks(seed.markdown, 'initial-data.markdown');
  validateTasks(seed.referenceMarkdown || seed.markdown, 'initial-data.referenceMarkdown');
  const start = block.index + block[0].indexOf('>') + 1;
  return { seed, start, end: start + block[2].length };
}

function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function replaceFiles(changes) {
  const staged = [];
  try {
    // Prepare every output before replacing any existing file. Each rename is atomic.
    for (const change of changes) {
      const temporary = `${change.path}.${randomUUID()}.tmp`;
      staged.push({ ...change, temporary });
      await writeFile(temporary, change.content, { encoding: 'utf8', flag: 'wx' });
    }
    for (const { path, temporary } of staged) await rename(temporary, path);
  } finally {
    for (const { temporary } of staged) {
      try {
        await unlink(temporary);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
}

async function main() {
  const { projectDir, check } = options(process.argv.slice(2));
  const htmlPath = join(projectDir, 'seguimiento.html');
  const sidecarPath = join(projectDir, 'seguimiento-data.js');
  const [markdown, html, sidecar] = await Promise.all([
    readFile(join(projectDir, 'TASKS.md'), 'utf8'),
    readFile(htmlPath, 'utf8'),
    readOptional(sidecarPath),
  ]);
  validateTasks(markdown, 'TASKS.md');
  const { seed, start, end } = readSeed(html);
  const revision = createHash('sha256').update(markdown, 'utf8').digest('hex');
  const payload = {
    ...seed,
    markdown,
    referenceMarkdown: seed.referenceMarkdown || seed.markdown,
    version: 1,
    autoSync: true,
    revision,
    date: seed.revision === revision && isIsoDate(seed.date) ? seed.date : new Date().toISOString(),
    label: 'Actualizado automáticamente desde TASKS.md',
  };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const nextHtml = html.slice(0, start) + json + html.slice(end);
  const nextSidecar = `window.AlzaVozSeguimiento.receive(${json});\n`;
  const changes = [
    { path: htmlPath, content: nextHtml, previous: html },
    { path: sidecarPath, content: nextSidecar, previous: sidecar },
  ].filter(change => change.content !== change.previous);
  if (check && changes.length) {
    throw new Error('Seguimiento desfasado: ejecuta actualizar-seguimiento.mjs para actualizar el HTML y seguimiento-data.js.');
  }
  if (!changes.length) {
    console.log('Seguimiento al día.');
    return;
  }
  await replaceFiles(changes);
  console.log('Seguimiento actualizado desde TASKS.md.');
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
