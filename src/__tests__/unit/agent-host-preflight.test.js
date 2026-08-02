import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { inspectAgentHost } from '../../agent-host/preflight.js';

describe('Agent Host preflight', () => {
  test('prepends stable runtime paths for shebang-based hosts under a restricted daemon environment', async () => {
    const calls = [];
    const binaryPath = '/Users/example/.rudi/runtimes/node/bin/codex';

    const inspected = await inspectAgentHost('codex', {
      binaryPath,
      spawnSyncImpl(command, args, options) {
        calls.push({ args, command, options });
        return { status: 0, stdout: args.includes('--version') ? 'codex 1.0.0' : 'Logged in' };
      },
    });

    assert.equal(inspected.installed, true);
    const pathEntries = calls[0].options.env.PATH.split(path.delimiter);
    assert.equal(pathEntries.includes(path.dirname(binaryPath)), true);
    assert.equal(pathEntries.includes(path.dirname(process.execPath)), true);
  });
});
