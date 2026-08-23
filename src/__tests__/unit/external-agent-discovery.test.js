import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getAgentCheck } from '../../commands/check.js';

test('rudi check agent uses Agent Host discovery and reports external ownership', async () => {
  const result = await getAgentCheck('codex', {
    agentHostInspector: async (provider) => ({
      authenticated: true,
      binaryPath: `/Users/example/.local/bin/${provider}`,
      installed: true,
      provider,
      version: 'codex-cli 1.2.3',
    }),
  });

  assert.deepEqual(result, {
    id: 'agent:codex',
    kind: 'agent',
    name: 'codex',
    installed: true,
    source: 'external',
    authenticated: true,
    ready: true,
    path: '/Users/example/.local/bin/codex',
    version: 'codex-cli 1.2.3',
  });
});

test('rudi check normalizes the Google alias to the Antigravity catalog ID', async () => {
  const result = await getAgentCheck('google', {
    agentHostInspector: async () => ({
      authenticated: true,
      binaryPath: '/Users/example/.local/bin/agy',
      installed: true,
      provider: 'antigravity',
      version: 'antigravity 1.2.3',
    }),
  });

  assert.equal(result.id, 'agent:antigravity');
  assert.equal(result.name, 'antigravity');
});

test('unknown external agent names fail closed instead of probing legacy RUDI agent paths', async () => {
  await assert.rejects(
    getAgentCheck('copilot', {
      agentHostInspector: async () => {
        throw new Error('Unknown agent provider: copilot');
      },
    }),
    /Unknown agent provider: copilot/,
  );
});
