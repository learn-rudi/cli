import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
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

  test('injects only provider-declared RUDI credentials into the authentication probe', async (t) => {
    const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-auth-'));
    t.after(() => fs.rmSync(rudiHome, { force: true, recursive: true }));
    fs.writeFileSync(path.join(rudiHome, 'secrets.json'), JSON.stringify({
      CLAUDE_CODE_OAUTH_TOKEN: 'oauth-test-token',
      UNRELATED_SECRET: 'must-not-be-forwarded',
    }), { mode: 0o600 });

    const calls = [];
    const inspected = await inspectAgentHost('claude', {
      baseEnvironment: { PATH: '/usr/bin:/bin' },
      binaryPath: '/Users/example/.local/bin/claude',
      rudiHome,
      spawnSyncImpl(command, args, options) {
        calls.push({ args, command, options });
        return { status: 0, stdout: args.includes('--version') ? 'claude 1.0.0' : 'Logged in' };
      },
    });

    const authCall = calls.find(call => call.args.join(' ') === 'auth status');
    assert.equal(inspected.authenticated, true);
    assert.equal(authCall.options.env.CLAUDE_CODE_OAUTH_TOKEN, 'oauth-test-token');
    assert.equal(authCall.options.env.UNRELATED_SECRET, undefined);
  });
});
