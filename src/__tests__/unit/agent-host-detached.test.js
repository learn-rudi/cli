import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  dispatchDetachedAgent,
  runDetachedAgentWorker,
} from '../../agent-host/detached.js';

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host detached worker', () => {
  test('passes the prompt only through worker stdin and returns after the worker acknowledges startup', async () => {
    const calls = [];
    let requestBody = '';
    const spawnImpl = (command, args, options) => {
      const child = new EventEmitter();
      child.pid = 7878;
      child.stdout = new PassThrough();
      child.stdin = new PassThrough();
      child.stdin.on('data', chunk => { requestBody += chunk.toString(); });
      child.stdin.on('end', () => {
        child.stdout.write(`${JSON.stringify({
          launch: { launchId: 'launch_detached_test', status: 'running' },
          ok: true,
        })}\n`);
      });
      child.kill = () => true;
      child.unref = () => { child.unreferenced = true; };
      calls.push({ args, command, options, child });
      queueMicrotask(() => child.emit('spawn'));
      return child;
    };

    const launch = await dispatchDetachedAgent({
      launchId: 'launch_detached_test',
      operation: 'launch',
      options: { prompt: 'pipe-only secret prompt', provider: 'codex' },
    }, {
      entrypoint: '/opt/rudi/index.cjs',
      nodePath: '/usr/bin/node',
      spawnImpl,
      timeoutMs: 1000,
    });

    assert.equal(launch.status, 'running');
    assert.deepEqual(calls[0].args, [
      '/opt/rudi/index.cjs',
      'agent',
      '_worker',
      'launch_detached_test',
    ]);
    assert.equal(calls[0].args.join(' ').includes('pipe-only secret prompt'), false);
    assert.equal(JSON.parse(requestBody).options.prompt, 'pipe-only secret prompt');
    assert.equal(calls[0].options.detached, true);
    assert.equal(calls[0].child.unreferenced, true);
  });

  test('worker writes reconnectable artifacts without persisting the prompt', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-worker-'));
    tempRoots.push(root);
    const launchDirectory = path.join(root, 'launch_worker_test');
    fs.mkdirSync(launchDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(launchDirectory, '.rudi-agent-launch.json'),
      `${JSON.stringify({ launchId: 'launch_worker_test', schemaVersion: 1 })}\n`,
    );
    const acknowledgements = [];
    const store = {
      close() {},
      get() {
        return {
          executionKind: 'detached',
          launchId: 'launch_worker_test',
          outputDestination: launchDirectory,
          status: 'running',
        };
      },
    };
    const launchImpl = async (options, dependencies) => {
      assert.equal(options.prompt, 'transient prompt');
      assert.equal(options.executionKind, 'detached');
      assert.equal(dependencies.ownerPid, 6060);
      dependencies.onSpawn(store.get());
      dependencies.eventSink({ event: { type: 'assistant' }, type: 'agent.event' });
      dependencies.stderr.write('provider warning');
      return { ...store.get(), ownerPid: null, status: 'completed' };
    };

    const result = await runDetachedAgentWorker({
      launchId: 'launch_worker_test',
      request: {
        operation: 'launch',
        options: { prompt: 'transient prompt', provider: 'codex' },
      },
    }, {
      launchImpl,
      ownerPid: 6060,
      sendAcknowledgement: payload => acknowledgements.push(payload),
      store,
    });

    assert.equal(result.status, 'completed');
    assert.equal(acknowledgements[0].ok, true);
    assert.match(fs.readFileSync(path.join(launchDirectory, 'events.jsonl'), 'utf8'), /agent\.event/);
    assert.equal(fs.readFileSync(path.join(launchDirectory, 'events.jsonl'), 'utf8').includes('transient prompt'), false);
    assert.match(fs.readFileSync(path.join(launchDirectory, 'stderr.log'), 'utf8'), /provider warning/);
  });
});
