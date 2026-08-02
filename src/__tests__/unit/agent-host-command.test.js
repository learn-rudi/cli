import { Readable } from 'node:stream';
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  cmdAgent,
  resolveAgentPrompt,
} from '../../commands/agent-host.js';

const tempRoots = [];
const originalLog = console.log;
const originalError = console.error;

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-command-'));
  tempRoots.push(root);
  return root;
}

function captureConsole() {
  const lines = [];
  console.log = (...args) => lines.push(args.join(' '));
  console.error = (...args) => lines.push(args.join(' '));
  return lines;
}

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exitCode = undefined;
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('rudi agent command', () => {
  test('reads a bounded prompt from stdin when no prompt flag is provided', async () => {
    const stdin = Readable.from(['Explain ', 'this repository']);
    stdin.isTTY = false;

    assert.equal(
      await resolveAgentPrompt({}, { originDirectory: process.cwd(), stdin }),
      'Explain this repository',
    );
  });

  test('rejects conflicting prompt and prompt-file sources', async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, 'task.md'), 'file prompt');

    await assert.rejects(
      () => resolveAgentPrompt({ prompt: 'inline', 'prompt-file': 'task.md' }, {
        originDirectory: root,
        stdin: { isTTY: true },
      }),
      /Use exactly one of --prompt or --prompt-file/,
    );
  });

  test('launch forwards workspace, prompt file, safety mode, and raw provider args', async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, 'task.md'), 'Implement the fixture');
    const calls = [];
    const lines = captureConsole();

    await cmdAgent(['launch', 'codex'], {
      'prompt-file': 'task.md',
      'read-only': true,
      workspace: '.',
    }, ['--strict-config'], {
      launchImpl: async (options) => {
        calls.push(options);
        return { launchId: 'launch_cli', status: 'completed' };
      },
      originDirectory: root,
      stdin: { isTTY: true },
    });

    assert.equal(calls[0].prompt, 'Implement the fixture');
    assert.equal(calls[0].provider, 'codex');
    assert.equal(calls[0].workspace, '.');
    assert.equal(calls[0].workspaceMode, 'read-only');
    assert.deepEqual(calls[0].extraArgs, ['--strict-config']);
    assert.match(lines.join('\n'), /launch_cli/);
  });

  test('detached launch dispatches through the Agent Host service and returns immediately', async () => {
    const root = tempRoot();
    const calls = [];
    const lines = captureConsole();

    const result = await cmdAgent(['launch', 'codex'], {
      detach: true,
      prompt: 'background task',
      workspace: '.',
    }, [], {
      createLaunchIdImpl: () => 'launch_cli_detached',
      dispatchDetachedImpl: async request => {
        calls.push(request);
        return { launchId: request.launchId, provider: 'codex', status: 'running' };
      },
      originDirectory: root,
      stdin: { isTTY: true },
    });

    assert.equal(result.launchId, 'launch_cli_detached');
    assert.equal(calls[0].operation, 'launch');
    assert.equal(calls[0].options.prompt, 'background task');
    assert.equal(calls[0].options.executionKind, undefined);
    assert.match(lines.join('\n'), /launch_cli_detached/);
  });

  test('group launch reads repeated provider task files and dispatches independent launch IDs', async () => {
    const root = tempRoot();
    fs.writeFileSync(path.join(root, 'security.md'), 'Review security');
    fs.writeFileSync(path.join(root, 'implementation.md'), 'Implement safely');
    const calls = [];
    const lines = captureConsole();
    let launchCounter = 0;

    const group = await cmdAgent(['group', 'launch'], {
      detach: true,
      task: ['claude:security.md', 'codex:implementation.md'],
      workspace: '.',
      'workspace-mode': 'worktree',
    }, [], {
      createGroupIdImpl: () => 'group_cli_test',
      createLaunchIdImpl: () => `launch_cli_group_${++launchCounter}`,
      dispatchGroupImpl: async (request) => {
        calls.push(request);
        return {
          groupId: request.groupId,
          launches: request.tasks.map(task => ({
            launchId: task.launchId,
            provider: task.provider,
            status: 'running',
          })),
          status: 'running',
        };
      },
      originDirectory: root,
      stdin: { isTTY: true },
    });

    assert.equal(group.groupId, 'group_cli_test');
    assert.deepEqual(calls[0].tasks.map(task => task.provider), ['claude', 'codex']);
    assert.deepEqual(calls[0].tasks.map(task => task.prompt), [
      'Review security',
      'Implement safely',
    ]);
    assert.deepEqual(calls[0].tasks.map(task => task.launchId), [
      'launch_cli_group_1',
      'launch_cli_group_2',
    ]);
    assert.match(lines.join('\n'), /group_cli_test/);
  });

  test('lifecycle commands dispatch to attach, diff, promote, discard, and stop implementations', async () => {
    const calls = [];
    captureConsole();
    const dependencies = {
      attachImpl: async id => { calls.push(`attach:${id}`); return { launchId: id, status: 'completed' }; },
      diffImpl: id => { calls.push(`diff:${id}`); return { launchId: id, patch: 'diff output' }; },
      discardImpl: id => { calls.push(`discard:${id}`); return { launch: { launchId: id, disposition: 'discarded' } }; },
      promoteImpl: id => { calls.push(`promote:${id}`); return { launch: { launchId: id, disposition: 'promoted' } }; },
      stopDetachedImpl: async id => { calls.push(`stop:${id}`); return { launch: { launchId: id, status: 'stopped' } }; },
    };

    await cmdAgent(['attach', 'launch_cli_lifecycle'], {}, [], dependencies);
    await cmdAgent(['diff', 'launch_cli_lifecycle'], {}, [], dependencies);
    await cmdAgent(['promote', 'launch_cli_lifecycle'], {}, [], dependencies);
    await cmdAgent(['discard', 'launch_cli_lifecycle'], {}, [], dependencies);
    await cmdAgent(['stop', 'launch_cli_lifecycle'], {}, [], dependencies);

    assert.deepEqual(calls, [
      'attach:launch_cli_lifecycle',
      'diff:launch_cli_lifecycle',
      'promote:launch_cli_lifecycle',
      'discard:launch_cli_lifecycle',
      'stop:launch_cli_lifecycle',
    ]);
  });

  test('models emits the provider contract as machine-readable JSON', async () => {
    const lines = captureConsole();

    await cmdAgent(['models', 'google'], { json: true }, [], {});

    const payload = JSON.parse(lines.join('\n'));
    assert.equal(payload.provider, 'google');
    assert.equal(payload.nativeProvider, 'antigravity');
    assert.equal(payload.default, 'gemini-3.1-pro-high');
    assert.equal(payload.models.some(model => model.alias === 'pro'), true);
  });

  test('hosts reports installation, auth, router, and skill preflight state', async () => {
    const lines = captureConsole();

    await cmdAgent(['hosts'], { json: true }, [], {
      inspectHostImpl: async (provider) => ({
        authenticated: provider !== 'gemini' ? true : null,
        authentication: provider !== 'gemini' ? 'authenticated' : 'unknown',
        installed: true,
        provider,
        routerConfigured: true,
        skillsSynchronized: true,
        version: '1.2.3',
      }),
    });

    const payload = JSON.parse(lines.join('\n'));
    assert.equal(payload.hosts.length, 4);
    assert.deepEqual(Object.keys(payload.hosts[0]).sort(), [
      'authenticated',
      'authentication',
      'installed',
      'provider',
      'routerConfigured',
      'skillsSynchronized',
      'version',
    ]);
  });
});
