import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = new URL('..', import.meta.url).pathname;
const stateDirectory = await mkdtemp(join(tmpdir(), 'fixmycity-integration-'));
const port = 3417;
const baseUrl = `http://127.0.0.1:${port}`;
const wrangler = join(projectRoot, 'node_modules', '.bin', 'wrangler');
let output = '';

const server = spawn(
  wrangler,
  ['dev', '--config', 'dist/server/wrangler.json', '--ip', '127.0.0.1', '--port', String(port), '--persist-to', stateDirectory],
  { cwd: projectRoot, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] },
);

server.stdout.on('data', (chunk) => { output = `${output}${chunk}`.slice(-12_000); });
server.stderr.on('data', (chunk) => { output = `${output}${chunk}`.slice(-12_000); });

async function waitUntilReady() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Local worker stopped before tests began.\n${output}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local worker did not become ready.\n${output}`);
}

async function runTests() {
  return await new Promise((resolve, reject) => {
    const testProcess = spawn(process.execPath, ['--test', 'tests/api.integration.test.mjs'], {
      cwd: projectRoot,
      env: { ...process.env, TEST_BASE_URL: baseUrl, NO_COLOR: '1' },
      stdio: 'inherit',
    });
    testProcess.once('error', reject);
    testProcess.once('exit', (code) => resolve(code ?? 1));
  });
}

let exitCode = 1;
try {
  await waitUntilReady();
  exitCode = await runTests();
} finally {
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  await rm(stateDirectory, { recursive: true, force: true });
}

process.exitCode = exitCode;
