import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createLaunchStore } from '../../agent-host/launch-store.js';

const tempRoots = [];

function createStore() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-store-'));
  tempRoots.push(root);
  return createLaunchStore({ databasePath: path.join(root, 'state', 'agent-hosts.db') });
}

function launchProjection(overrides = {}) {
  return {
    executionWorkspace: '/tmp/project-worktree',
    launchId: 'launch_store_test',
    model: 'gpt-5.6-sol',
    originDirectory: '/tmp/project/src',
    outputDestination: '/tmp/rudi-artifacts/launch_store_test',
    projectRoot: '/tmp/project',
    provider: 'codex',
    status: 'starting',
    workspaceMode: 'worktree',
    ...overrides,
  };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host launch store', () => {
  test('persists only the minimal launch projection and maps it back to camelCase', () => {
    const store = createStore();
    try {
      const created = store.create(launchProjection());
      const columns = store.database.prepare('PRAGMA table_info(agent_launches)').all().map(row => row.name);

      assert.equal(created.launchId, 'launch_store_test');
      assert.equal(created.provider, 'codex');
      assert.equal(created.projectRoot, '/tmp/project');
      assert.equal(created.executionWorkspace, '/tmp/project-worktree');
      assert.equal(created.status, 'starting');
      assert.equal(columns.includes('prompt'), false);
      assert.equal(columns.includes('transcript'), false);
      assert.equal(columns.includes('events_json'), false);
      assert.equal(fs.statSync(store.database.name).mode & 0o777, 0o600);
    } finally {
      store.close();
    }
  });

  test('enforces launch state transitions and terminal timestamps', () => {
    const store = createStore();
    try {
      store.create(launchProjection());
      const running = store.transition('launch_store_test', 'running', { pid: 4242 });
      const completed = store.transition('launch_store_test', 'completed', { exitCode: 0 });

      assert.equal(running.pid, 4242);
      assert.equal(completed.exitCode, 0);
      assert.equal(typeof completed.finishedAt, 'string');
      assert.throws(
        () => store.transition('launch_store_test', 'running'),
        /Invalid launch transition: completed -> running/,
      );
    } finally {
      store.close();
    }
  });

  test('stores a provider-owned native session pointer without transcript content', () => {
    const store = createStore();
    try {
      store.create(launchProjection());
      const updated = store.setNativeSessionId('launch_store_test', 'thread_native_123');

      assert.equal(updated.nativeSessionId, 'thread_native_123');
      assert.equal(store.get('launch_store_test').nativeSessionId, 'thread_native_123');
    } finally {
      store.close();
    }
  });

  test('links a resumed process launch to its prior RUDI launch projection', () => {
    const store = createStore();
    try {
      store.create(launchProjection());
      store.setNativeSessionId('launch_store_test', 'thread_native_123');
      store.transition('launch_store_test', 'failed', { exitCode: 1, lastError: 'provider failed' });

      const resumed = store.create(launchProjection({
        launchId: 'launch_store_resume',
        nativeSessionId: 'thread_native_123',
        parentLaunchId: 'launch_store_test',
      }));

      assert.equal(resumed.parentLaunchId, 'launch_store_test');
      assert.equal(resumed.nativeSessionId, 'thread_native_123');
      assert.deepEqual(
        store.list({ limit: 10 }).map(item => item.launchId),
        ['launch_store_resume', 'launch_store_test'],
      );
    } finally {
      store.close();
    }
  });

  test('tracks detached worker ownership and artifact disposition without storing request content', () => {
    const store = createStore();
    try {
      const created = store.create(launchProjection({
        executionKind: 'detached',
        ownerPid: 8181,
      }));

      assert.equal(created.executionKind, 'detached');
      assert.equal(created.ownerPid, 8181);
      assert.equal(created.disposition, 'retained');

      const running = store.transition('launch_store_test', 'running', { pid: 9191 });
      assert.equal(running.ownerPid, 8181);

      const completed = store.transition('launch_store_test', 'completed', { exitCode: 0 });
      assert.equal(completed.ownerPid, null);

      const promoted = store.setDisposition('launch_store_test', 'promoted');
      assert.equal(promoted.disposition, 'promoted');
      assert.throws(
        () => store.setDisposition('launch_store_test', 'discarded'),
        /already promoted/,
      );

      const serialized = JSON.stringify(promoted);
      assert.equal(serialized.includes('prompt'), false);
      assert.equal(serialized.includes('transcript'), false);
    } finally {
      store.close();
    }
  });

  test('projects a group over child launch pointers without storing task prompts', () => {
    const store = createStore();
    try {
      store.createGroup({
        groupId: 'group_store_test',
        originDirectory: '/tmp/project',
        tasks: [
          { launchId: 'launch_group_one', provider: 'claude' },
          { launchId: 'launch_group_two', provider: 'codex' },
        ],
        workspace: '/tmp/project',
        workspaceMode: 'worktree',
      });
      store.create(launchProjection({
        launchId: 'launch_group_one',
        provider: 'claude',
      }));
      store.transition('launch_group_one', 'running');
      store.create(launchProjection({ launchId: 'launch_group_two' }));
      store.transition('launch_group_two', 'failed', { lastError: 'provider unavailable' });

      let group = store.getGroup('group_store_test');
      assert.equal(group.status, 'running');
      assert.deepEqual(group.launches.map(item => item.launchId), [
        'launch_group_one',
        'launch_group_two',
      ]);

      store.transition('launch_group_one', 'completed', { exitCode: 0 });
      group = store.getGroup('group_store_test');
      assert.equal(group.status, 'partial');
      assert.equal(JSON.stringify(group).includes('prompt'), false);

      const groupColumns = store.database
        .prepare('PRAGMA table_info(agent_groups)')
        .all()
        .map(row => row.name);
      const taskColumns = store.database
        .prepare('PRAGMA table_info(agent_group_launches)')
        .all()
        .map(row => row.name);
      assert.equal(groupColumns.includes('prompt'), false);
      assert.equal(taskColumns.includes('prompt'), false);
    } finally {
      store.close();
    }
  });
});
