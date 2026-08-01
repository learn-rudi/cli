import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  activateInstalledStack,
  buildRelatedSkillInstallPlan,
  getRelatedSkillInstallMode,
  syncRelatedSkillWrappers,
} from '../../commands/install.js';

const resolvedStack = {
  id: 'stack:video-editor',
  kind: 'stack',
  relatedSkills: [
    {
      id: 'skill:shortform-your-words-script',
      kind: 'skill',
      name: 'Shortform Your Words Script',
      installed: false,
    },
    {
      id: 'skill:shortform-render-qa',
      kind: 'skill',
      name: 'Shortform Render QA',
      installed: true,
    },
  ],
};

test('getRelatedSkillInstallMode maps explicit related-skill flags', () => {
  assert.equal(getRelatedSkillInstallMode({ 'with-related-skills': true }), 'include');
  assert.equal(getRelatedSkillInstallMode({ withRelatedSkills: true }), 'include');
  assert.equal(getRelatedSkillInstallMode({ 'no-related-skills': true }), 'skip');
  assert.equal(getRelatedSkillInstallMode({ noRelatedSkills: true }), 'skip');
  assert.equal(getRelatedSkillInstallMode({}), 'offer');
});

test('buildRelatedSkillInstallPlan only installs missing related skills when explicitly requested', () => {
  const include = buildRelatedSkillInstallPlan(resolvedStack, { 'with-related-skills': true });
  assert.deepEqual(include.missing.map((skill) => skill.id), ['skill:shortform-your-words-script']);
  assert.deepEqual(include.toInstall.map((skill) => skill.id), ['skill:shortform-your-words-script']);

  const skip = buildRelatedSkillInstallPlan(resolvedStack, { 'no-related-skills': true });
  assert.deepEqual(skip.missing.map((skill) => skill.id), ['skill:shortform-your-words-script']);
  assert.deepEqual(skip.toInstall, []);

  const offer = buildRelatedSkillInstallPlan(resolvedStack, {});
  assert.equal(offer.mode, 'offer');
  assert.deepEqual(offer.toInstall, []);
});

test('activateInstalledStack indexes immediately when configured and defers when secrets are missing', async () => {
  const calls = [];
  const indexed = await activateInstalledStack(
    'stack:rudi-share',
    { missingSecrets: [] },
    {
      async indexAllStacks(options) {
        calls.push(options);
        return { indexed: 1, failed: 0, index: { byStack: {} } };
      },
    }
  );

  assert.equal(indexed.status, 'indexed');
  assert.deepEqual(calls[0].stacks, ['stack:rudi-share']);
  assert.equal(typeof calls[0].log, 'function');

  const deferred = await activateInstalledStack(
    'stack:rudi-share',
    { missingSecrets: ['RUDI_SHARE_TOKEN'] },
    { indexAllStacks: async () => assert.fail('must not index without required secrets') }
  );
  assert.deepEqual(deferred, {
    status: 'pending_secrets',
    missingSecrets: ['RUDI_SHARE_TOKEN'],
  });
});

test('syncRelatedSkillWrappers creates non-destructive Codex and Claude wrappers for newly installed skills', async () => {
  const calls = [];
  const result = await syncRelatedSkillWrappers(
    resolvedStack.relatedSkills,
    [{
      id: 'skill:shortform-your-words-script',
      success: true,
      path: '/tmp/shortform-your-words-script.md',
    }],
    [{ id: 'codex' }, { id: 'claude-code' }, { id: 'cursor' }],
    {
      async syncCodexSkills(options) {
        calls.push(['codex', options]);
        return { results: [{ action: 'created' }] };
      },
      async syncClaudeSkills(options) {
        calls.push(['claude', options]);
        return { results: [{ action: 'created' }] };
      },
    }
  );

  assert.deepEqual(calls.map((call) => call[0]), ['codex', 'claude']);
  assert.equal(calls[0][1].force, false);
  assert.equal(calls[0][1].skills[0].entryPath, '/tmp/shortform-your-words-script.md');
  assert.deepEqual(result.targets, ['codex', 'claude']);
});
