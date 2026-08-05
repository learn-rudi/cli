import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-command-'));
const binsDir = path.join(testHome, 'bins');
fs.mkdirSync(binsDir, { recursive: true });

after(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
});

function writeExecutable(filePath, contents = '#!/bin/sh\nexit 0\n') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, { mode: 0o755 });
}

function runShims(...args) {
  return spawnSync(process.execPath, ['src/index.js', 'shims', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      RUDI_HOME: testHome,
    },
  });
}

test('shims check ignores non-executable documentation in the bins directory', () => {
  const target = path.join(testHome, 'tools', 'demo');
  writeExecutable(target);
  writeExecutable(
    path.join(binsDir, 'demo'),
    `#!/usr/bin/env bash\nexec "${target}" "$@"\n`,
  );
  fs.writeFileSync(
    path.join(binsDir, 'README.md'),
    '# Example\n\n```sh\nexec "$TARGET" "$@"\n```\n',
    { mode: 0o644 },
  );

  const result = runShims('check', '--json');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout).map(shim => shim.name), ['demo']);
});

test('shims check classifies executable POSIX shell wrappers', () => {
  const target = path.join(testHome, 'tools', 'posix-demo');
  writeExecutable(target);
  writeExecutable(
    path.join(binsDir, 'posix-demo'),
    `#!/bin/sh\nexec '${target}' "$@"\n`,
  );

  const result = runShims('check', '--json');
  const shims = JSON.parse(result.stdout);
  const shim = shims.find(candidate => candidate.name === 'posix-demo');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(shim.type, 'wrapper');
  assert.equal(shim.target, target);
});

test('shims fix never deletes an unmanaged wrapper it cannot validate', () => {
  const shimPath = path.join(binsDir, 'custom-wrapper');
  writeExecutable(shimPath, `#!/bin/sh
exec "$(dirname "$0")/custom-target" "$@"
`);

  const result = runShims('fix');

  assert.equal(fs.existsSync(shimPath), true, result.stderr || result.stdout);
  assert.match(result.stdout, /Skipping 1 unmanaged shim/);
});
