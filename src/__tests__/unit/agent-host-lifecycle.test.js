import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  diffAgentLaunch,
  discardAgentLaunch,
  promoteAgentLaunch,
  stopAgentLaunch,
} from '../../agent-host/lifecycle.js';
import { createLaunchStore } from '../../agent-host/launch-store.js';
import { resolveAgentWorkspace } from '../../agent-host/workspace.js';

const tempRoots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-lifecycle-'));
  tempRoots.push(root);
  return root;
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function createGitProject(root) {
  const project = path.join(root, 'project');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'tracked.txt'), 'before\n');
  git(project, ['init']);
  git(project, ['config', 'user.email', 'tests@example.com']);
  git(project, ['config', 'user.name', 'RUDI Tests']);
  git(project, ['add', 'tracked.txt']);
  git(project, ['commit', '-m', 'fixture']);
  return project;
}

function persistCompleted(store, workspace, launchId) {
  store.create({
    baseRef: workspace.baseRef,
    executionWorkspace: workspace.executionWorkspace,
    launchId,
    model: 'gpt-5.6-sol',
    originDirectory: workspace.originDirectory,
    outputDestination: workspace.outputDestination,
    projectRoot: workspace.projectRoot,
    provider: 'codex',
    status: 'starting',
    workspaceMode: workspace.mode,
    worktreeBranch: workspace.worktreeBranch,
  });
  store.transition(launchId, 'running', { pid: 1 });
  return store.transition(launchId, 'completed', { exitCode: 0 });
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host launch lifecycle', () => {
  test('shows and promotes tracked and untracked Git worktree changes into a clean base project', () => {
    const root = tempRoot();
    const project = createGitProject(root);
    const launchId = 'launch_git_promote';
    const workspace = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId,
      mode: 'worktree',
      originDirectory: project,
    });
    fs.writeFileSync(path.join(workspace.executionWorkspace, 'tracked.txt'), 'after\n');
    fs.writeFileSync(path.join(workspace.executionWorkspace, 'new.txt'), 'new\n');
    const store = createLaunchStore({ databasePath: path.join(root, 'state.db') });
    try {
      persistCompleted(store, workspace, launchId);

      const diff = diffAgentLaunch(launchId, { store });
      assert.match(diff.patch, /tracked\.txt/);
      assert.deepEqual(diff.untracked, ['new.txt']);

      const promoted = promoteAgentLaunch(launchId, { store });
      assert.equal(promoted.launch.disposition, 'promoted');
      assert.equal(fs.readFileSync(path.join(project, 'tracked.txt'), 'utf8'), 'after\n');
      assert.equal(fs.readFileSync(path.join(project, 'new.txt'), 'utf8'), 'new\n');
      assert.equal(fs.existsSync(workspace.executionWorkspace), false);
      assert.equal(git(project, ['branch', '--list', workspace.worktreeBranch]), '');
    } finally {
      store.close();
    }
  });

  test('refuses Git promotion when the destination project changed after launch', () => {
    const root = tempRoot();
    const project = createGitProject(root);
    const launchId = 'launch_git_conflict';
    const workspace = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId,
      mode: 'worktree',
      originDirectory: project,
    });
    fs.writeFileSync(path.join(workspace.executionWorkspace, 'tracked.txt'), 'agent\n');
    fs.writeFileSync(path.join(project, 'tracked.txt'), 'user\n');
    const store = createLaunchStore({ databasePath: path.join(root, 'state.db') });
    try {
      persistCompleted(store, workspace, launchId);
      assert.throws(
        () => promoteAgentLaunch(launchId, { store }),
        /destination project has uncommitted changes/,
      );
      assert.equal(fs.readFileSync(path.join(project, 'tracked.txt'), 'utf8'), 'user\n');
      assert.equal(store.get(launchId).disposition, 'retained');
    } finally {
      store.close();
    }
  });

  test('promotes an isolated non-Git copy only while the original still matches its baseline', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(project, 'keep.txt'), 'before\n');
    fs.writeFileSync(path.join(project, 'delete.txt'), 'delete\n');
    const launchId = 'launch_copy_promote';
    const workspace = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId,
      mode: 'isolated-copy',
      originDirectory: project,
    });
    fs.writeFileSync(path.join(workspace.executionWorkspace, 'keep.txt'), 'after\n');
    fs.rmSync(path.join(workspace.executionWorkspace, 'delete.txt'));
    fs.writeFileSync(path.join(workspace.executionWorkspace, 'new.txt'), 'new\n');
    const store = createLaunchStore({ databasePath: path.join(root, 'state.db') });
    try {
      persistCompleted(store, workspace, launchId);
      const diff = diffAgentLaunch(launchId, { store });
      assert.deepEqual(
        diff.changes.map(change => `${change.status}:${change.path}`).sort(),
        ['added:new.txt', 'deleted:delete.txt', 'modified:keep.txt'],
      );

      const promoted = promoteAgentLaunch(launchId, { store });
      assert.equal(promoted.launch.disposition, 'promoted');
      assert.equal(fs.readFileSync(path.join(project, 'keep.txt'), 'utf8'), 'after\n');
      assert.equal(fs.existsSync(path.join(project, 'delete.txt')), false);
      assert.equal(fs.readFileSync(path.join(project, 'new.txt'), 'utf8'), 'new\n');
    } finally {
      store.close();
    }
  });

  test('discards only an owned isolated launch directory', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(project, 'input.txt'), 'before\n');
    const launchId = 'launch_copy_discard';
    const workspace = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId,
      mode: 'isolated-copy',
      originDirectory: project,
    });
    const store = createLaunchStore({ databasePath: path.join(root, 'state.db') });
    try {
      persistCompleted(store, workspace, launchId);
      const discarded = discardAgentLaunch(launchId, { store });
      assert.equal(discarded.launch.disposition, 'discarded');
      assert.equal(fs.existsSync(workspace.outputDestination), false);
      assert.equal(fs.readFileSync(path.join(project, 'input.txt'), 'utf8'), 'before\n');
    } finally {
      store.close();
    }
  });

  test('stops only the verified detached worker that owns an active launch', async () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    fs.mkdirSync(project, { recursive: true });
    const launchId = 'launch_detached_stop';
    const workspace = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId,
      mode: 'read-only',
      originDirectory: project,
    });
    const store = createLaunchStore({ databasePath: path.join(root, 'state.db') });
    const signals = [];
    try {
      store.create({
        executionKind: 'detached',
        executionWorkspace: workspace.executionWorkspace,
        launchId,
        model: 'gpt-5.6-sol',
        originDirectory: workspace.originDirectory,
        outputDestination: workspace.outputDestination,
        ownerPid: 4242,
        projectRoot: workspace.projectRoot,
        provider: 'codex',
        status: 'starting',
        workspaceMode: workspace.mode,
      });
      store.transition(launchId, 'running', { pid: 4343 });

      const result = await stopAgentLaunch(launchId, {
        pollIntervalMs: 1,
        signalProcess(pid, signal) {
          signals.push({ pid, signal });
          queueMicrotask(() => store.transition(launchId, 'stopped', { lastError: 'stopped by test' }));
        },
        store,
        timeoutMs: 100,
        verifyWorkerImpl: () => true,
      });

      assert.deepEqual(signals, [{ pid: 4242, signal: 'SIGTERM' }]);
      assert.equal(result.launch.status, 'stopped');
      assert.equal(result.alreadyTerminal, false);
    } finally {
      store.close();
    }
  });
});
