import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildStackIfNeeded } from '../../commands/install.js';

test('forced stack build runs when a compiled entry point already exists during update', async () => {
  const stackPath = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-build-'));
  try {
    await mkdir(path.join(stackPath, 'dist'));
    await writeFile(path.join(stackPath, 'dist', 'index.js'), 'old build');
    await writeFile(path.join(stackPath, 'package.json'), JSON.stringify({
      scripts: { build: 'build-command' },
    }));

    const calls = [];
    const result = await buildStackIfNeeded(
      stackPath,
      { runtime: 'node', command: ['node', 'dist/index.js'] },
      {
        force: true,
        npmCommand: 'npm-for-test',
        runBuildCommand(command, args, options) {
          calls.push({ command, args, cwd: options.cwd });
        },
      },
    );

    assert.deepEqual(result, { built: true });
    assert.deepEqual(calls, [{
      command: 'npm-for-test',
      args: ['run', 'build'],
      cwd: stackPath,
    }]);
  } finally {
    await rm(stackPath, { recursive: true, force: true });
  }
});
