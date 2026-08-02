import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  launchDetachedAgentGroup,
  stopAgentGroup,
} from '../../agent-host/group.js';
import { createLaunchStore } from '../../agent-host/launch-store.js';

const tempRoots = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-group-'));
  tempRoots.push(root);
  const databasePath = path.join(root, 'state', 'agent-hosts.db');
  return {
    databasePath,
    store: createLaunchStore({ databasePath }),
  };
}

function createChild(store, request, status = 'completed') {
  store.create({
    executionKind: 'detached',
    executionWorkspace: '/tmp/project',
    launchId: request.launchId,
    model: 'test-model',
    originDirectory: '/tmp/project',
    outputDestination: `/tmp/artifacts/${request.launchId}`,
    projectRoot: '/tmp/project',
    provider: request.options.provider,
    status: 'starting',
    workspaceMode: 'read-only',
  });
  store.transition(request.launchId, 'running', { pid: 4242 });
  if (status !== 'running') store.transition(request.launchId, status, { exitCode: status === 'completed' ? 0 : 1 });
  return store.get(request.launchId);
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host groups', () => {
  test('dispatches independent detached launches and retains only their pointers', async () => {
    const { store } = fixture();
    const calls = [];
    try {
      const group = await launchDetachedAgentGroup({
        groupId: 'group_parallel_test',
        originDirectory: '/tmp/project',
        tasks: [
          { launchId: 'launch_group_claude', prompt: 'private claude task', provider: 'claude' },
          { launchId: 'launch_group_codex', prompt: 'private codex task', provider: 'codex' },
        ],
        workspace: '/tmp/project',
        workspaceMode: 'read-only',
      }, {
        dispatchImpl: async (request) => {
          calls.push(request);
          return createChild(store, request);
        },
        store,
      });

      assert.equal(group.status, 'completed');
      assert.deepEqual(calls.map(call => call.operation), ['launch', 'launch']);
      assert.deepEqual(calls.map(call => call.options.provider), ['claude', 'codex']);
      assert.equal(JSON.stringify(group).includes('private claude task'), false);
      assert.equal(JSON.stringify(group).includes('private codex task'), false);
    } finally {
      store.close();
    }
  });

  test('records a failed dispatch without losing successfully completed siblings', async () => {
    const { store } = fixture();
    try {
      const group = await launchDetachedAgentGroup({
        groupId: 'group_partial_test',
        originDirectory: '/tmp/project',
        tasks: [
          { launchId: 'launch_group_ok', prompt: 'one', provider: 'codex' },
          { launchId: 'launch_group_bad', prompt: 'two', provider: 'google' },
        ],
        workspace: '/tmp/project',
        workspaceMode: 'read-only',
      }, {
        dispatchImpl: async (request) => {
          if (request.launchId === 'launch_group_bad') throw new Error('provider unavailable');
          return createChild(store, request);
        },
        store,
      });

      assert.equal(group.status, 'partial');
      assert.equal(group.launches[1].status, 'failed');
      assert.match(group.launches[1].lastError, /provider unavailable/);
    } finally {
      store.close();
    }
  });

  test('stops every active child and leaves terminal children alone', async () => {
    const { store } = fixture();
    const stopped = [];
    try {
      store.createGroup({
        groupId: 'group_stop_test',
        originDirectory: '/tmp/project',
        tasks: [
          { launchId: 'launch_group_running', provider: 'codex' },
          { launchId: 'launch_group_done', provider: 'claude' },
        ],
        workspace: '/tmp/project',
        workspaceMode: 'read-only',
      });
      createChild(store, {
        launchId: 'launch_group_running',
        options: { provider: 'codex' },
      }, 'running');
      createChild(store, {
        launchId: 'launch_group_done',
        options: { provider: 'claude' },
      });

      const result = await stopAgentGroup('group_stop_test', {
        stopImpl: async (launchId) => {
          stopped.push(launchId);
          store.transition(launchId, 'stopped');
        },
        store,
      });

      assert.deepEqual(stopped, ['launch_group_running']);
      assert.equal(result.group.status, 'partial');
    } finally {
      store.close();
    }
  });
});
