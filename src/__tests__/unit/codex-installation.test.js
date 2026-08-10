import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assessCodexOwnership,
  inspectCodexInstallation,
  migrateLegacyCodexInstallation,
} from '../../codex-installation.js';

function createLegacyFixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-codex-ownership-'));
  const rudiHome = path.join(home, '.rudi');
  const runtimeRoot = path.join(rudiHome, 'runtimes', 'node');
  const runtimeBinary = path.join(runtimeRoot, 'bin', 'codex');
  const npm = path.join(runtimeRoot, 'bin', 'npm');
  const runtimePackage = path.join(
    runtimeRoot,
    'lib',
    'node_modules',
    '@openai',
    'codex'
  );
  const shim = path.join(rudiHome, 'bins', 'codex');

  fs.mkdirSync(runtimePackage, { recursive: true });
  fs.mkdirSync(path.dirname(runtimeBinary), { recursive: true });
  fs.mkdirSync(path.dirname(shim), { recursive: true });
  fs.writeFileSync(path.join(runtimePackage, 'package.json'), '{"name":"@openai/codex"}');
  fs.writeFileSync(runtimeBinary, '#!/bin/sh\necho codex-cli 0.147.0\n');
  fs.chmodSync(runtimeBinary, 0o755);
  fs.writeFileSync(npm, '#!/bin/sh\nexit 0\n');
  fs.chmodSync(npm, 0o755);
  fs.symlinkSync(runtimeBinary, shim);

  return { home, rudiHome, npm, runtimeBinary, runtimePackage, shim };
}

test('Codex migration is blocked without a verified standalone binary and preserves legacy files', () => {
  const fixture = createLegacyFixture();

  try {
    const before = inspectCodexInstallation({
      home: fixture.home,
      rudiHome: fixture.rudiHome,
      probeVersion: () => null,
    });
    const result = migrateLegacyCodexInstallation({
      home: fixture.home,
      rudiHome: fixture.rudiHome,
      probeVersion: () => null,
      runCommand: () => {
        throw new Error('cleanup must not run');
      },
    });

    assert.equal(before.standalone.verified, false);
    assert.equal(before.legacy.length >= 3, true);
    assert.equal(result.success, false);
    assert.equal(result.changed, false);
    assert.match(result.error, /chatgpt\.com\/codex\/install\.sh/);
    assert.equal(fs.existsSync(fixture.runtimePackage), true);
    assert.equal(fs.existsSync(fixture.runtimeBinary), true);
    assert.equal(fs.existsSync(fixture.shim), true);
  } finally {
    fs.rmSync(fixture.home, { recursive: true, force: true });
  }
});

test('verified Codex migration removes only legacy RUDI ownership and is idempotent', () => {
  const fixture = createLegacyFixture();
  const standalone = path.join(fixture.home, '.local', 'bin', 'codex');
  let npmCalls = 0;

  fs.mkdirSync(path.dirname(standalone), { recursive: true });
  fs.writeFileSync(standalone, '#!/bin/sh\necho codex-cli 0.148.0\n');
  fs.chmodSync(standalone, 0o755);

  const options = {
    home: fixture.home,
    rudiHome: fixture.rudiHome,
    probeVersion: candidate => (
      candidate === standalone ? 'codex-cli 0.148.0' : null
    ),
    runCommand: (command, args) => {
      npmCalls += 1;
      assert.equal(command, fixture.npm);
      assert.deepEqual(args, [
        'uninstall',
        '--global',
        '--prefix',
        path.join(fixture.rudiHome, 'runtimes', 'node'),
        '@openai/codex',
        '--no-audit',
        '--no-fund',
      ]);
      fs.rmSync(fixture.runtimePackage, { recursive: true, force: true });
      fs.rmSync(fixture.runtimeBinary, { force: true });
      return '';
    },
  };

  try {
    const first = migrateLegacyCodexInstallation(options);
    const afterFirst = inspectCodexInstallation(options);
    const second = migrateLegacyCodexInstallation(options);

    assert.equal(first.success, true);
    assert.equal(first.changed, true);
    assert.equal(afterFirst.standalone.verified, true);
    assert.deepEqual(afterFirst.legacy, []);
    assert.equal(second.success, true);
    assert.equal(second.changed, false);
    assert.equal(npmCalls, 1);
    assert.equal(fs.existsSync(standalone), true);
    assert.throws(() => fs.lstatSync(fixture.shim), /ENOENT/);
  } finally {
    fs.rmSync(fixture.home, { recursive: true, force: true });
  }
});

test('Codex ownership health only offers an automatic fix after standalone verification', () => {
  const base = {
    standalone: {
      path: '/Users/test/.local/bin/codex',
      verified: false,
      version: null,
      reason: 'not installed',
    },
    legacy: [{ path: '/Users/test/.rudi/bins/codex' }],
    externalDuplicates: [],
  };

  const blocked = assessCodexOwnership(base);
  const fixable = assessCodexOwnership({
    ...base,
    standalone: { ...base.standalone, verified: true, version: 'codex-cli 0.148.0' },
  });
  const healthy = assessCodexOwnership({
    ...base,
    standalone: { ...base.standalone, verified: true, version: 'codex-cli 0.148.0' },
    legacy: [],
  });

  assert.equal(blocked.issue, true);
  assert.equal(blocked.fixable, false);
  assert.match(blocked.hint, /chatgpt\.com\/codex\/install\.sh/);
  assert.equal(fixable.issue, true);
  assert.equal(fixable.fixable, true);
  assert.equal(healthy.issue, false);
  assert.equal(healthy.fixable, false);
});

test('system registration metadata is not classified as a legacy Codex installation', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-codex-registration-'));
  const rudiHome = path.join(home, '.rudi');
  const standalone = path.join(home, '.local', 'bin', 'codex');
  const agentPath = path.join(rudiHome, 'agents', 'codex');

  try {
    fs.mkdirSync(path.dirname(standalone), { recursive: true });
    fs.mkdirSync(agentPath, { recursive: true });
    fs.writeFileSync(standalone, '#!/bin/sh\necho codex-cli 0.148.0\n');
    fs.chmodSync(standalone, 0o755);
    fs.writeFileSync(path.join(agentPath, 'manifest.json'), JSON.stringify({
      id: 'agent:codex',
      installType: 'system',
      managed: false,
      source: { type: 'system', path: standalone },
    }));

    const inspection = inspectCodexInstallation({
      home,
      rudiHome,
      probeVersion: () => 'codex-cli 0.148.0',
    });

    assert.equal(inspection.standalone.verified, true);
    assert.deepEqual(inspection.legacy, []);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('Codex migration supports an architecture-specific RUDI Node npm layout', () => {
  const fixture = createLegacyFixture();
  const standalone = path.join(fixture.home, '.local', 'bin', 'codex');
  const archNpm = path.join(
    fixture.rudiHome,
    'runtimes',
    'node',
    process.arch,
    'bin',
    'npm'
  );

  fs.mkdirSync(path.dirname(standalone), { recursive: true });
  fs.writeFileSync(standalone, '#!/bin/sh\necho codex-cli 0.148.0\n');
  fs.chmodSync(standalone, 0o755);
  fs.mkdirSync(path.dirname(archNpm), { recursive: true });
  fs.renameSync(fixture.npm, archNpm);

  try {
    const result = migrateLegacyCodexInstallation({
      home: fixture.home,
      rudiHome: fixture.rudiHome,
      probeVersion: () => 'codex-cli 0.148.0',
      runCommand: (command) => {
        assert.equal(command, archNpm);
        fs.rmSync(fixture.runtimePackage, { recursive: true, force: true });
        fs.rmSync(fixture.runtimeBinary, { force: true });
        return '';
      },
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.inspection.legacy, []);
  } finally {
    fs.rmSync(fixture.home, { recursive: true, force: true });
  }
});
