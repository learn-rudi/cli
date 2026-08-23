import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getSearchGuidance } from '../../commands/search.js';

test('agent-only registry results give vendor guidance instead of a RUDI install command', () => {
  assert.deepEqual(getSearchGuidance(['agent']), [
    'Agent Hosts are installed and updated by their vendors.',
    'Inspect readiness with: rudi agent hosts --json',
  ]);
});

test('mixed registry results distinguish installable packages from external Agent Hosts', () => {
  assert.deepEqual(getSearchGuidance(['stack', 'agent']), [
    'Install RUDI packages with: rudi install <package-id>',
    'Agent Hosts are installed and updated by their vendors.',
    'Inspect readiness with: rudi agent hosts --json',
  ]);
});
