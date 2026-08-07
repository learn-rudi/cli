import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');
const toolIndexUrl = pathToFileURL(path.join(repoRoot, 'packages/core/src/tool-index.js')).href;

function runProcessTreeScenario(mode, timeout) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-tool-index-tree-'));
  const rudiHome = path.join(root, '.rudi');
  const fixturePath = path.join(root, 'stack-server.mjs');
  const pidPath = path.join(root, 'stack-server-pids.json');

  try {
    fs.writeFileSync(fixturePath, `
      import { spawn } from 'node:child_process';
      import fs from 'node:fs';
      import readline from 'node:readline';

      const pidPath = process.argv[2];
      const shouldRespond = process.argv[3] === 'respond';
      const descendant = spawn(process.execPath, [
        '--input-type=module',
        '-e',
        'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);',
      ], { stdio: 'ignore' });

      process.on('SIGTERM', () => {});
      fs.writeFileSync(pidPath, JSON.stringify({
        parent: process.pid,
        descendant: descendant.pid,
      }));

      const input = readline.createInterface({ input: process.stdin });
      input.on('line', (line) => {
        if (!shouldRespond) return;
        const request = JSON.parse(line);
        if (request.method === 'initialize') {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: { protocolVersion: '2024-11-05', capabilities: {} },
          }) + '\\n');
        } else if (request.method === 'tools/list') {
          process.stdout.write(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: { tools: [{ name: 'fixture_tool' }] },
          }) + '\\n');
        }
      });
      setInterval(() => {}, 1000);
    `);

    const script = `
      const fs = await import('node:fs');
      const { discoverStackTools } = await import(process.argv[1]);
      const fixturePath = process.argv[2];
      const pidPath = process.argv[3];
      const mode = process.argv[4];
      const timeout = Number(process.argv[5]);
      const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
      const isAlive = pid => {
        try {
          process.kill(pid, 0);
          return true;
        } catch (error) {
          if (error.code === 'ESRCH') return false;
          throw error;
        }
      };

      let pids;
      try {
        const result = await discoverStackTools('stack:fixture', {
          installed: true,
          path: process.cwd(),
          launch: {
            bin: process.execPath,
            args: [fixturePath, pidPath, mode],
            cwd: process.cwd(),
          },
        }, { timeout, terminationGraceMs: 100 });
        pids = JSON.parse(fs.readFileSync(pidPath, 'utf8'));
        await sleep(100);
        console.log(JSON.stringify({
          result,
          parentAlive: isAlive(pids.parent),
          descendantAlive: isAlive(pids.descendant),
        }));
      } finally {
        if (pids) {
          for (const pid of [pids.parent, pids.descendant]) {
            try { process.kill(pid, 'SIGKILL'); } catch {}
          }
        }
      }
    `;

    const output = execFileSync(process.execPath, [
      '--input-type=module',
      '-e',
      script,
      toolIndexUrl,
      fixturePath,
      pidPath,
      mode,
      String(timeout),
    ], {
      cwd: repoRoot,
      env: {
        ...process.env,
        RUDI_HOME: rudiHome,
      },
      encoding: 'utf8',
      timeout: 10000,
    });

    const observed = JSON.parse(output);
    return observed;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('discoverStackTools waits for the complete stack process tree to exit', {
  skip: process.platform === 'win32',
}, () => {
  const observed = runProcessTreeScenario('respond', 2000);
  assert.equal(observed.result.error, null);
  assert.deepEqual(observed.result.tools.map(tool => tool.name), ['fixture_tool']);
  assert.equal(observed.parentAlive, false);
  assert.equal(observed.descendantAlive, false);
});

test('discoverStackTools timeout terminates the complete stack process tree', {
  skip: process.platform === 'win32',
}, () => {
  const observed = runProcessTreeScenario('timeout', 100);
  assert.equal(observed.result.error, 'Timeout after 100ms');
  assert.deepEqual(observed.result.tools, []);
  assert.equal(observed.parentAlive, false);
  assert.equal(observed.descendantAlive, false);
});

test('removeStackFromToolIndex prunes one cached stack entry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-tool-index-'));
  const rudiHome = path.join(root, '.rudi');

  try {
    const script = `
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { readToolIndex, removeStackFromToolIndex, writeToolIndex } = await import(process.argv[1]);
      writeToolIndex({
        version: 1,
        updatedAt: 'old',
        byStack: {
          'stack:slack': { indexedAt: 'old', tools: [], error: null },
          'stack:notion': { indexedAt: 'old', tools: [{ name: 'notion_search' }], error: null }
        }
      });
      const removed = removeStackFromToolIndex('stack:slack');
      const missing = removeStackFromToolIndex('stack:missing');
      console.log(JSON.stringify({ removed, missing, index: readToolIndex() }));
    `;

    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, toolIndexUrl], {
      cwd: repoRoot,
      env: {
        ...process.env,
        RUDI_HOME: rudiHome,
      },
      encoding: 'utf8',
    });

    const result = JSON.parse(output);
    assert.equal(result.removed, true);
    assert.equal(result.missing, false);
    assert.deepEqual(Object.keys(result.index.byStack), ['stack:notion']);
    assert.equal(result.index.byStack['stack:notion'].tools[0].name, 'notion_search');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
