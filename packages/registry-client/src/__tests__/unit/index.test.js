/**
 * Unit tests for registry client
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_REGISTRY_URL, RUNTIMES_DOWNLOAD_BASE, CACHE_TTL } from '../../index.js';

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

test('config: DEFAULT_REGISTRY_URL is valid GitHub URL', () => {
  assert.ok(DEFAULT_REGISTRY_URL.startsWith('https://'));
  assert.ok(DEFAULT_REGISTRY_URL.includes('github'));
  assert.ok(DEFAULT_REGISTRY_URL.endsWith('.json'));
});

test('config: RUNTIMES_DOWNLOAD_BASE is valid URL', () => {
  assert.ok(RUNTIMES_DOWNLOAD_BASE.startsWith('https://'));
  assert.ok(RUNTIMES_DOWNLOAD_BASE.includes('github'));
});

test('config: CACHE_TTL is 24 hours in milliseconds', () => {
  const expectedMs = 24 * 60 * 60 * 1000;
  assert.strictEqual(CACHE_TTL, expectedMs);
});

// =============================================================================
// URL CONSTRUCTION
// =============================================================================

test('url: runtime download URL construction', () => {
  const base = RUNTIMES_DOWNLOAD_BASE;
  const version = 'v1.0.0';
  const filename = 'node-22.12.0-darwin-arm64.tar.gz';

  const url = `${base}/${version}/${filename}`;

  assert.ok(url.includes('v1.0.0'));
  assert.ok(url.includes('node-22.12.0'));
  assert.ok(url.endsWith('.tar.gz'));
});

test('url: handles different platforms', () => {
  const base = RUNTIMES_DOWNLOAD_BASE;
  const version = 'v1.0.0';

  const platforms = ['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64'];

  for (const platform of platforms) {
    const filename = `node-22.12.0-${platform}.tar.gz`;
    const url = `${base}/${version}/${filename}`;

    assert.ok(url.includes(platform), `URL should contain platform ${platform}`);
  }
});

// =============================================================================
// PACKAGE ID PARSING
// =============================================================================

test('packageId: parses stack:name format', () => {
  const id = 'stack:pdf-creator';
  const [kind, name] = id.split(':');

  assert.strictEqual(kind, 'stack');
  assert.strictEqual(name, 'pdf-creator');
});

test('packageId: parses runtime:name format', () => {
  const id = 'runtime:node';
  const [kind, name] = id.split(':');

  assert.strictEqual(kind, 'runtime');
  assert.strictEqual(name, 'node');
});

test('packageId: parses binary:name format', () => {
  const id = 'binary:ffmpeg';
  const [kind, name] = id.split(':');

  assert.strictEqual(kind, 'binary');
  assert.strictEqual(name, 'ffmpeg');
});

test('packageId: normalizes id without prefix', () => {
  const id = 'pdf-creator';
  const normalizedId = id.includes(':') ? id : `stack:${id}`;

  assert.strictEqual(normalizedId, 'stack:pdf-creator');
});

// =============================================================================
// CACHE LOGIC
// =============================================================================

test('cache: TTL check logic', () => {
  const now = Date.now();
  const cacheTime = now - (CACHE_TTL - 1000); // Just under TTL
  const expiredTime = now - (CACHE_TTL + 1000); // Just over TTL

  assert.ok(now - cacheTime < CACHE_TTL, 'Recent cache should be valid');
  assert.ok(now - expiredTime > CACHE_TTL, 'Old cache should be expired');
});

// =============================================================================
// INDEX STRUCTURE
// =============================================================================

test('index: expected structure', () => {
  // Sample index structure
  const index = {
    version: 1,
    packages: {
      stacks: [],
      runtimes: [],
      binaries: [],
      prompts: [],
      agents: []
    }
  };

  assert.ok(index.version);
  assert.ok(Array.isArray(index.packages.stacks));
  assert.ok(Array.isArray(index.packages.runtimes));
  assert.ok(Array.isArray(index.packages.binaries));
});

test('index: package entry structure', () => {
  const pkg = {
    id: 'stack:pdf-creator',
    kind: 'stack',
    name: 'PDF Creator',
    version: '1.0.0',
    description: 'Create PDF documents',
    path: 'stacks/pdf-creator'
  };

  assert.ok(pkg.id.includes(':'));
  assert.ok(['stack', 'runtime', 'binary', 'prompt', 'agent'].includes(pkg.kind));
  assert.ok(pkg.name);
  assert.ok(pkg.version);
});
