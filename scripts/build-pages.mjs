import { cp, mkdir, readFile, rm, writeFile, lstat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const staging = resolve(root, '.pages-build');
const output = resolve(root, 'out');
for (const directory of [staging, output]) {
  const name = relative(root, directory);
  if (!['.pages-build', 'out'].includes(name)) throw new Error('Destino fuera del proyecto');
  const info = await lstat(directory).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (info?.isSymbolicLink()) throw new Error('El destino no puede ser un enlace simbólico');
  await rm(directory, { recursive: true, force: true });
}
await mkdir(staging);
const api = resolve(root, 'src/app/api');
await cp(resolve(root, 'src'), resolve(staging, 'src'), { recursive: true, filter: source => source !== api });
await cp(resolve(root, 'public'), resolve(staging, 'public'), { recursive: true });
for (const filename of ['package.json', 'tsconfig.json', 'postcss.config.mjs']) await cp(resolve(root, filename), resolve(staging, filename));
await writeFile(resolve(staging, 'next.config.mjs'), 'export default { output: "export", images: { unoptimized: true } };\n');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'build', staging, '--webpack'], { cwd: root, stdio: 'inherit', env: process.env });
if (result.status !== 0) process.exit(result.status ?? 1);
await cp(resolve(staging, 'out'), output, { recursive: true });
// Fail before publication if the output regresses to a Next build directory.
for (const filename of ['index.html', 'record.html', 'sos.html', 'defender.html', 'report.html']) {
  const html = await readFile(resolve(output, filename), 'utf8');
  if (!html.includes('<html')) throw new Error(`Salida HTML inválida: ${filename}`);
}
await writeFile(resolve(output, '_routes.json'), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
console.log('Pages: HTML exportado a out; APIs atendidas por Functions.');
