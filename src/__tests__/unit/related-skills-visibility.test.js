import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getOperatorSkillId,
  getRelatedSkillIds,
  formatOperatorSkillLine,
  formatRelatedSkillsLine,
} from '../../commands/related-skills.js';

test('getOperatorSkillId normalizes the primary operator skill', () => {
  assert.equal(
    getOperatorSkillId({ related: { operatorSkill: 'video-editor' } }),
    'skill:video-editor'
  );
  assert.equal(getOperatorSkillId({}), null);
});

test('formatOperatorSkillLine identifies the primary invokable workflow', () => {
  assert.equal(
    formatOperatorSkillLine({ related: { operatorSkill: 'skill:video-editor' } }),
    'Operator skill: skill:video-editor'
  );
  assert.equal(formatOperatorSkillLine({}), null);
});

test('getRelatedSkillIds normalizes related skill ids from stack metadata', () => {
  assert.deepEqual(
    getRelatedSkillIds({
      related: {
        skills: ['shortform-your-words-script', 'prompt:legacy-skill', 'skill:render-qa', 'stack:not-a-skill', '', null],
      },
    }),
    ['skill:shortform-your-words-script', 'skill:legacy-skill', 'skill:render-qa']
  );
});

test('formatRelatedSkillsLine returns a display line only when related skills exist', () => {
  assert.equal(
    formatRelatedSkillsLine({
      related: {
        skills: ['skill:shortform-your-words-script'],
      },
    }),
    'Related skills: skill:shortform-your-words-script'
  );
  assert.equal(
    formatRelatedSkillsLine({
      related: {
        operatorSkill: 'skill:video-editor',
        skills: ['skill:video-editor', 'skill:render-qa'],
      },
    }),
    'Related skills: skill:render-qa'
  );
  assert.equal(formatRelatedSkillsLine({}), null);
});
