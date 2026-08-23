import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { launchAgent } from '../../agent-host/launch.js';
import { getLaunchArtifactFiles } from '../../agent-host/artifacts.js';
import { createLaunchStore } from '../../agent-host/launch-store.js';
import { resumeAgent } from '../../agent-host/resume.js';

const tempRoots = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-launch-'));
  tempRoots.push(root);
  const project = path.join(root, 'project');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'input.txt'), 'fixture');
  const store = createLaunchStore({ databasePath: path.join(root, 'state', 'agent-hosts.db') });
  return { project, root, store };
}

function createSink() {
  let value = '';
  return {
    sink: { write(chunk) { value += String(chunk); } },
    value() { return value; },
  };
}

function successfulCodexSpawn(calls) {
  return (command, args, options) => {
    calls.push({ args, command, options });
    const child = new EventEmitter();
    child.pid = 3210;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => true;
    queueMicrotask(() => {
      child.emit('spawn');
      child.stdout.write(`${JSON.stringify({ type: 'thread.started', thread_id: 'native-thread-1' })}\n`);
      child.stdout.write(`${JSON.stringify({
        type: 'item.completed',
        item: { id: 'message-1', type: 'agent_message', text: 'Implemented safely.' },
      })}\n`);
      child.stdout.write(`${JSON.stringify({ type: 'turn.completed', usage: {} })}\n`);
      child.stdout.end();
      child.stderr.end();
      child.emit('close', 0, null);
    });
    return child;
  };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host foreground launch', () => {
  test('reports a missing vendor CLI without offering a RUDI installation fallback', async () => {
    await assert.rejects(
      () => launchAgent({ provider: 'codex', prompt: 'hello' }, {
        resolveBinaryImpl: () => null,
      }),
      (error) => {
        assert.match(error.message, /vendor-managed codex cli was not found/i);
        assert.match(error.message, /rudi agent hosts --json/i);
        assert.doesNotMatch(error.message, /rudi install agent:/i);
        return true;
      },
    );
  });

  test('streams normalized output and persists only the native session pointer', async () => {
    const { project, root, store } = fixture();
    const calls = [];
    const stdout = createSink();
    const stderr = createSink();
    try {
      const launch = await launchAgent({
        model: 'terra',
        prompt: 'Do not store this prompt',
        provider: 'codex',
        workspace: project,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot: path.join(root, 'artifacts'),
        idFactory: () => 'launch_foreground',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl: successfulCodexSpawn(calls),
        stderr: stderr.sink,
        stdout: stdout.sink,
        store,
      });

      assert.equal(launch.status, 'completed');
      assert.equal(launch.nativeSessionId, 'native-thread-1');
      assert.equal(launch.exitCode, 0);
      assert.match(stdout.value(), /Implemented safely\./);
      assert.equal(calls[0].options.cwd, fs.realpathSync(project));
      assert.equal(JSON.stringify(store.get('launch_foreground')).includes('Do not store this prompt'), false);
      const eventsFile = getLaunchArtifactFiles(
        path.join(root, 'artifacts', 'launch_foreground'),
      ).events;
      const persisted = fs.readFileSync(eventsFile, 'utf8');
      assert.match(persisted, /"type":"launch.completed"/);
      assert.equal(persisted.includes('Do not store this prompt'), false);
      assert.equal(persisted.includes('rawEvent'), false);
    } finally {
      store.close();
    }
  });

  test('emits reconnectable events and records detached worker ownership', async () => {
    const { project, root, store } = fixture();
    const events = [];
    const spawned = [];
    try {
      const launch = await launchAgent({
        executionKind: 'detached',
        prompt: 'hello',
        provider: 'codex',
        workspace: project,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot: path.join(root, 'artifacts'),
        eventSink: event => events.push(event),
        idFactory: () => 'launch_detached_events',
        ownerPid: 7171,
        onSpawn: running => spawned.push(running.status),
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl: successfulCodexSpawn([]),
        stderr: createSink().sink,
        stdout: createSink().sink,
        store,
      });

      assert.equal(launch.executionKind, 'detached');
      assert.equal(launch.ownerPid, null);
      assert.equal(events.some(event => event.type === 'agent.event'), true);
      assert.equal(events.at(-1).type, 'launch.completed');
      assert.equal(events.some(event => Object.hasOwn(event, 'rawEvent')), false);
      assert.deepEqual(spawned, ['running']);
    } finally {
      store.close();
    }
  });

  test('persists nonzero provider exits as failed launches', async () => {
    const { project, root, store } = fixture();
    const spawnImpl = () => {
      const child = new EventEmitter();
      child.pid = 555;
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => true;
      queueMicrotask(() => {
        child.emit('spawn');
        child.stderr.write('provider rejected authentication');
        child.stderr.end();
        child.stdout.end();
        child.emit('close', 9, null);
      });
      return child;
    };
    try {
      const launch = await launchAgent({
        prompt: 'hello',
        provider: 'codex',
        workspace: project,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot: path.join(root, 'artifacts'),
        idFactory: () => 'launch_failure',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl,
        stderr: createSink().sink,
        stdout: createSink().sink,
        store,
      });

      assert.equal(launch.status, 'failed');
      assert.equal(launch.exitCode, 9);
      assert.match(launch.lastError, /provider rejected authentication/);
    } finally {
      store.close();
    }
  });

  test('fails the launch coherently when reconnect event persistence fails', async () => {
    const { project, root, store } = fixture();
    try {
      const launch = await launchAgent({
        prompt: 'hello',
        provider: 'codex',
        workspace: project,
        workspaceMode: 'read-only',
      }, {
        artifactsRoot: path.join(root, 'artifacts'),
        eventSink: () => { throw new Error('artifact disk unavailable'); },
        idFactory: () => 'launch_event_sink_failure',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl: successfulCodexSpawn([]),
        stderr: createSink().sink,
        stdout: createSink().sink,
        store,
      });

      assert.equal(launch.status, 'failed');
      assert.match(launch.lastError, /event persistence failed.*artifact disk unavailable/i);
    } finally {
      store.close();
    }
  });

  test('cleans an allocated workspace when provider options fail before persistence', async () => {
    const { project, root, store } = fixture();
    try {
      await assert.rejects(
        () => launchAgent({
          model: 'not-a-real-model',
          prompt: 'hello',
          provider: 'codex',
          workspace: project,
          workspaceMode: 'read-only',
        }, {
          artifactsRoot: path.join(root, 'artifacts'),
          idFactory: () => 'launch_invalid_options',
          preflightImpl: async () => ({ authenticated: true, installed: true }),
          resolveBinaryImpl: () => '/fake/codex',
          store,
        }),
        /Unknown model/,
      );

      assert.equal(fs.existsSync(path.join(root, 'artifacts', 'launch_invalid_options')), false);
      assert.equal(store.get('launch_invalid_options'), null);
    } finally {
      store.close();
    }
  });

  test('resume creates a new RUDI launch linked to the same native provider session', async () => {
    const { project, root, store } = fixture();
    store.create({
      executionWorkspace: project,
      launchId: 'launch_original',
      model: 'gpt-5.6-terra',
      nativeSessionId: 'native-thread-1',
      originDirectory: project,
      outputDestination: path.join(root, 'artifacts', 'launch_original'),
      projectRoot: project,
      provider: 'codex',
      status: 'starting',
      workspaceMode: 'read-only',
    });
    store.transition('launch_original', 'running');
    store.transition('launch_original', 'completed', { exitCode: 0 });
    const calls = [];
    try {
      const resumed = await resumeAgent({
        launchId: 'launch_original',
        prompt: 'Continue safely',
      }, {
        artifactsRoot: path.join(root, 'artifacts'),
        idFactory: () => 'launch_resumed',
        preflightImpl: async () => ({ authenticated: true, installed: true }),
        resolveBinaryImpl: () => '/fake/codex',
        spawnImpl: successfulCodexSpawn(calls),
        stderr: createSink().sink,
        stdout: createSink().sink,
        store,
      });

      assert.equal(resumed.parentLaunchId, 'launch_original');
      assert.equal(resumed.nativeSessionId, 'native-thread-1');
      assert.equal(calls[0].args.join('\0').includes('exec\0resume\0native-thread-1'), true);
    } finally {
      store.close();
    }
  });
});
