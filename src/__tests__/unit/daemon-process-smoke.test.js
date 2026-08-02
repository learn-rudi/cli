import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

const CLI_ENTRYPOINT = path.resolve(import.meta.dirname, '../../index.js');

async function waitForFile(filePath, child, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(filePath)) return;
    if (child.exitCode !== null) {
      throw new Error(`daemon exited before creating ${path.basename(filePath)}`);
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`timed out waiting for ${path.basename(filePath)}`);
}

test('daemon process serves retained routes without creating legacy database state', async (t) => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-daemon-smoke-'));
  const portFile = path.join(rudiHome, 'daemon.port');
  const tokenFile = path.join(rudiHome, 'daemon.token');
  let stdout = '';
  let stderr = '';
  const child = spawn(process.execPath, [CLI_ENTRYPOINT, 'serve', '--port', '0'], {
    cwd: path.dirname(CLI_ENTRYPOINT),
    env: { ...process.env, RUDI_HOME: rudiHome },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  t.after(() => {
    if (child.exitCode === null) child.kill('SIGKILL');
    fs.rmSync(rudiHome, { recursive: true, force: true });
  });

  try {
    await waitForFile(portFile, child);
    await waitForFile(tokenFile, child);

    const port = Number(fs.readFileSync(portFile, 'utf8'));
    const token = fs.readFileSync(tokenFile, 'utf8').trim();
    assert.ok(Number.isInteger(port) && port > 0);
    assert.ok(token.length >= 32);
    assert.equal(fs.statSync(portFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(tokenFile).mode & 0o777, 0o600);

    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(healthResponse.status, 200);
    assert.equal((await healthResponse.json()).status, 'ok');

    const unauthenticatedResponse = await fetch(`http://127.0.0.1:${port}/ready`);
    assert.equal(unauthenticatedResponse.status, 401);

    const readyResponse = await fetch(`http://127.0.0.1:${port}/ready`, {
      headers: { 'x-rudi-token': token },
    });
    assert.equal(readyResponse.status, 200);
    assert.equal((await readyResponse.json()).ready, true);
    assert.equal(fs.existsSync(path.join(rudiHome, 'rudi.db')), false);

    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const [exitCode, signal] = await exited;
    assert.equal(signal, null, stderr || stdout);
    assert.equal(exitCode, 0, stderr || stdout);
    assert.equal(fs.existsSync(portFile), false);
    assert.equal(fs.existsSync(tokenFile), false);
  } catch (error) {
    error.message += `\nstdout:\n${stdout}\nstderr:\n${stderr}`;
    throw error;
  }
});
