import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import {
  WORKSPACE_MODES,
  resolveAgentWorkspace,
} from '../../agent-host/workspace.js';

const tempRoots = [];

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-workspace-'));
  tempRoots.push(root);
  return root;
}

function createGitProject(root) {
  const project = path.join(root, 'project');
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(project, 'README.md'), 'workspace fixture\n');
  execFileSync('git', ['init'], { cwd: project, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: project });
  execFileSync('git', ['config', 'user.name', 'RUDI Tests'], { cwd: project });
  execFileSync('git', ['add', 'README.md'], { cwd: project });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: project, stdio: 'pipe' });
  return project;
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host workspace resolver', () => {
  test('uses the Git project directly for read-only work and records the origin separately', () => {
    const root = tempRoot();
    const project = createGitProject(root);
    const origin = path.join(project, 'src', 'nested');
    fs.mkdirSync(origin, { recursive: true });

    const resolved = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId: 'launch_readonly',
      mode: WORKSPACE_MODES.READ_ONLY,
      originDirectory: origin,
      workspace: '.',
    });

    assert.equal(resolved.originDirectory, fs.realpathSync(origin));
    assert.equal(resolved.projectRoot, fs.realpathSync(project));
    assert.equal(resolved.executionWorkspace, fs.realpathSync(project));
    assert.equal(resolved.mode, WORKSPACE_MODES.READ_ONLY);
    assert.equal(resolved.isGitRepository, true);
    assert.equal(resolved.worktreeBranch, null);
  });

  test('creates a dedicated Git worktree for writable work', () => {
    const root = tempRoot();
    const project = createGitProject(root);

    const resolved = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId: 'launch_git_write',
      mode: WORKSPACE_MODES.AUTO,
      originDirectory: project,
    });

    assert.equal(resolved.projectRoot, fs.realpathSync(project));
    assert.equal(resolved.mode, WORKSPACE_MODES.WORKTREE);
    assert.notEqual(resolved.executionWorkspace, resolved.projectRoot);
    assert.equal(fs.existsSync(path.join(resolved.executionWorkspace, 'README.md')), true);
    assert.equal(resolved.worktreeBranch, 'rudi/agent/launch_git_write');
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(resolved.outputDestination, '.rudi-agent-launch.json'), 'utf8')).launchId,
      'launch_git_write',
    );
    assert.equal(
      execFileSync('git', ['branch', '--show-current'], {
        cwd: resolved.executionWorkspace,
        encoding: 'utf8',
      }).trim(),
      resolved.worktreeBranch,
    );
  });

  test('fails closed when Git worktree creation fails', () => {
    const root = tempRoot();
    const project = createGitProject(root);

    assert.throws(
      () => resolveAgentWorkspace({
        artifactsRoot: path.join(root, 'artifacts'),
        launchId: 'launch_worktree_failure',
        mode: WORKSPACE_MODES.AUTO,
        originDirectory: project,
      }, {
        execFileSyncImpl(command, args, options) {
          if (command === 'git' && args[0] === 'worktree') {
            throw new Error('simulated worktree failure');
          }
          return execFileSync(command, args, options);
        },
      }),
      /Unable to create isolated Git worktree.*simulated worktree failure/,
    );
  });

  test('copies a writable non-Git project into the launch artifact directory', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    fs.mkdirSync(path.join(project, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(project, 'nested', 'input.txt'), 'copy me');

    const resolved = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId: 'launch_copy',
      mode: WORKSPACE_MODES.AUTO,
      originDirectory: project,
    });

    assert.equal(resolved.projectRoot, fs.realpathSync(project));
    assert.equal(resolved.mode, WORKSPACE_MODES.ISOLATED_COPY);
    assert.equal(
      fs.readFileSync(path.join(resolved.executionWorkspace, 'nested', 'input.txt'), 'utf8'),
      'copy me',
    );
    assert.equal(resolved.outputDestination, path.join(root, 'artifacts', 'launch_copy'));
  });

  test('uses a non-Git project directly for read-only work', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(project, 'input.txt'), 'read me');

    const resolved = resolveAgentWorkspace({
      artifactsRoot: path.join(root, 'artifacts'),
      launchId: 'launch_plain_readonly',
      mode: WORKSPACE_MODES.READ_ONLY,
      originDirectory: project,
    });

    assert.equal(resolved.projectRoot, fs.realpathSync(project));
    assert.equal(resolved.executionWorkspace, fs.realpathSync(project));
    assert.equal(resolved.mode, WORKSPACE_MODES.READ_ONLY);
    assert.equal(resolved.isGitRepository, false);
    assert.equal(resolved.worktreeBranch, null);
  });

  test('rejects an invalid workspace instead of falling back to the home directory', () => {
    const root = tempRoot();

    assert.throws(
      () => resolveAgentWorkspace({
        artifactsRoot: path.join(root, 'artifacts'),
        launchId: 'launch_missing',
        mode: WORKSPACE_MODES.READ_ONLY,
        originDirectory: root,
        workspace: 'missing',
      }),
      /Workspace does not exist/,
    );
  });

  test('refuses to reuse a pre-existing output destination', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    const output = path.join(root, 'existing-output');
    fs.mkdirSync(project, { recursive: true });
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'user-owned.txt'), 'preserve me');

    assert.throws(
      () => resolveAgentWorkspace({
        artifactsRoot: path.join(root, 'artifacts'),
        launchId: 'launch_existing_output',
        mode: WORKSPACE_MODES.READ_ONLY,
        originDirectory: project,
        outputDirectory: output,
      }),
      /Output destination already exists/,
    );
    assert.equal(fs.readFileSync(path.join(output, 'user-owned.txt'), 'utf8'), 'preserve me');
  });

  test('rejects external symlinks in isolated copies', () => {
    const root = tempRoot();
    const project = path.join(root, 'plain-project');
    const outside = path.join(root, 'outside.txt');
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(outside, 'outside');
    fs.symlinkSync(outside, path.join(project, 'outside-link'));

    assert.throws(
      () => resolveAgentWorkspace({
        artifactsRoot: path.join(root, 'artifacts'),
        launchId: 'launch_symlink',
        mode: WORKSPACE_MODES.AUTO,
        originDirectory: project,
      }),
      /symlink outside the project/,
    );
  });
});
