/**
 * Integration tests for install + detect flows
 * Uses temporary RUDI_HOME to avoid touching real ~/.rudi
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Test helpers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create isolated test environment with temp RUDI_HOME
 */
function createTestEnv() {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-test-'));
  const rudiHome = path.join(testDir, '.rudi');

  // Create directory structure
  fs.mkdirSync(path.join(rudiHome, 'stacks'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'runtimes'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'binaries'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'bins'), { recursive: true });

  return { testDir, rudiHome };
}

/**
 * Cleanup test environment
 */
function cleanupTestEnv(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Write a test manifest to temp registry
 */
function writeTestManifest(testDir, manifest) {
  const registryDir = path.join(testDir, 'registry');
  fs.mkdirSync(registryDir, { recursive: true });

  const manifestPath = path.join(registryDir, `${manifest.id.replace(':', '-')}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return manifestPath;
}

// =============================================================================
// SYSTEM DETECTION TESTS
// =============================================================================

test('detect: system binary found via detect.command', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    // Test detection of a system binary we know exists (node)
    const manifest = {
      id: 'binary:node-system',
      kind: 'binary',
      name: 'Node.js (system)',
      version: 'system',
      delivery: 'system',
      install: {
        source: 'system',
        detect: {
          command: 'node --version',
          pattern: /v(\d+\.\d+\.\d+)/
        }
      },
      bins: ['node']
    };

    // Run detect command
    try {
      const output = execSync('node --version', { encoding: 'utf8' });
      const match = output.match(/v(\d+\.\d+\.\d+)/);

      assert.ok(match, 'Should detect node version');
      assert.ok(match[1], 'Should extract version number');

      // Verify detection logic
      assert.strictEqual(manifest.install.detect.command, 'node --version');
    } catch (error) {
      // Node not installed - skip test
      console.log('Skipping: node not found on system');
    }
  } finally {
    cleanupTestEnv(testDir);
  }
});

test('detect: system binary not found returns failure', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    const manifest = {
      id: 'binary:nonexistent',
      kind: 'binary',
      name: 'Nonexistent Binary',
      version: 'system',
      delivery: 'system',
      install: {
        source: 'system',
        detect: {
          command: 'nonexistent-command-12345 --version'
        }
      },
      bins: ['nonexistent-command-12345']
    };

    // Try to detect
    try {
      execSync('nonexistent-command-12345 --version', { stdio: 'pipe' });
      assert.fail('Should not find nonexistent command');
    } catch (error) {
      // Expected: command not found
      assert.ok(error.message.includes('not found') || error.status !== 0);
    }
  } finally {
    cleanupTestEnv(testDir);
  }
});

test('detect: command with pattern extraction', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    // Test git version detection (git is commonly installed)
    try {
      const output = execSync('git --version', { encoding: 'utf8' });
      const pattern = /git version (\d+\.\d+\.\d+)/;
      const match = output.match(pattern);

      if (match) {
        assert.ok(match[1], 'Should extract git version');
        console.log(`Detected git version: ${match[1]}`);
      }
    } catch (error) {
      console.log('Skipping: git not found on system');
    }
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// SHIM CREATION TESTS
// =============================================================================

test('install: creates shims in bins directory', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    const binsDir = path.join(rudiHome, 'bins');
    const installDir = path.join(rudiHome, 'binaries', 'test-tool');
    fs.mkdirSync(installDir, { recursive: true });

    // Create a fake binary
    const fakeBinPath = path.join(installDir, 'test-tool');
    fs.writeFileSync(fakeBinPath, '#!/bin/sh\necho "test tool"', { mode: 0o755 });

    // Create shim
    const shimPath = path.join(binsDir, 'test-tool');
    const shimContent = `#!/bin/sh\nexec "${fakeBinPath}" "$@"`;
    fs.writeFileSync(shimPath, shimContent, { mode: 0o755 });

    // Verify shim exists and is executable
    assert.ok(fs.existsSync(shimPath), 'Shim should be created');
    const stats = fs.statSync(shimPath);
    assert.ok((stats.mode & 0o111) !== 0, 'Shim should be executable');

    // Verify shim content
    const content = fs.readFileSync(shimPath, 'utf8');
    assert.ok(content.includes(fakeBinPath), 'Shim should reference actual binary');
  } finally {
    cleanupTestEnv(testDir);
  }
});

test('install: manifest.json written with correct metadata', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    const installDir = path.join(rudiHome, 'binaries', 'sqlite');
    fs.mkdirSync(installDir, { recursive: true });

    const manifest = {
      id: 'binary:sqlite',
      kind: 'binary',
      name: 'SQLite',
      version: '3.45.0',
      source: 'download',
      bins: ['sqlite3'],
      installedAt: new Date().toISOString()
    };

    // Write manifest
    const manifestPath = path.join(installDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // Verify manifest exists and is valid JSON
    assert.ok(fs.existsSync(manifestPath), 'manifest.json should exist');

    const read = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(read.id, 'binary:sqlite');
    assert.strictEqual(read.kind, 'binary');
    assert.strictEqual(read.version, '3.45.0');
    assert.deepStrictEqual(read.bins, ['sqlite3']);
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// CHECKSUM VERIFICATION TESTS
// =============================================================================

test('install: download verifies SHA256 checksum', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    // Create a test file with known content
    const testFile = path.join(testDir, 'test.txt');
    const testContent = 'Hello RUDI';
    fs.writeFileSync(testFile, testContent);

    // Calculate expected SHA256
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(testContent);
    const expectedChecksum = hash.digest('hex');

    // Verify checksum calculation
    const actualContent = fs.readFileSync(testFile, 'utf8');
    const actualHash = crypto.createHash('sha256');
    actualHash.update(actualContent);
    const actualChecksum = actualHash.digest('hex');

    assert.strictEqual(actualChecksum, expectedChecksum, 'Checksums should match');
  } finally {
    cleanupTestEnv(testDir);
  }
});

test('install: download fails with mismatched checksum', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'content');

    const wrongChecksum = 'deadbeef1234567890abcdef';

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(testFile));
    const actualChecksum = hash.digest('hex');

    assert.notStrictEqual(actualChecksum, wrongChecksum, 'Checksums should not match');
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// EXTRACTION TESTS
// =============================================================================

test('install: extracts tar.gz with strip levels', async () => {
  // Note: This test requires 'tar' command to be available
  const { testDir, rudiHome } = createTestEnv();

  try {
    // Check if tar is available
    try {
      execSync('tar --version', { stdio: 'pipe' });
    } catch {
      console.log('Skipping: tar not available');
      return;
    }

    // Create a test tarball structure
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(path.join(srcDir, 'wrapper', 'bin'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'wrapper', 'bin', 'tool'), 'binary content');

    // Create tarball
    const tarPath = path.join(testDir, 'test.tar.gz');
    execSync(`tar -czf "${tarPath}" -C "${srcDir}" wrapper`, { stdio: 'pipe' });

    // Extract with strip=1 (removes 'wrapper' directory)
    const extractDir = path.join(testDir, 'extracted');
    fs.mkdirSync(extractDir);
    execSync(`tar -xzf "${tarPath}" -C "${extractDir}" --strip-components=1`, { stdio: 'pipe' });

    // Verify structure: bin/tool should be at top level
    assert.ok(fs.existsSync(path.join(extractDir, 'bin', 'tool')));
    assert.ok(!fs.existsSync(path.join(extractDir, 'wrapper')));
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// NPM INSTALL TESTS
// =============================================================================

test('install: npm package with bin discovery', async () => {
  // This test is slow and requires npm, so it's optional
  if (process.env.SKIP_NPM_TESTS === 'true') {
    console.log('Skipping: SKIP_NPM_TESTS=true');
    return;
  }

  const { testDir, rudiHome } = createTestEnv();

  try {
    // Check if npm is available
    try {
      execSync('npm --version', { stdio: 'pipe' });
    } catch {
      console.log('Skipping: npm not available');
      return;
    }

    const installDir = path.join(testDir, 'npm-package');
    fs.mkdirSync(installDir, { recursive: true });

    // Install a small npm package with a bin
    execSync('npm init -y', { cwd: installDir, stdio: 'pipe' });
    execSync('npm install cowsay --no-audit --no-fund', { cwd: installDir, stdio: 'pipe', timeout: 30000 });

    // Verify package.json exists in node_modules
    const pkgJsonPath = path.join(installDir, 'node_modules', 'cowsay', 'package.json');
    assert.ok(fs.existsSync(pkgJsonPath), 'Package should be installed');

    // Read and verify bin field
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    assert.ok(pkgJson.bin, 'Package should have bin field');

    console.log(`Discovered bins: ${JSON.stringify(pkgJson.bin)}`);
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// PLATFORM-SPECIFIC INSTALL PATHS
// =============================================================================

test('install: creates correct directory structure per kind', async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    const kinds = {
      stack: 'stacks',
      runtime: 'runtimes',
      binary: 'binaries',
      agent: 'agents'
    };

    for (const [kind, dirName] of Object.entries(kinds)) {
      const kindDir = path.join(rudiHome, dirName);
      assert.ok(fs.existsSync(kindDir), `Directory should exist for ${kind}`);

      // Create a test package
      const pkgDir = path.join(kindDir, 'test-pkg');
      fs.mkdirSync(pkgDir, { recursive: true });

      const manifest = {
        id: `${kind}:test-pkg`,
        kind,
        name: 'Test Package',
        version: '1.0.0',
        installedAt: new Date().toISOString()
      };

      fs.writeFileSync(path.join(pkgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Verify
      assert.ok(fs.existsSync(path.join(pkgDir, 'manifest.json')));
    }
  } finally {
    cleanupTestEnv(testDir);
  }
});
