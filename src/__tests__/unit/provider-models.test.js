import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  buildArgs,
  getApprovalArgs,
  getModelDef,
  hasCapability,
  listProviders,
  loadProviderConfig,
  resolveModel,
} from '../../commands/agent/providers/index.js';

describe('frontier agent provider registry', () => {
  test('registers all native frontier host contracts', () => {
    assert.deepEqual(listProviders(), ['claude', 'codex', 'gemini', 'antigravity']);
  });

  test('registers the current Claude frontier aliases', () => {
    const config = loadProviderConfig('claude');

    assert.equal(config.models.default, 'claude-opus-5');
    assert.equal(resolveModel(config, 'fable'), 'claude-fable-5');
    assert.equal(resolveModel(config, 'opus'), 'claude-opus-5');
    assert.equal(resolveModel(config, 'sonnet'), 'claude-sonnet-5');
    assert.equal(resolveModel(config, 'haiku'), 'claude-haiku-4-5-20251001');
    assert.equal(hasCapability(config, 'subagents'), true);
    assert.equal(hasCapability(config, 'skills'), true);
    assert.equal(hasCapability(config, 'rawArgs'), true);
  });

  test('registers GPT-5.6 Sol, Terra, and Luna as first-class Codex models', () => {
    const config = loadProviderConfig('codex');

    assert.equal(config.models.default, 'gpt-5.6-sol');
    assert.equal(resolveModel(config, 'sol'), 'gpt-5.6-sol');
    assert.equal(resolveModel(config, 'terra'), 'gpt-5.6-terra');
    assert.equal(resolveModel(config, 'luna'), 'gpt-5.6-luna');
    assert.equal(getModelDef(config, 'sol')?.alias, 'sol');
    assert.equal(hasCapability(config, 'subagents'), true);
    assert.equal(hasCapability(config, 'forkSession'), true);
    assert.equal(hasCapability(config, 'skills'), true);
    assert.equal(hasCapability(config, 'rawArgs'), true);
  });

  test('passes the current Codex model and workspace through to codex exec', () => {
    const config = loadProviderConfig('codex');
    const args = buildArgs(config, {
      prompt: 'hello',
      cwd: '/tmp',
      model: 'gpt-5.6-sol',
    });

    assert.deepEqual(args, [
      'exec',
      'hello',
      '--json',
      '--skip-git-repo-check',
      '--color',
      'never',
      '-C',
      '/tmp',
      '-m',
      'gpt-5.6-sol',
    ]);
  });

  test('describes the current Gemini CLI and Antigravity launch surfaces', () => {
    const gemini = loadProviderConfig('gemini');
    const antigravity = loadProviderConfig('antigravity');

    assert.equal(gemini.binary.name, 'gemini');
    assert.equal(gemini.headless.promptDelivery, 'arg-or-stdin');
    assert.equal(gemini.models.default, 'auto');
    assert.equal(resolveModel(gemini, 'pro'), 'gemini-3.1-pro-preview');
    assert.equal(resolveModel(gemini, 'flash'), 'gemini-3.6-flash');
    assert.equal(resolveModel(gemini, 'flash-lite'), 'gemini-3.5-flash-lite');
    assert.equal(hasCapability(gemini, 'skills'), true);
    assert.equal(hasCapability(gemini, 'subagents'), true);

    assert.equal(antigravity.binary.name, 'agy');
    assert.equal(antigravity.headless.promptDelivery, 'arg');
    assert.equal(hasCapability(antigravity, 'skills'), true);
    assert.equal(hasCapability(antigravity, 'subagents'), true);
    assert.equal(hasCapability(antigravity, 'imageGeneration'), true);
  });

  test('appends validated raw vendor arguments after modeled arguments', () => {
    const config = loadProviderConfig('codex');
    const args = buildArgs(config, {
      prompt: 'hello',
      extraArgs: ['--enable', 'plugins'],
    });

    assert.deepEqual(args.slice(-2), ['--enable', 'plugins']);
  });

  test('places Codex global flags before the exec subcommand', () => {
    const config = loadProviderConfig('codex');
    const args = buildArgs(config, {
      prompt: 'hello',
      approvalPolicy: 'never',
      search: true,
      globalExtraArgs: ['--strict-config'],
    });

    assert.deepEqual(args.slice(0, 6), [
      '--strict-config',
      '--ask-for-approval',
      'never',
      '--search',
      'exec',
      'hello',
    ]);
    assert.deepEqual(getApprovalArgs(config, 'never'), [
      '-c',
      'approval_policy="never"',
    ]);
  });

  test('rejects malformed raw vendor arguments before launch', () => {
    const config = loadProviderConfig('codex');

    assert.throws(
      () => buildArgs(config, { prompt: 'hello', extraArgs: '--enable plugins' }),
      /extraArgs must be an array/,
    );
    assert.throws(
      () => buildArgs(config, { prompt: 'hello', extraArgs: ['ok', 'bad\0arg'] }),
      /extraArgs\[1\]/,
    );
    assert.throws(
      () => buildArgs(config, { prompt: 'hello', globalExtraArgs: [''] }),
      /globalExtraArgs\[0\]/,
    );
  });
});
