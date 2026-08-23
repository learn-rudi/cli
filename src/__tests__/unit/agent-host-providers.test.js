import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProviderProcessPlan,
  listAgentProviders,
  resolveAgentProviderId,
} from '../../agent-host/providers/index.js';

describe('Agent Host provider adapters', () => {
  test('exposes canonical host IDs while retaining Google as an Antigravity alias', () => {
    assert.deepEqual(listAgentProviders(), ['claude', 'codex', 'antigravity', 'gemini']);
    assert.equal(resolveAgentProviderId('google'), 'antigravity');
    assert.equal(resolveAgentProviderId('antigravity'), 'antigravity');
    assert.equal(resolveAgentProviderId('gemini'), 'gemini');
  });

  test('builds a writable Codex launch with global approvals before exec', () => {
    const plan = buildProviderProcessPlan({
      approvalMode: 'on-request',
      binaryPath: '/fake/codex',
      cwd: '/tmp/worktree',
      model: 'terra',
      prompt: 'Implement this',
      provider: 'codex',
      workspaceMode: 'worktree',
    });

    assert.equal(plan.provider, 'codex');
    assert.equal(plan.model, 'gpt-5.6-terra');
    assert.deepEqual(plan.args.slice(0, 4), [
      '--ask-for-approval',
      'on-request',
      'exec',
      'Implement this',
    ]);
    assert.deepEqual(plan.args.slice(-2), ['-s', 'workspace-write']);
    assert.deepEqual(plan.spawn, { command: '/fake/codex', cwd: '/tmp/worktree' });
  });

  test('uses each provider native resume surface', () => {
    const cases = [
      ['claude', ['--resume', 'native-session']],
      ['codex', ['exec', 'resume', 'native-session']],
      ['google', ['--conversation', 'native-session']],
      ['gemini', ['--resume', 'native-session']],
    ];

    for (const [provider, expectedSequence] of cases) {
      const plan = buildProviderProcessPlan({
        binaryPath: `/fake/${provider}`,
        cwd: '/tmp/workspace',
        nativeSessionId: 'native-session',
        prompt: 'Continue',
        provider,
        workspaceMode: 'read-only',
      });
      assert.equal(
        plan.args.join('\0').includes(expectedSequence.join('\0')),
        true,
        `${provider}: ${plan.args.join(' ')}`,
      );
    }
  });

  test('places Codex resume global flags before exec and omits exec-only color', () => {
    const plan = buildProviderProcessPlan({
      approvalMode: 'on-request',
      binaryPath: '/fake/codex',
      cwd: '/tmp/workspace',
      nativeSessionId: 'native-session',
      prompt: 'Continue',
      provider: 'codex',
      workspaceMode: 'read-only',
    });

    const execIndex = plan.args.indexOf('exec');
    assert.equal(plan.args.indexOf('-C') < execIndex, true);
    assert.equal(plan.args.indexOf('-s') < execIndex, true);
    assert.equal(plan.args.includes('--color'), false);
    assert.equal(plan.args.includes('--json'), true);
  });

  test('rejects unknown models before process launch', () => {
    assert.throws(
      () => buildProviderProcessPlan({
        binaryPath: '/fake/codex',
        cwd: '/tmp/workspace',
        model: 'invented-model',
        prompt: 'hello',
        provider: 'codex',
        workspaceMode: 'read-only',
      }),
      /Unknown model.*invented-model.*codex/,
    );
  });

  test('rejects write-capable permission modes for read-only launches', () => {
    assert.throws(
      () => buildProviderProcessPlan({
        binaryPath: '/fake/claude',
        cwd: '/tmp/workspace',
        permissionMode: 'agent',
        prompt: 'hello',
        provider: 'claude',
        workspaceMode: 'read-only',
      }),
      /permission mode agent is incompatible with read-only workspace mode/,
    );
  });

  test('rejects attachment combinations that the native headless CLI does not model', () => {
    assert.throws(
      () => buildProviderProcessPlan({
        binaryPath: '/fake/claude',
        cwd: '/tmp/workspace',
        images: ['/tmp/image.png'],
        prompt: 'inspect this',
        provider: 'claude',
        workspaceMode: 'read-only',
      }),
      /Claude local image attachments are not exposed as a headless CLI flag/,
    );
  });

  test('appends validated provider-specific arguments after modeled arguments', () => {
    const plan = buildProviderProcessPlan({
      binaryPath: '/fake/gemini',
      cwd: '/tmp/workspace',
      extraArgs: ['--extension', 'example'],
      prompt: 'hello',
      provider: 'gemini',
      workspaceMode: 'read-only',
    });

    assert.deepEqual(plan.args.slice(-2), ['--extension', 'example']);
  });

  test('skips Gemini interactive trust after RUDI resolves an isolated workspace', () => {
    const plan = buildProviderProcessPlan({
      binaryPath: '/fake/gemini',
      cwd: '/tmp/worktree',
      prompt: 'hello',
      provider: 'gemini',
      workspaceMode: 'worktree',
    });

    assert.equal(plan.args.includes('--skip-trust'), true);
  });
});
