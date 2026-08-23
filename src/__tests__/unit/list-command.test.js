import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDetectedAgentConfigurationJson } from '../../commands/list.js';

test('detected agent JSON preserves the installedAgents compatibility alias', () => {
  const configuredAgents = [{ id: 'codex', configFile: '/tmp/config.toml' }];
  const summary = { codex: { serverCount: 1 } };

  assert.deepEqual(buildDetectedAgentConfigurationJson(configuredAgents, summary), {
    configuredAgents,
    installedAgents: configuredAgents,
    summary,
  });
});
