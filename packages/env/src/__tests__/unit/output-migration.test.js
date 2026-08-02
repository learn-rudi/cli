import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { migrateLegacyOutputDirectory } from '../../index.js';

test('legacy output migration preserves files under canonical outputs and removes the old path', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-output-migration-'));
  const canonicalDir = path.join(tempRoot, 'outputs');
  const legacyDir = path.join(tempRoot, 'output');
  const warnings = [];

  try {
    fs.mkdirSync(path.join(legacyDir, 'pdf'), { recursive: true });
    fs.writeFileSync(path.join(legacyDir, 'pdf', 'report.pdf'), 'pdf-data');
    fs.writeFileSync(path.join(legacyDir, 'summary.md'), 'summary-data');

    const result = migrateLegacyOutputDirectory({
      canonicalDir,
      legacyDir,
      warn: (message) => warnings.push(message)
    });

    assert.equal(result.status, 'migrated');
    assert.deepEqual(result.moved, ['pdf', 'summary.md']);
    assert.deepEqual(result.conflicts, []);
    assert.deepEqual(result.failures, []);
    assert.equal(result.legacyRemoved, true);
    assert.equal(warnings.length, 0);
    assert.equal(fs.readFileSync(path.join(canonicalDir, 'pdf', 'report.pdf'), 'utf8'), 'pdf-data');
    assert.equal(fs.readFileSync(path.join(canonicalDir, 'summary.md'), 'utf8'), 'summary-data');
    assert.equal(fs.existsSync(legacyDir), false);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('legacy output migration never overwrites canonical conflicts', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-output-conflict-'));
  const canonicalDir = path.join(tempRoot, 'outputs');
  const legacyDir = path.join(tempRoot, 'output');
  const warnings = [];

  try {
    fs.mkdirSync(canonicalDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(canonicalDir, 'report.md'), 'canonical-data');
    fs.writeFileSync(path.join(legacyDir, 'report.md'), 'legacy-data');
    fs.writeFileSync(path.join(legacyDir, 'legacy-only.md'), 'move-me');

    const result = migrateLegacyOutputDirectory({
      canonicalDir,
      legacyDir,
      warn: (message) => warnings.push(message)
    });

    assert.equal(result.status, 'partial');
    assert.deepEqual(result.moved, ['legacy-only.md']);
    assert.deepEqual(result.conflicts, ['report.md']);
    assert.deepEqual(result.failures, []);
    assert.equal(result.legacyRemoved, false);
    assert.equal(warnings.length, 1);
    assert.equal(fs.readFileSync(path.join(canonicalDir, 'report.md'), 'utf8'), 'canonical-data');
    assert.equal(fs.readFileSync(path.join(legacyDir, 'report.md'), 'utf8'), 'legacy-data');
    assert.equal(fs.readFileSync(path.join(canonicalDir, 'legacy-only.md'), 'utf8'), 'move-me');
    assert.equal(fs.lstatSync(legacyDir).isDirectory(), true);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('legacy output migration removes an existing compatibility link and is idempotent', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-output-idempotent-'));
  const canonicalDir = path.join(tempRoot, 'outputs');
  const legacyDir = path.join(tempRoot, 'output');

  try {
    fs.mkdirSync(canonicalDir, { recursive: true });
    fs.symlinkSync(
      process.platform === 'win32' ? canonicalDir : 'outputs',
      legacyDir,
      process.platform === 'win32' ? 'junction' : 'dir'
    );

    const first = migrateLegacyOutputDirectory({ canonicalDir, legacyDir });
    const second = migrateLegacyOutputDirectory({ canonicalDir, legacyDir });

    assert.equal(first.status, 'removed-compatibility-link');
    assert.equal(first.legacyRemoved, true);
    assert.equal(fs.existsSync(legacyDir), false);
    assert.equal(second.status, 'not-needed');
    assert.equal(second.legacyRemoved, false);
    assert.deepEqual(second.moved, []);
    assert.deepEqual(second.conflicts, []);
    assert.deepEqual(second.failures, []);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
