import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// A new local-only secret per run; no credentials are written or logged.
const secret = randomBytes(32).toString('hex');
const remote = process.argv.includes('--remote');
const pages = process.argv.includes('--pages');
const children = [];
function run(args, env = {}) {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => process.stdout.write(data.toString().replaceAll(secret, '[redacted]')));
  children.push(child);
  child.on('exit', code => { if (code) { stop(); process.exitCode = code; } });
  return child;
}
function stop() { for (const child of children) child.kill(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
run(['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'workers/recordings/wrangler.jsonc', '--port', '8787', '--ip', '127.0.0.1', '--var', `GATEWAY_SECRET:${secret}`, '--show-interactive-dev-session=false', ...(remote ? ['--remote'] : [])]);
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:8787/sessions', { signal: AbortSignal.timeout(1000) });
    if (response.status === 401) { ready = true; break; }
  } catch { /* A remote preview can take longer than a local worker to initialize. */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
if (!ready) { stop(); throw new Error('Worker local no disponible'); }
if (pages) {
  run(['node_modules/wrangler/bin/wrangler.js', 'pages', 'dev', 'out', '--port', '3000', '--ip', '127.0.0.1', '--binding', 'RECORDING_APP_ORIGIN=http://127.0.0.1:3000', '--binding', 'RECORDING_API_URL=http://127.0.0.1:8787', '--binding', `RECORDING_GATEWAY_SECRET=${secret}`]);
} else {
  run(['node_modules/next/dist/bin/next', 'start', '-p', '3000', '-H', '127.0.0.1'], { RECORDING_APP_ORIGIN: 'http://127.0.0.1:3000', RECORDING_API_URL: 'http://127.0.0.1:8787', RECORDING_GATEWAY_SECRET: secret });
}
