import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { PATHS } from '@learnrudi/core';

import {
  getBrokenShimGuidance,
  getPackageFromShim,
  removeBrokenLegacyAgentShims,
  repairBrokenShimPackage,
} from '../../commands/shims.js';

test('RUDI Node targets with Agent Host names remain legacy agent shims', () => {
  assert.equal(
    getPackageFromShim('codex', path.join(PATHS.runtimes, 'node', 'bin', 'codex')),
    'agent:codex',
  );
});

test('legacy Agent Host shims are removal-only and never recommend reinstall', () => {
  assert.deepEqual(getBrokenShimGuidance(['agent:codex', 'binary:ffmpeg']), [
    'rudi shims fix',
    'rudi install binary:ffmpeg --force',
  ]);
});

test('shim fix can remove a legacy agent shim without package metadata', () => {
  const removedPaths = [];
  const result = removeBrokenLegacyAgentShims('agent:codex', [{
    name: 'codex',
    package: 'agent:codex',
    valid: false,
  }], {
    binsPath: '/Users/example/.rudi/bins',
    unlinkSyncImpl: path => removedPaths.push(path),
  });

  assert.deepEqual(removedPaths, ['/Users/example/.rudi/bins/codex']);
  assert.deepEqual(result, { failed: [], removed: ['codex'] });
});

test('shim repair never invokes the package installer for legacy agents', async () => {
  const result = await repairBrokenShimPackage('agent:codex', async () => {
    assert.fail('legacy Agent Host shims must not be reinstalled');
  });

  assert.deepEqual(result, {
    error: 'Legacy Agent Host shims are removal-only.',
    package: 'agent:codex',
    removalOnly: true,
    success: false,
  });
});

test('shim repair preserves unsuccessful installer results', async () => {
  const result = await repairBrokenShimPackage('binary:ffmpeg', async () => ({
    error: 'synthetic failure',
    success: false,
  }));

  assert.equal(result.success, false);
  assert.equal(result.error, 'synthetic failure');
});

test('shims fix exits successfully after removing every broken shim', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-fix-'));
  const binsDirectory = path.join(rudiHome, 'bins');
  const shimPath = path.join(binsDirectory, 'orphaned-test-shim');
  fs.mkdirSync(binsDirectory, { recursive: true });
  fs.symlinkSync(path.join(rudiHome, 'missing-target'), shimPath);

  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../index.js', import.meta.url)),
      'shims',
      'fix',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(fs.existsSync(shimPath), false);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

test('shim fix preserves unowned regular files it cannot parse', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-fix-'));
  const binsDirectory = path.join(rudiHome, 'bins');
  const shimPath = path.join(binsDirectory, 'custom-wrapper');
  fs.mkdirSync(binsDirectory, { recursive: true });
  fs.writeFileSync(shimPath, '#!/bin/sh\ncustom_dispatch "$@"\n', { mode: 0o755 });

  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../index.js', import.meta.url)),
      'shims',
      'fix',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(fs.existsSync(shimPath), true);
    assert.match(result.stdout, /Preserved custom-wrapper/);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

test('shim fix preserves an unowned regular wrapper with an Agent Host basename', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-fix-'));
  const binsDirectory = path.join(rudiHome, 'bins');
  const shimPath = path.join(binsDirectory, 'codex');
  fs.mkdirSync(binsDirectory, { recursive: true });
  fs.writeFileSync(shimPath, '#!/bin/sh\ncustom_dispatch "$@"\n', { mode: 0o755 });

  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../index.js', import.meta.url)),
      'shims',
      'fix',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.equal(fs.existsSync(shimPath), true);
    assert.match(result.stdout, /Preserved codex/);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});

test('shim check recognizes static shell wrapper targets', () => {
  const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-check-'));
  const binsDirectory = path.join(rudiHome, 'bins');
  const targetPath = path.join(rudiHome, 'target-tool');
  fs.mkdirSync(binsDirectory, { recursive: true });
  fs.writeFileSync(targetPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  fs.writeFileSync(
    path.join(binsDirectory, 'literal-wrapper'),
    `#!/bin/sh\nexec '${targetPath}' "$@"\n`,
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(binsDirectory, 'variable-wrapper'),
    `#!/bin/sh\nTARGET_BIN="${targetPath}"\nexec "$TARGET_BIN" "$@"\n`,
    { mode: 0o755 },
  );

  try {
    const result = spawnSync(process.execPath, [
      fileURLToPath(new URL('../../index.js', import.meta.url)),
      'shims',
      'check',
      '--json',
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const shims = JSON.parse(result.stdout);
    assert.deepEqual(shims.map(({ name, target, type, valid }) => ({ name, target, type, valid })), [
      { name: 'literal-wrapper', target: targetPath, type: 'wrapper', valid: true },
      { name: 'variable-wrapper', target: targetPath, type: 'wrapper', valid: true },
    ]);
  } finally {
    fs.rmSync(rudiHome, { force: true, recursive: true });
  }
});
