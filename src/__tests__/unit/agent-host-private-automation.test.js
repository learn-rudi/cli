import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { afterEach, describe, test } from 'node:test';

import { buildLaunchOptions, resolveAgentPrompt } from '../../agent-host/cli-inputs.js';
import { getLaunchArtifactFiles } from '../../agent-host/artifacts.js';
import { launchAgent } from '../../agent-host/launch.js';
import { createLaunchStore } from '../../agent-host/launch-store.js';
import {
  assertPrivateAutomationRawEvent,
  assertPrivateAutomationHostCapabilities,
  createPrivateAutomationProfile,
  PRIVATE_AUTOMATION_MAX_FINAL_OUTPUT_BYTES,
  PRIVATE_AUTOMATION_MAX_RAW_OUTPUT_BYTES,
  projectPrivateAutomationEventMetadata,
} from '../../agent-host/private-automation-profile.js';
import { buildClaudePlan } from '../../agent-host/providers/claude.js';
import { buildCodexPlan } from '../../agent-host/providers/codex.js';
import { resolveAgentWorkspace } from '../../agent-host/workspace.js';
import { cmdAgent } from '../../commands/agent-host.js';

const roots = [];
const privatePrompt = 'PRIVATE_EMAIL_SENTINEL_2f756c2d';
const outputSchema = Object.freeze({
  additionalProperties: false,
  properties: {
    category: { enum: ['conversation', 'unknown'], type: 'string' },
    schemaVersion: { const: 1, type: 'integer' },
  },
  required: ['category', 'schemaVersion'],
  type: 'object',
});

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-private-automation-'));
  roots.push(root);
  const originDirectory = path.join(root, 'origin');
  const artifactsRoot = path.join(root, 'artifacts');
  fs.mkdirSync(originDirectory);
  fs.writeFileSync(path.join(originDirectory, 'private-origin-sentinel.txt'), privatePrompt);
  fs.mkdirSync(artifactsRoot);
  const outputSchemaPath = path.join(root, 'output.schema.json');
  fs.writeFileSync(outputSchemaPath, `${JSON.stringify(outputSchema)}\n`);
  return { artifactsRoot, originDirectory, outputSchemaPath, root };
}

function providerOptions(provider, model, profile, workspace) {
  return {
    binaryPath: `/opt/rudi/bin/${provider}`,
    cwd: workspace.executionWorkspace,
    extraArgs: [],
    images: [],
    model,
    permissionMode: provider === 'codex' ? 'readonly' : 'plan',
    privateAutomationProfile: profile,
    prompt: privatePrompt,
    provider,
    runtimeDirectory: workspace.outputDestination,
    workspaceMode: workspace.mode,
  };
}

function memorySink() {
  let value = '';
  return {
    sink: { write(chunk) { value += String(chunk); } },
    value() { return value; },
  };
}

function privateCodexSpawn(calls, { malformed = false, tool = false } = {}) {
  return (command, args, options) => {
    const child = new EventEmitter();
    child.pid = 9042;
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    let stdin = '';
    child.stdin.on('data', chunk => { stdin += chunk.toString(); });
    child.kill = () => true;
    calls.push({ args, child, command, options, stdin: () => stdin });
    child.stdin.once('finish', () => {
      queueMicrotask(() => {
        child.emit('spawn');
        child.stdout.write(`${JSON.stringify({ type: 'thread.started', thread_id: 'private-session-id' })}\n`);
        if (malformed) {
          child.stdout.write(`${privatePrompt}\n`);
        } else if (tool) {
          child.stdout.write(`${JSON.stringify({
            item: { command: `echo ${privatePrompt}`, id: 'tool-1', type: 'command_execution' },
            type: 'item.started',
          })}\n`);
        } else {
          child.stdout.write(`${JSON.stringify({
            item: {
              id: 'message-1',
              model: 'gpt-5.6-luna',
              text: JSON.stringify({ category: 'conversation', schemaVersion: 1 }),
              type: 'agent_message',
            },
            type: 'item.completed',
          })}\n`);
          child.stdout.write(`${JSON.stringify({
            model: 'gpt-5.6-luna',
            type: 'turn.completed',
            usage: { input_tokens: 25, output_tokens: 8 },
          })}\n`);
        }
        child.stderr.write(`provider diagnostic ${privatePrompt}`);
        child.stdout.end();
        child.stderr.end();
        child.emit('close', malformed || tool ? 1 : 0, null);
      });
    });
    return child;
  };
}

describe('private Agent Host automation profile', () => {
  test('accepts private prompts only from bounded stdin', async () => {
    await assert.rejects(
      resolveAgentPrompt({
        'private-automation': true,
        prompt: privatePrompt,
      }),
      /private automation prompt must be supplied through stdin/u,
    );
    await assert.rejects(
      resolveAgentPrompt({
        'private-automation': true,
        'prompt-file': 'email.txt',
      }),
      /private automation prompt must be supplied through stdin/u,
    );

    const stdin = Readable.from([privatePrompt]);
    stdin.isTTY = false;
    const prompt = await resolveAgentPrompt(
      { 'private-automation': true },
      { stdin },
    );
    assert.equal(prompt, privatePrompt);

    const redirectedFileLikeStdin = Readable.from([privatePrompt]);
    assert.equal(
      await resolveAgentPrompt(
        { 'private-automation': true },
        { stdin: redirectedFileLikeStdin },
      ),
      privatePrompt,
    );
  });

  test('builds exact zero-tool Codex and Claude plans without prompt argv', () => {
    const { artifactsRoot, originDirectory, outputSchemaPath } = fixture();
    const workspace = resolveAgentWorkspace({
      artifactsRoot,
      launchId: 'launch_private_profile_test',
      mode: 'read-only',
      originDirectory,
      privateAutomation: true,
    });
    assert.deepEqual(fs.readdirSync(workspace.executionWorkspace), []);
    assert.notEqual(workspace.executionWorkspace, fs.realpathSync(originDirectory));
    assert.equal(fs.statSync(workspace.executionWorkspace).mode & 0o222, 0);

    const codexProfile = createPrivateAutomationProfile({
      model: 'gpt-5.6-luna',
      outputSchemaPath,
      provider: 'codex',
      timeoutMs: 160_000,
    });
    const codex = buildCodexPlan(providerOptions(
      'codex',
      'gpt-5.6-luna',
      codexProfile,
      workspace,
    ));
    assert.equal(codex.stdin, privatePrompt);
    assert.equal(codex.args.includes(privatePrompt), false);
    const codexExecIndex = codex.args.indexOf('exec');
    assert.notEqual(codexExecIndex, -1);
    assert.equal(codex.args[codexExecIndex + 1], '-');
    assert.equal(codex.args.includes('--ephemeral'), true);
    assert.equal(codex.args.includes('--ignore-user-config'), true);
    assert.equal(codex.args.includes('--ignore-rules'), true);
    assert.equal(codex.args.includes('--output-schema'), true);
    assert.equal(codex.args.includes('gpt-5.6-luna'), true);
    assert.equal(codex.args.includes('--search'), false);
    assert.equal(codex.args.includes('web_search="disabled"'), true);
    assert.equal(codex.args.includes('tools.view_image=false'), true);
    for (const feature of [
      'apps',
      'browser_use',
      'browser_use_external',
      'browser_use_full_cdp_access',
      'code_mode_host',
      'computer_use',
      'enable_mcp_apps',
      'image_generation',
      'in_app_browser',
      'multi_agent',
      'plugins',
      'remote_plugin',
      'shell_snapshot',
      'shell_tool',
      'skill_search',
      'tool_call_mcp_elicitation',
      'tool_suggest',
      'unified_exec',
    ]) {
      assert.deepEqual(
        codex.args.some((arg, index) => (
          arg === '--disable' && codex.args[index + 1] === feature
        )),
        true,
        `Codex private automation must disable ${feature}`,
      );
    }

    const claudeProfile = createPrivateAutomationProfile({
      model: 'claude-sonnet-5',
      outputSchemaPath,
      provider: 'claude',
      timeoutMs: 160_000,
    });
    const claude = buildClaudePlan(providerOptions(
      'claude',
      'claude-sonnet-5',
      claudeProfile,
      workspace,
    ));
    assert.equal(claude.stdin, privatePrompt);
    assert.equal(claude.args.includes(privatePrompt), false);
    assert.equal(claude.args.includes('--no-session-persistence'), true);
    assert.equal(claude.args.includes('--safe-mode'), true);
    assert.equal(claude.args.includes('--no-chrome'), true);
    assert.equal(claude.args.includes('--disable-slash-commands'), true);
    assert.equal(claude.args.includes('--strict-mcp-config'), true);
    assert.equal(claude.args.includes('--json-schema'), true);
    assert.equal(claude.args.includes('--fallback-model'), false);
    const toolsIndex = claude.args.indexOf('--tools');
    assert.notEqual(toolsIndex, -1);
    assert.equal(claude.args[toolsIndex + 1], '');

    for (const plan of [codex, claude]) {
      assert.equal(plan.maxFinalOutputBytes, PRIVATE_AUTOMATION_MAX_FINAL_OUTPUT_BYTES);
      assert.equal(plan.maxRawOutputBytes, PRIVATE_AUTOMATION_MAX_RAW_OUTPUT_BYTES);
      assert.equal(plan.privateAutomationProfile.id, 'private-automation-v1');
      assert.equal(plan.privateAutomationProfile.model, plan.model);
      assert.equal(plan.privateAutomationProfile.timeoutMs, 160_000);
    }
  });

  test('rejects defaults, fallback inputs, aliases, and external schema references', () => {
    const { outputSchemaPath } = fixture();
    assert.throws(
      () => createPrivateAutomationProfile({
        model: undefined,
        outputSchemaPath,
        provider: 'codex',
        timeoutMs: 160_000,
      }),
      /exact model is required/u,
    );
    assert.throws(
      () => createPrivateAutomationProfile({
        fallbackModel: 'claude-opus-5',
        model: 'claude-sonnet-5',
        outputSchemaPath,
        provider: 'claude',
        timeoutMs: 160_000,
      }),
      /fallback model is forbidden/u,
    );
    assert.throws(
      () => createPrivateAutomationProfile({
        model: 'sol',
        outputSchemaPath,
        provider: 'codex',
        timeoutMs: 160_000,
      }),
      /canonical configured model ID/u,
    );

    const externalSchemaPath = path.join(path.dirname(outputSchemaPath), 'external.schema.json');
    fs.writeFileSync(externalSchemaPath, JSON.stringify({
      additionalProperties: false,
      properties: { value: { $ref: 'other.schema.json' } },
      required: ['value'],
      type: 'object',
    }));
    assert.throws(
      () => createPrivateAutomationProfile({
        model: 'gpt-5.6-luna',
        outputSchemaPath: externalSchemaPath,
        provider: 'codex',
        timeoutMs: 160_000,
      }),
      /external schema references are forbidden/u,
    );
  });

  test('projects metadata without model content, prompt, or session identity', () => {
    const metadata = projectPrivateAutomationEventMetadata({
      content: [{ text: privatePrompt, type: 'text' }],
      model: 'gpt-5.6-luna',
      providerSessionId: 'thread_private_123',
      type: 'assistant',
      usage: { inputTokens: 25, outputTokens: 8 },
    });
    assert.deepEqual(metadata, {
      contentBlockCount: 1,
      model: 'gpt-5.6-luna',
      type: 'assistant',
      usage: { inputTokens: 25, outputTokens: 8 },
    });
    const serialized = JSON.stringify(metadata);
    assert.equal(serialized.includes(privatePrompt), false);
    assert.equal(serialized.includes('thread_private_123'), false);

    assert.throws(
      () => projectPrivateAutomationEventMetadata({
        content: [{ id: 'tool-1', input: { query: privatePrompt }, name: 'Bash', type: 'tool_use' }],
        type: 'assistant',
      }),
      /tool event is forbidden/u,
    );
  });

  test('rejects Claude permission, tool, and unknown assistant blocks', () => {
    for (const event of [
      { type: 'system', subtype: 'permission_request' },
      { type: 'assistant', message: { content: [{ type: 'server_tool_use' }] } },
      { type: 'assistant', message: { content: [{ type: 'future_block' }] } },
      { type: 'system', subtype: 'init', tools: ['Bash'] },
    ]) {
      assert.throws(
        () => assertPrivateAutomationRawEvent('claude', event),
        /not allowlisted|not empty/u,
      );
    }
    assert.doesNotThrow(() => assertPrivateAutomationRawEvent('claude', {
      type: 'assistant',
      message: {
        content: [{ text: '{"ok":true}', type: 'text' }],
        model: 'claude-sonnet-5',
      },
    }));
  });

  test('capability-gates exact provider controls before prompt delivery', () => {
    const { outputSchemaPath } = fixture();
    const codexProfile = createPrivateAutomationProfile({
      model: 'gpt-5.6-luna',
      outputSchemaPath,
      provider: 'codex',
      timeoutMs: 160_000,
    });
    const codexHelp = [
      '--ephemeral',
      '--ignore-rules',
      '--ignore-user-config',
      '--output-schema',
      '--sandbox',
    ].join('\n');
    const featureList = [
      'apps',
      'browser_use',
      'browser_use_external',
      'browser_use_full_cdp_access',
      'code_mode_host',
      'computer_use',
      'enable_mcp_apps',
      'image_generation',
      'in_app_browser',
      'multi_agent',
      'plugins',
      'remote_plugin',
      'shell_snapshot',
      'shell_tool',
      'skill_search',
      'tool_call_mcp_elicitation',
      'tool_suggest',
      'unified_exec',
    ].map(feature => `${feature} stable true`).join('\n');
    const calls = [];
    assert.equal(assertPrivateAutomationHostCapabilities({
      binaryPath: '/fake/codex',
      profile: codexProfile,
    }, {
      spawnSyncImpl(command, args) {
        calls.push({ args, command });
        if (calls.length === 1) return { status: 0, stdout: 'codex-cli 0.146.0' };
        if (calls.length === 2) return { status: 0, stdout: codexHelp };
        return { status: 0, stdout: featureList };
      },
    }), true);
    assert.equal(calls[1].args.includes('tools.view_image=false'), true);
    assert.equal(calls[1].args.includes('web_search="disabled"'), true);

    assert.throws(
      () => assertPrivateAutomationHostCapabilities({
        binaryPath: '/fake/codex',
        profile: codexProfile,
      }, {
        spawnSyncImpl: () => ({ status: 0, stdout: 'codex-cli 0.145.0' }),
      }),
      /version does not satisfy private automation config/u,
    );

    const claudeProfile = createPrivateAutomationProfile({
      model: 'claude-sonnet-5',
      outputSchemaPath,
      provider: 'claude',
      timeoutMs: 160_000,
    });
    const claudeHelp = [
      '--disable-slash-commands',
      '--input-format',
      '--json-schema',
      '--mcp-config',
      '--no-chrome',
      '--no-session-persistence',
      '--safe-mode',
      '--setting-sources',
      '--strict-mcp-config',
      '--tools',
    ].join('\n');
    assert.equal(assertPrivateAutomationHostCapabilities({
      binaryPath: '/fake/claude',
      profile: claudeProfile,
    }, {
      spawnSyncImpl: () => ({ status: 0, stdout: claudeHelp }),
    }), true);
  });

  test('isolates the integrated spawn, transient result, database, and launch artifacts', async () => {
    const { artifactsRoot, originDirectory, outputSchemaPath, root } = fixture();
    const profile = createPrivateAutomationProfile({
      model: 'gpt-5.6-luna',
      outputSchemaPath,
      provider: 'codex',
      timeoutMs: 160_000,
    });
    const store = createLaunchStore({ databasePath: path.join(root, 'agent-hosts.db') });
    const stdout = memorySink();
    const stderr = memorySink();
    const calls = [];
    const previousSecret = process.env.UNRELATED_PRIVATE_AUTOMATION_SECRET;
    process.env.UNRELATED_PRIVATE_AUTOMATION_SECRET = privatePrompt;
    try {
      const launch = await launchAgent({
        json: true,
        model: profile.model,
        originDirectory,
        permissionMode: 'readonly',
        privateAutomationProfile: profile,
        prompt: privatePrompt,
        provider: profile.provider,
        timeoutMs: profile.timeoutMs,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot,
        idFactory: () => 'launch_private_integrated',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        privatePreflightImpl: async () => true,
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl: privateCodexSpawn(calls),
        stderr: stderr.sink,
        stdout: stdout.sink,
        store,
      });

      assert.equal(launch.status, 'completed');
      assert.equal(launch.nativeSessionId, null);
      assert.equal(launch.lastError, null);
      assert.equal(calls[0].stdin(), privatePrompt);
      assert.equal(calls[0].args.includes(privatePrompt), false);
      assert.equal(JSON.stringify(calls[0].options.env).includes(privatePrompt), false);
      assert.equal(Object.hasOwn(calls[0].options.env, 'UNRELATED_PRIVATE_AUTOMATION_SECRET'), false);
      assert.equal(calls[0].options.detached, true);
      assert.equal(calls[0].options.stdio[0], 'pipe');
      assert.deepEqual(JSON.parse(stdout.value()), {
        model: 'gpt-5.6-luna',
        output: { category: 'conversation', schemaVersion: 1 },
        provider: 'codex',
        type: 'private-automation.result',
        usage: { inputTokens: 25, outputTokens: 8 },
      });
      assert.equal(stderr.value(), '');
      const persisted = fs.readFileSync(
        getLaunchArtifactFiles(path.join(artifactsRoot, 'launch_private_integrated')).events,
        'utf8',
      );
      assert.equal(persisted.includes(privatePrompt), false);
      assert.equal(persisted.includes('conversation'), false);
      assert.equal(persisted.includes('private-session-id'), false);
      assert.equal(JSON.stringify(store.get('launch_private_integrated')).includes(privatePrompt), false);
    } finally {
      if (previousSecret == null) delete process.env.UNRELATED_PRIVATE_AUTOMATION_SECRET;
      else process.env.UNRELATED_PRIVATE_AUTOMATION_SECRET = previousSecret;
      store.close();
    }
  });

  for (const [label, spawnOptions, expectedError] of [
    ['malformed provider output', { malformed: true }, 'private_output_malformed'],
    ['provider tool execution', { tool: true }, 'private_tool_event'],
  ]) {
    test(`fails closed on ${label} without persisting private content`, async () => {
      const { artifactsRoot, originDirectory, outputSchemaPath, root } = fixture();
      const profile = createPrivateAutomationProfile({
        model: 'gpt-5.6-luna',
        outputSchemaPath,
        provider: 'codex',
        timeoutMs: 160_000,
      });
      const store = createLaunchStore({ databasePath: path.join(root, 'agent-hosts.db') });
      try {
        const launch = await launchAgent({
          model: profile.model,
          originDirectory,
          permissionMode: 'readonly',
          privateAutomationProfile: profile,
          prompt: privatePrompt,
          provider: profile.provider,
          timeoutMs: profile.timeoutMs,
          workspaceMode: 'read-only',
        }, {
          artifactsRoot,
          idFactory: () => `launch_private_${expectedError}`,
          preflightImpl: async () => ({ authenticated: true, installed: true }),
          privatePreflightImpl: async () => true,
          resolveBinaryImpl: () => '/fake/codex',
          spawnImpl: privateCodexSpawn([], spawnOptions),
          stderr: memorySink().sink,
          stdout: memorySink().sink,
          store,
        });
        assert.equal(launch.status, 'failed');
        assert.equal(launch.lastError, `Private automation failed: ${expectedError}`);
        const persisted = fs.readFileSync(
          getLaunchArtifactFiles(path.join(artifactsRoot, `launch_private_${expectedError}`)).events,
          'utf8',
        );
        assert.equal(persisted.includes(privatePrompt), false);
      } finally {
        store.close();
      }
    });
  }

  test('rejects every private detached, resumed, grouped, workspace, and passthrough surface', async () => {
    const { outputSchemaPath, root } = fixture();
    const baseFlags = {
      model: 'gpt-5.6-luna',
      'output-schema': outputSchemaPath,
      'private-automation': true,
      'timeout-ms': 160_000,
    };
    assert.throws(
      () => buildLaunchOptions('codex', privatePrompt, { ...baseFlags, detach: true }, [], root),
      /forbids detached execution/u,
    );
    assert.throws(
      () => buildLaunchOptions('codex', privatePrompt, { ...baseFlags, workspace: '.' }, [], root),
      /forbids --workspace/u,
    );
    assert.throws(
      () => buildLaunchOptions('codex', privatePrompt, baseFlags, ['--search'], root),
      /forbids provider passthrough/u,
    );
    await assert.rejects(
      () => cmdAgent(['resume', 'launch_prior'], baseFlags, [], {}),
      /supports only rudi agent launch/u,
    );
    await assert.rejects(
      () => cmdAgent(['group', 'launch'], baseFlags, [], {}),
      /supports only rudi agent launch/u,
    );
  });

  for (const scenario of [
    {
      expected: 'private_model_unobserved',
      label: 'missing provider-observed model identity',
      write(child) {
        child.stdout.write(`${JSON.stringify({
          item: {
            id: 'message-1',
            text: JSON.stringify({ category: 'conversation', schemaVersion: 1 }),
            type: 'agent_message',
          },
          type: 'item.completed',
        })}\n`);
      },
    },
    {
      expected: 'private_model_mismatch',
      label: 'provider model mismatch',
      write(child) {
        child.stdout.write(`${JSON.stringify({
          item: {
            id: 'message-1',
            model: 'gpt-5.6-sol',
            text: JSON.stringify({ category: 'conversation', schemaVersion: 1 }),
            type: 'agent_message',
          },
          type: 'item.completed',
        })}\n`);
      },
    },
    {
      expected: 'private_raw_output_overflow',
      label: 'aggregate raw output overflow',
      write(child) {
        child.stdout.write(Buffer.alloc(PRIVATE_AUTOMATION_MAX_RAW_OUTPUT_BYTES + 1, 0x78));
      },
    },
    {
      expected: 'private_final_output_overflow',
      label: 'final structured output overflow',
      write(child) {
        child.stdout.write(`${JSON.stringify({
          item: {
            id: 'message-1',
            model: 'gpt-5.6-luna',
            text: JSON.stringify({ value: 'x'.repeat(PRIVATE_AUTOMATION_MAX_FINAL_OUTPUT_BYTES) }),
            type: 'agent_message',
          },
          type: 'item.completed',
        })}\n`);
      },
    },
  ]) {
    test(`fails closed on ${scenario.label}`, async () => {
      const { artifactsRoot, originDirectory, outputSchemaPath, root } = fixture();
      const profile = createPrivateAutomationProfile({
        model: 'gpt-5.6-luna',
        outputSchemaPath,
        provider: 'codex',
        timeoutMs: 160_000,
      });
      const store = createLaunchStore({ databasePath: path.join(root, 'agent-hosts.db') });
      const spawnImpl = () => {
        const child = new EventEmitter();
        child.pid = 9911;
        child.stdin = new PassThrough();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.kill = () => true;
        child.stdin.once('finish', () => queueMicrotask(() => {
          child.emit('spawn');
          scenario.write(child);
          child.stdout.end();
          child.stderr.end();
          child.emit('close', [
            'private_final_output_overflow',
            'private_model_unobserved',
          ].includes(scenario.expected) ? 0 : 1, null);
        }));
        return child;
      };
      try {
        const launch = await launchAgent({
          model: profile.model,
          originDirectory,
          permissionMode: 'readonly',
          privateAutomationProfile: profile,
          prompt: privatePrompt,
          provider: profile.provider,
          timeoutMs: profile.timeoutMs,
          workspaceMode: 'read-only',
        }, {
          artifactsRoot,
          idFactory: () => `launch_${scenario.expected}`,
          preflightImpl: async () => ({ authenticated: true, installed: true }),
          privatePreflightImpl: async () => true,
          resolveBinaryImpl: () => '/fake/codex',
          spawnImpl,
          stderr: memorySink().sink,
          stdout: memorySink().sink,
          store,
        });
        assert.equal(launch.status, 'failed');
        assert.equal(launch.lastError, `Private automation failed: ${scenario.expected}`);
      } finally {
        store.close();
      }
    });
  }

  test('fails closed when Claude omits provider-observed model identity', async () => {
    const { artifactsRoot, originDirectory, outputSchemaPath, root } = fixture();
    const profile = createPrivateAutomationProfile({
      model: 'claude-sonnet-5',
      outputSchemaPath,
      provider: 'claude',
      timeoutMs: 160_000,
    });
    const store = createLaunchStore({ databasePath: path.join(root, 'agent-hosts.db') });
    const spawnImpl = () => {
      const child = new EventEmitter();
      child.pid = 9921;
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => true;
      child.stdin.once('finish', () => queueMicrotask(() => {
        child.emit('spawn');
        child.stdout.write(`${JSON.stringify({
          message: {
            content: [{
              text: JSON.stringify({ category: 'conversation', schemaVersion: 1 }),
              type: 'text',
            }],
          },
          type: 'assistant',
        })}\n`);
        child.stdout.end();
        child.stderr.end();
        child.emit('close', 0, null);
      }));
      return child;
    };
    try {
      const launch = await launchAgent({
        model: profile.model,
        originDirectory,
        permissionMode: 'plan',
        privateAutomationProfile: profile,
        prompt: privatePrompt,
        provider: profile.provider,
        timeoutMs: profile.timeoutMs,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot,
        idFactory: () => 'launch_claude_model_unobserved',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        privatePreflightImpl: async () => true,
        resolveBinaryImpl: () => '/fake/claude',
        spawnImpl,
        stderr: memorySink().sink,
        stdout: memorySink().sink,
        store,
      });
      assert.equal(launch.status, 'failed');
      assert.equal(
        launch.lastError,
        'Private automation failed: private_model_unobserved',
      );
    } finally {
      store.close();
    }
  });

  test('terminates at the private timeout with a stable metadata-only error', async () => {
    const { artifactsRoot, originDirectory, outputSchemaPath, root } = fixture();
    const profile = createPrivateAutomationProfile({
      model: 'gpt-5.6-luna',
      outputSchemaPath,
      provider: 'codex',
      timeoutMs: 5,
    });
    const store = createLaunchStore({ databasePath: path.join(root, 'agent-hosts.db') });
    const spawnImpl = () => {
      const child = new EventEmitter();
      child.pid = 8811;
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      let closed = false;
      child.kill = () => {
        if (!closed) {
          closed = true;
          queueMicrotask(() => child.emit('close', null, 'SIGTERM'));
        }
        return true;
      };
      child.stdin.once('finish', () => queueMicrotask(() => child.emit('spawn')));
      return child;
    };
    try {
      const launch = await launchAgent({
        model: profile.model,
        originDirectory,
        permissionMode: 'readonly',
        privateAutomationProfile: profile,
        prompt: privatePrompt,
        provider: profile.provider,
        timeoutMs: profile.timeoutMs,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot,
        idFactory: () => 'launch_private_timeout',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        privatePreflightImpl: async () => true,
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl,
        stderr: memorySink().sink,
        stdout: memorySink().sink,
        store,
      });
      assert.equal(launch.status, 'failed');
      assert.equal(launch.lastError, 'Private automation failed: private_timeout');
    } finally {
      store.close();
    }
  });
});
