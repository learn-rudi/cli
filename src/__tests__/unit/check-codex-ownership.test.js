import assert from 'node:assert/strict';
import test from 'node:test';

import { getCodexCheckResult } from '../../commands/check.js';

test('rudi check reports verified standalone Codex instead of a legacy RUDI copy', () => {
  const result = getCodexCheckResult({
    standalone: {
      path: '/Users/test/.local/bin/codex',
      verified: true,
      version: 'codex-cli 0.148.0',
    },
    legacy: [{ path: '/Users/test/.rudi/bins/codex' }],
    externalDuplicates: [],
  });

  assert.equal(result.installed, true);
  assert.equal(result.source, 'system');
  assert.equal(result.path, '/Users/test/.local/bin/codex');
  assert.equal(result.version, '0.148.0');
  assert.deepEqual(result.legacyPaths, ['/Users/test/.rudi/bins/codex']);
});
