import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  activateInstalledStack,
  buildRelatedSkillInstallPlan,
  cmdInstall,
  getExternalAgentInstallGuidance,
  getRelatedSkillInstallMode,
  selectRelatedSkillsForInstall,
  syncRelatedSkillWrappers,
} from '../../commands/install.js';

test('explicit agent install rejects before registry reads or cache writes', async () => {
  const calls = [];
  await cmdInstall(['agent:codex'], {}, {
    error() {},
    exit(code) {
      calls.push(['exit', code]);
    },
    fetchIndex: async () => assert.fail('must not refresh the registry'),
    resolvePackage: async () => assert.fail('must not resolve an external agent package'),
  });

  assert.deepEqual(calls, [['exit', 1]]);
});

test('agent install guidance directs users to vendor ownership and host verification', () => {
  assert.deepEqual(getExternalAgentInstallGuidance({
    id: 'agent:codex',
    kind: 'agent',
    installHints: { manual: 'Use the OpenAI installer.' },
  }), {
    error: 'agent:codex is a vendor-managed Agent Host and cannot be installed by RUDI.',
    install: 'Use the OpenAI installer.',
    verify: 'Verify discovery and authentication with: rudi agent hosts --json',
  });
  assert.equal(getExternalAgentInstallGuidance({ id: 'runtime:node', kind: 'runtime' }), null);
});

const resolvedStack = {
  id: 'stack:video-editor',
  kind: 'stack',
  relatedSkills: [
    {
      id: 'skill:shortform-your-words-script',
      kind: 'skill',
      name: 'Shortform Your Words Script',
      installed: false,
      isOperator: true,
    },
    {
      id: 'skill:shortform-render-qa',
      kind: 'skill',
      name: 'Shortform Render QA',
      installed: false,
      isOperator: false,
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

test('buildRelatedSkillInstallPlan always installs the operator and gates companion skills by mode', () => {
  const include = buildRelatedSkillInstallPlan(resolvedStack, { 'with-related-skills': true });
  assert.equal(include.operatorSkill.id, 'skill:shortform-your-words-script');
  assert.deepEqual(include.missingCompanions.map((skill) => skill.id), ['skill:shortform-render-qa']);
  assert.deepEqual(include.toInstall.map((skill) => skill.id), [
    'skill:shortform-your-words-script',
    'skill:shortform-render-qa',
  ]);

  const skip = buildRelatedSkillInstallPlan(resolvedStack, { 'no-related-skills': true });
  assert.deepEqual(skip.toInstall.map((skill) => skill.id), ['skill:shortform-your-words-script']);

  const offer = buildRelatedSkillInstallPlan(resolvedStack, {});
  assert.equal(offer.mode, 'offer');
  assert.deepEqual(offer.toInstall.map((skill) => skill.id), ['skill:shortform-your-words-script']);
});

test('selectRelatedSkillsForInstall keeps the operator mandatory and companions optional', () => {
  const offer = buildRelatedSkillInstallPlan(resolvedStack, {});
  assert.deepEqual(
    selectRelatedSkillsForInstall(offer, false).map((skill) => skill.id),
    ['skill:shortform-your-words-script']
  );
  assert.deepEqual(
    selectRelatedSkillsForInstall(offer, true).map((skill) => skill.id),
    ['skill:shortform-your-words-script', 'skill:shortform-render-qa']
  );

  const skip = buildRelatedSkillInstallPlan(resolvedStack, { 'no-related-skills': true });
  assert.deepEqual(
    selectRelatedSkillsForInstall(skip, true).map((skill) => skill.id),
    ['skill:shortform-your-words-script']
  );
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
