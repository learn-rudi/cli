import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  copyPathWithoutOverwrite,
  createStackUpdateSnapshot,
  discardStackUpdateSnapshot,
  restoreStackUpdateSnapshot,
} from '../../commands/update.js';

test('compensation copies files without deleting the exact staged source', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-compensation-'));
  const stagedPath = path.join(root, 'staged.txt');
  const currentPath = path.join(root, 'current.txt');
  try {
    await writeFile(stagedPath, 'exact failed state');

    await copyPathWithoutOverwrite(stagedPath, currentPath, 'failed file');

    assert.equal(await readFile(currentPath, 'utf8'), 'exact failed state');
    assert.equal(await readFile(stagedPath, 'utf8'), 'exact failed state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('compensation copies directories without deleting the exact staged source', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-compensation-'));
  const stagedPath = path.join(root, 'staged');
  const currentPath = path.join(root, 'current');
  try {
    await mkdir(stagedPath, { recursive: true });
    await writeFile(path.join(stagedPath, 'receipt.json'), 'exact failed state');

    await copyPathWithoutOverwrite(stagedPath, currentPath, 'failed directory');

    assert.equal(await readFile(path.join(currentPath, 'receipt.json'), 'utf8'), 'exact failed state');
    assert.equal(await readFile(path.join(stagedPath, 'receipt.json'), 'utf8'), 'exact failed state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('compensation refuses to overwrite a concurrently recreated destination', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-compensation-'));
  const stagedPath = path.join(root, 'staged.txt');
  const currentPath = path.join(root, 'current.txt');
  try {
    await writeFile(stagedPath, 'exact failed state');
    await writeFile(currentPath, 'concurrent state');

    await assert.rejects(
      () => copyPathWithoutOverwrite(stagedPath, currentPath, 'failed file'),
      error => error?.code === 'EEXIST',
    );
    assert.equal(await readFile(currentPath, 'utf8'), 'concurrent state');
    assert.equal(await readFile(stagedPath, 'utf8'), 'exact failed state');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot restores the prior install after a failed mutation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const locksRoot = path.join(root, 'locks');
  const stackPath = path.join(stacksRoot, 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  try {
    await mkdir(path.join(stackPath, 'dist'), { recursive: true });
    await mkdir(path.dirname(lockfilePath), { recursive: true });
    await writeFile(path.join(stackPath, 'dist', 'index.js'), 'old build');
    await writeFile(lockfilePath, 'old lock');

    const snapshot = await createStackUpdateSnapshot(stackPath, {
      lockfilePath,
      locksRoot,
      stacksRoot,
    });
    await writeFile(path.join(stackPath, 'dist', 'index.js'), 'broken build');
    await writeFile(path.join(stackPath, 'partial.js'), 'partial download');
    await writeFile(lockfilePath, 'new lock');

    await restoreStackUpdateSnapshot(snapshot, { stacksRoot });

    assert.equal(await readFile(path.join(stackPath, 'dist', 'index.js'), 'utf8'), 'old build');
    assert.equal(await readFile(lockfilePath, 'utf8'), 'old lock');
    await assert.rejects(() => access(path.join(stackPath, 'partial.js')));
    await assert.rejects(() => access(snapshot.backupRoot));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot is discarded after a successful mutation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const locksRoot = path.join(root, 'locks');
  const stackPath = path.join(stacksRoot, 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  try {
    await mkdir(stackPath, { recursive: true });
    await writeFile(path.join(stackPath, 'version.txt'), 'old');

    const snapshot = await createStackUpdateSnapshot(stackPath, {
      lockfilePath,
      locksRoot,
      stacksRoot,
    });
    await writeFile(path.join(stackPath, 'version.txt'), 'new');
    await mkdir(path.dirname(lockfilePath), { recursive: true });
    await writeFile(lockfilePath, 'new lock');
    await discardStackUpdateSnapshot(snapshot, { stacksRoot });

    assert.equal(await readFile(path.join(stackPath, 'version.txt'), 'utf8'), 'new');
    assert.equal(await readFile(lockfilePath, 'utf8'), 'new lock');
    await assert.rejects(() => access(snapshot.backupRoot));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot removes migrated state created by a failed update', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const stateStacksRoot = path.join(root, 'state', 'stacks');
  const locksRoot = path.join(root, 'locks');
  const stackPath = path.join(stacksRoot, 'github');
  const stateRoot = path.join(stateStacksRoot, 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  const installRunsPath = path.join(stackPath, 'runs');
  const migratedRunsPath = path.join(stateRoot, 'runs');
  try {
    await mkdir(installRunsPath, { recursive: true });
    await writeFile(path.join(installRunsPath, 'receipt.json'), 'accepted receipt');

    const snapshot = await createStackUpdateSnapshot(stackPath, {
      lockfilePath,
      locksRoot,
      stacksRoot,
      stateRoot,
      stateStacksRoot,
    });
    await mkdir(stateRoot, { recursive: true });
    await rename(installRunsPath, migratedRunsPath);
    await rm(stackPath, { recursive: true, force: true });
    await mkdir(stackPath, { recursive: true });
    await writeFile(path.join(stackPath, 'partial.js'), 'failed update');

    await restoreStackUpdateSnapshot(snapshot, { stacksRoot, stateStacksRoot });

    assert.equal(
      await readFile(path.join(installRunsPath, 'receipt.json'), 'utf8'),
      'accepted receipt',
    );
    await assert.rejects(() => access(stateRoot));
    await assert.rejects(() => access(snapshot.backupRoot));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot rejects a symlinked ancestor that escapes the managed root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const locksRoot = path.join(root, 'locks');
  const outsideRoot = path.join(root, 'outside');
  const escapedStackPath = path.join(stacksRoot, 'escape', 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  try {
    await mkdir(path.join(outsideRoot, 'github'), { recursive: true });
    await mkdir(stacksRoot, { recursive: true });
    await symlink(outsideRoot, path.join(stacksRoot, 'escape'));

    await assert.rejects(
      () => createStackUpdateSnapshot(escapedStackPath, {
        lockfilePath,
        locksRoot,
        stacksRoot,
      }),
      /symlinked path|outside the managed stack root/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot preflights every component before replacing the failed install', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const stateStacksRoot = path.join(root, 'state', 'stacks');
  const locksRoot = path.join(root, 'locks');
  const stackPath = path.join(stacksRoot, 'github');
  const stateRoot = path.join(stateStacksRoot, 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  try {
    await mkdir(stackPath, { recursive: true });
    await mkdir(stateRoot, { recursive: true });
    await writeFile(path.join(stackPath, 'version.txt'), 'accepted');
    await writeFile(path.join(stateRoot, 'cursor.json'), 'accepted cursor');

    const snapshot = await createStackUpdateSnapshot(stackPath, {
      lockfilePath,
      locksRoot,
      stacksRoot,
      stateRoot,
      stateStacksRoot,
    });
    await writeFile(path.join(stackPath, 'version.txt'), 'failed install');
    await rm(snapshot.stateSnapshotPath, { recursive: true, force: true });

    await assert.rejects(
      () => restoreStackUpdateSnapshot(snapshot, { stacksRoot, stateStacksRoot }),
      /state snapshot/i,
    );
    assert.equal(await readFile(path.join(stackPath, 'version.txt'), 'utf8'), 'failed install');
    assert.equal(await readFile(path.join(stateRoot, 'cursor.json'), 'utf8'), 'accepted cursor');
    await access(snapshot.backupRoot);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('stack update snapshot refuses to rewind state changed after migration', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-update-'));
  const stacksRoot = path.join(root, 'stacks');
  const stateStacksRoot = path.join(root, 'state', 'stacks');
  const locksRoot = path.join(root, 'locks');
  const stackPath = path.join(stacksRoot, 'github');
  const stateRoot = path.join(stateStacksRoot, 'github');
  const lockfilePath = path.join(locksRoot, 'stacks', 'github.lock.yaml');
  const installRunsPath = path.join(stackPath, 'runs');
  try {
    await mkdir(installRunsPath, { recursive: true });
    await writeFile(path.join(installRunsPath, 'receipt.json'), 'accepted receipt');

    const snapshot = await createStackUpdateSnapshot(stackPath, {
      lockfilePath,
      locksRoot,
      stacksRoot,
      stateRoot,
      stateStacksRoot,
    });
    await mkdir(stateRoot, { recursive: true });
    await rename(installRunsPath, path.join(stateRoot, 'runs'));
    await writeFile(path.join(stateRoot, 'concurrent.json'), 'new state');
    await writeFile(path.join(stackPath, 'failed.js'), 'failed install');

    await assert.rejects(
      () => restoreStackUpdateSnapshot(snapshot, { stacksRoot, stateStacksRoot }),
      /state changed during update/i,
    );
    assert.equal(await readFile(path.join(stackPath, 'failed.js'), 'utf8'), 'failed install');
    assert.equal(await readFile(path.join(stateRoot, 'concurrent.json'), 'utf8'), 'new state');
    await access(snapshot.backupRoot);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
