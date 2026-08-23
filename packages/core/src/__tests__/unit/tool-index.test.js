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

test('discoverStackTools releases inherited stdio handles after a timeout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-tool-index-timeout-'));
  const rudiHome = path.join(root, '.rudi');
  const fakeStack = path.join(root, 'fake-stack.cjs');
  const pidFile = path.join(root, 'fake-stack.pid');

  try {
    fs.writeFileSync(fakeStack, `
      const fs = require('node:fs');
      fs.writeFileSync(process.argv[2], String(process.pid));
      process.on('SIGTERM', () => {});
      setTimeout(() => {}, 5000);
    `);

    const script = `
      const fs = await import('node:fs');
      const { discoverStackTools } = await import(process.argv[1]);
      const result = await discoverStackTools('stack:timeout-fixture', {
        installed: true,
        path: process.argv[2],
        launch: { bin: process.execPath, args: [process.argv[3], process.argv[4]] },
      }, { timeout: 500 });
      await new Promise(resolve => setTimeout(resolve, 400));
      const childPid = Number(fs.readFileSync(process.argv[4], 'utf8'));
      let childAlive = false;
      try {
        process.kill(childPid, 0);
        childAlive = true;
      } catch {}
      if (childAlive) process.kill(childPid, 'SIGKILL');
      console.log(JSON.stringify({ childAlive, result }));
    `;
    const output = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script, toolIndexUrl, root, fakeStack, pidFile],
      {
        cwd: repoRoot,
        env: { ...process.env, RUDI_HOME: rudiHome },
        encoding: 'utf8',
        timeout: 5000,
      },
    );
    const result = JSON.parse(output);

    assert.equal(result.result.error, 'Timeout after 500ms');
    assert.equal(result.childAlive, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
