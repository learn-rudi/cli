import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { inspectAgentHost } from '../../agent-host/preflight.js';

describe('Agent Host preflight', () => {
  test('does not claim synchronization from an unrelated skill directory without receipts', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-host-skill-status-'));
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(root, 'codex');
    fs.mkdirSync(path.join(process.env.CODEX_HOME, 'skills', 'unmanaged-user-skill'), { recursive: true });
    try {
      const inspected = await inspectAgentHost('codex', {
        binaryPath: '/tmp/codex',
        spawnSyncImpl() {
          return { status: 0, stdout: 'codex 1.0.0' };
        },
        async summarizeNativeSkillHostImpl() {
          return { current: 0, totalManaged: 0, skillsSynchronized: false };
        },
      });
      assert.equal(inspected.skillsSynchronized, false);
      assert.equal(inspected.skillProjection.totalManaged, 0);
    } finally {
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('uses the provider binary directory without injecting the RUDI Node runtime', async () => {
    const calls = [];
    const binaryPath = '/Users/example/.local/bin/codex';

    const inspected = await inspectAgentHost('codex', {
      binaryPath,
      spawnSyncImpl(command, args, options) {
        calls.push({ args, command, options });
        return { status: 0, stdout: args.includes('--version') ? 'codex 1.0.0' : 'Logged in' };
      },
    });

    assert.equal(inspected.installed, true);
    const pathEntries = calls[0].options.env.PATH.split(path.delimiter);
    const rudiRoot = path.resolve(process.env.RUDI_HOME || path.join(os.homedir(), '.rudi'));
    assert.equal(pathEntries.includes(path.dirname(binaryPath)), true);
    assert.equal(pathEntries.some(entry => (
      entry === rudiRoot || entry.startsWith(`${rudiRoot}${path.sep}`)
    )), false);
  });
});
