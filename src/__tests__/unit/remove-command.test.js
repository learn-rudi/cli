import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanupRemovedSkill,
  cleanupRemovedStack,
  filterRemovablePackages,
  isPackageInstalledForRemoval,
} from '../../commands/remove.js';

test('cleanupRemovedSkill delegates exact ownership-safe removal across all native hosts', async () => {
  const calls = [];
  const skill = { id: 'skill:demo', kind: 'skill', source: 'rudi' };
  const result = await cleanupRemovedSkill(skill, {
    async removeNativeSkillProjections(options) {
      calls.push(options);
      return {
        results: {
          codex: { action: 'removed', restartRequired: true },
          claude: { action: 'drifted', restartRequired: false },
        },
        failed: 0,
        failures: [],
        restartRequired: true,
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].skill, skill);
  assert.deepEqual(calls[0].hosts, ['codex', 'claude', 'gemini', 'antigravity']);
  assert.equal(result.results.claude.action, 'drifted');
});

test('cleanupRemovedStack removes stack config, orphaned secrets, and cached tools', async () => {
  const calls = [];
  let readCount = 0;
  const beforeConfig = {
    stacks: {
      'stack:slack': {
        secrets: [
          { name: 'SLACK_BOT_TOKEN', required: true },
          'SLACK_CHANNEL_ID',
          { key: 'SHARED_TOKEN', required: false },
        ],
      },
      'stack:other': {
        secrets: [{ name: 'SHARED_TOKEN', required: true }],
      },
    },
  };
  const afterConfig = {
    stacks: {
      'stack:other': {
        secrets: [{ name: 'SHARED_TOKEN', required: true }],
      },
    },
  };

  const result = await cleanupRemovedStack('slack', {
    readRudiConfig() {
      readCount++;
      return readCount === 1 ? beforeConfig : afterConfig;
    },
    removeStack(stackId) {
      calls.push(['removeStack', stackId]);
    },
    async removeSecret(name) {
      calls.push(['removeSecret', name]);
    },
    removeStackFromToolIndex(stackId) {
      calls.push(['removeStackFromToolIndex', stackId]);
      return true;
    },
  });

  assert.deepEqual(calls, [
    ['removeStack', 'stack:slack'],
    ['removeSecret', 'SLACK_BOT_TOKEN'],
    ['removeSecret', 'SLACK_CHANNEL_ID'],
    ['removeStackFromToolIndex', 'stack:slack'],
  ]);
  assert.deepEqual(result, {
    removedSecrets: ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'],
    prunedToolIndex: true,
  });
});

test('filterRemovablePackages excludes external discovered skills', () => {
  const packages = filterRemovablePackages([
    { id: 'skill:local-flat', kind: 'skill', source: 'rudi' },
    { id: 'skill:legacy-local', kind: 'skill' },
    { id: 'skill:pinned-rudi', kind: 'skill', source: { type: 'github' } },
    { id: 'skill:external-docx', kind: 'skill', source: 'claude' },
    { id: 'stack:slack', kind: 'stack' },
  ]);

  assert.deepEqual(packages.map(pkg => pkg.id), [
    'skill:local-flat',
    'skill:legacy-local',
    'skill:pinned-rudi',
    'stack:slack',
  ]);
});

test('explicit legacy agent removal checks removal inventory instead of active package state', async () => {
  const calls = [];
  const installed = await isPackageInstalledForRemoval('agent:codex', {
    isPackageInstalled() {
      assert.fail('active package state must not govern legacy agent cleanup');
    },
    async listInstalled(kind) {
      calls.push(kind);
      return [{ id: 'agent:codex', kind: 'agent' }];
    },
  });

  assert.equal(installed, true);
  assert.deepEqual(calls, ['agent']);
});
