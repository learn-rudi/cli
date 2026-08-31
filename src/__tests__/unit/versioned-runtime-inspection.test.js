import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const cliPath = fileURLToPath(new URL('../../index.js', import.meta.url));

function createExecutable(filePath, version) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `#!/bin/sh\nprintf '%s\\n' '${version}'\n`, { mode: 0o755 });
}

function createVersionedRuntime(rudiHome) {
  const runtimeRoot = path.join(rudiHome, 'runtimes', 'node-20-20-2');
  const binaryPath = path.join(runtimeRoot, 'bin', 'node');
  createExecutable(binaryPath, 'v20.20.2');
  fs.writeFileSync(path.join(runtimeRoot, 'manifest.json'), JSON.stringify({
    bins: ['node'],
    id: 'runtime:node-20-20-2',
    kind: 'runtime',
    name: 'Node.js 20.20.2',
    version: '20.20.2',
  }));
  return { binaryPath, runtimeRoot };
}

test('check binds a versioned runtime ID to its manifest-declared executable', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-versioned-runtime-check-'));
  const { binaryPath } = createVersionedRuntime(rudiHome);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      'check',
      'runtime:node-20-20-2',
      '--json',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.deepEqual(JSON.parse(result.stdout), {
      authenticated: null,
      id: 'runtime:node-20-20-2',
      installed: true,
      kind: 'runtime',
      name: 'node-20-20-2',
      path: binaryPath,
      ready: true,
      source: 'rudi',
      version: '20.20.2',
    });
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

test('info separates versioned runtime binaries from preserved shared shims', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-versioned-runtime-info-'));
  const { binaryPath } = createVersionedRuntime(rudiHome);
  const sharedBinaryPath = path.join(rudiHome, 'runtimes', 'node', 'bin', 'node');
  const shimPath = path.join(rudiHome, 'bins', 'node');
  createExecutable(sharedBinaryPath, 'v20.10.0');
  fs.mkdirSync(path.dirname(shimPath), { recursive: true });
  fs.symlinkSync(sharedBinaryPath, shimPath);
  fs.writeFileSync(path.join(rudiHome, 'shim-registry.json'), JSON.stringify({
    node: {
      createdAt: '2026-08-31T00:00:00.000Z',
      owner: 'runtime:node',
      target: sharedBinaryPath,
      type: 'symlink',
    },
  }));

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      'info',
      'runtime:node-20-20-2',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, new RegExp(`Installed: \\u2713 ${binaryPath.replaceAll('\\', '\\\\')}`));
    assert.match(
      result.stdout,
      new RegExp(`Shim: \\u21aa preserved for runtime:node: ${sharedBinaryPath.replaceAll('\\', '\\\\')}`),
    );
    assert.doesNotMatch(result.stdout, new RegExp(`Shim: \\u2713 ${sharedBinaryPath.replaceAll('\\', '\\\\')}`));
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

test('check fails closed when a runtime manifest binary escapes its package root', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-versioned-runtime-escape-'));
  const runtimeRoot = path.join(rudiHome, 'runtimes', 'node-20-20-2');
  fs.mkdirSync(runtimeRoot, { recursive: true });
  fs.writeFileSync(path.join(runtimeRoot, 'manifest.json'), JSON.stringify({
    bins: { node: { path: '../../foreign-node' } },
    id: 'runtime:node-20-20-2',
    kind: 'runtime',
    version: '20.20.2',
  }));
  createExecutable(path.join(rudiHome, 'foreign-node'), 'v99.99.99');

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      'check',
      'runtime:node-20-20-2',
      '--json',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
    const output = JSON.parse(result.stdout);
    assert.equal(output.installed, false);
    assert.equal(output.ready, false);
    assert.match(output.error, /binary escapes its package root/);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

for (const manifestId of [undefined, '']) {
  const label = manifestId === undefined ? 'missing' : 'empty';

  test(`check fails closed when a runtime manifest ID is ${label}`, () => {
    const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), `rudi-versioned-runtime-${label}-id-`));
    const runtimeRoot = path.join(rudiHome, 'runtimes', 'node-20-20-2');
    createExecutable(path.join(runtimeRoot, 'bin', 'node'), 'v20.20.2');
    const manifest = {
      bins: ['node'],
      kind: 'runtime',
      version: '20.20.2',
    };
    if (manifestId !== undefined) manifest.id = manifestId;
    fs.writeFileSync(path.join(runtimeRoot, 'manifest.json'), JSON.stringify(manifest));

    try {
      const result = spawnSync(process.execPath, [
        cliPath,
        'check',
        'runtime:node-20-20-2',
        '--json',
      ], {
        encoding: 'utf8',
        env: { ...process.env, RUDI_HOME: rudiHome },
      });

      assert.equal(result.status, 1, `${result.stderr}\n${result.stdout}`);
      const output = JSON.parse(result.stdout);
      assert.equal(output.installed, false);
      assert.equal(output.ready, false);
      assert.match(output.error, /manifest ID mismatch: expected runtime:node-20-20-2/);
    } finally {
      fs.rmSync(rudiHome, { force: true, recursive: true });
    }
  });
}

test('info keeps an exact shared runtime shim attributed to that runtime', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shared-runtime-info-'));
  const runtimeRoot = path.join(rudiHome, 'runtimes', 'node');
  const binaryPath = path.join(runtimeRoot, 'bin', 'node');
  const shimPath = path.join(rudiHome, 'bins', 'node');
  createExecutable(binaryPath, 'v20.10.0');
  fs.writeFileSync(path.join(runtimeRoot, 'manifest.json'), JSON.stringify({
    bins: ['node'],
    id: 'runtime:node',
    kind: 'runtime',
    name: 'Node.js',
    version: '20.10.0',
  }));
  fs.mkdirSync(path.dirname(shimPath), { recursive: true });
  fs.symlinkSync(binaryPath, shimPath);
  fs.writeFileSync(path.join(rudiHome, 'shim-registry.json'), JSON.stringify({
    node: {
      createdAt: '2026-08-31T00:00:00.000Z',
      owner: 'runtime:node',
      target: binaryPath,
      type: 'symlink',
    },
  }));

  try {
    const result = spawnSync(process.execPath, [cliPath, 'info', 'runtime:node'], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.match(result.stdout, new RegExp(`Installed: \\u2713 ${binaryPath.replaceAll('\\', '\\\\')}`));
    assert.match(result.stdout, new RegExp(`Shim: \\u2713 ${binaryPath.replaceAll('\\', '\\\\')}`));
    assert.match(result.stdout, /Type: symlink \(this package\)/);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});
