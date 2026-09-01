import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getSkillCheck } from '../../commands/check.js';

test('getSkillCheck reports the canonical package and accurate per-host projection states', async () => {
  const states = {
    codex: 'current',
    claude: 'drifted',
    gemini: 'missing',
    antigravity: 'unmanaged',
  };
  const result = await getSkillCheck('demo', {
    async listInstalled() {
      return [{
        id: 'skill:demo',
        kind: 'skill',
        name: 'Demo',
        version: '3.1.0',
        source: 'rudi',
        path: '/tmp/rudi/skills/demo',
        entryPath: '/tmp/rudi/skills/demo/SKILL.md',
      }];
    },
    async inspectNativeSkillProjection({ host }) {
      return {
        host,
        state: states[host],
        targetDir: `/tmp/${host}/skills/demo`,
        managed: ['codex', 'claude'].includes(host),
        restartRequired: false,
      };
    },
  });

  assert.equal(result.installed, true);
  assert.equal(result.path, '/tmp/rudi/skills/demo');
  assert.equal(result.version, '3.1.0');
  assert.equal(result.ready, true);
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.projections).map(([host, projection]) => [host, projection.state])),
    states,
  );
});
