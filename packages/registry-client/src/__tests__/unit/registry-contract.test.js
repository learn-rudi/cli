import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectRegistrySchema,
  listRegistryPackages,
  resolveRegistryPackageForPlatform,
} from '../../registry-contract.js';

const legacyIndex = {
  version: '2.0.0',
  packages: {
    stacks: {
      official: [
        {
          id: 'stack:demo',
          name: 'Demo',
          version: '1.0.0',
          path: 'catalog/stacks/demo',
        },
      ],
      community: [],
    },
  },
};

const v2Index = {
  schemaVersion: '2',
  packages: {
    'stack:demo': {
      id: 'stack:demo',
      kind: 'stack',
      name: 'Demo',
      version: '1.0.0',
      delivery: 'remote',
      install: {
        source: 'catalog',
        path: 'catalog/stacks/demo',
      },
      runtime: 'node',
      provides: { tools: ['demo_tool'] },
      mcp: {
        transport: 'stdio',
        command: 'node',
        args: ['src/index.js'],
      },
      meta: {
        description: 'Demo package',
        category: 'testing',
      },
    },
  },
};

test('registry contract: requires the canonical v2 wire shape', () => {
  assert.throws(
    () => detectRegistrySchema(legacyIndex),
    /Unsupported registry schema version: missing/
  );
  assert.equal(detectRegistrySchema(v2Index), '2');
});

test('registry contract: enumerates canonical v2 packages', () => {
  const v2Packages = listRegistryPackages(v2Index, 'stack');

  assert.deepEqual(v2Packages.map(({ id, kind, name, version, path }) => ({
    id,
    kind,
    name,
    version,
    path,
  })), [{
    id: 'stack:demo',
    kind: 'stack',
    name: 'Demo',
    version: '1.0.0',
    path: 'catalog/stacks/demo',
  }]);
  assert.deepEqual({
    description: v2Packages[0].description,
    category: v2Packages[0].category,
    command: v2Packages[0].command,
  }, {
    description: 'Demo package',
    category: 'testing',
    command: ['node', 'src/index.js'],
  });
});

test('registry contract: rejects unsupported explicit schema versions', () => {
  assert.throws(
    () => detectRegistrySchema({ schemaVersion: '3', packages: {} }),
    /Unsupported registry schema version: 3/
  );
});

test('registry contract: resolves and validates the effective v2 download platform', () => {
  const resolved = resolveRegistryPackageForPlatform({
    id: 'binary:demo',
    kind: 'binary',
    name: 'Demo Binary',
    version: '1.0.0',
    delivery: 'remote',
    install: {
      source: 'download',
      platforms: {
        darwin: {
          url: 'https://example.test/demo.tar.gz',
          checksum: { algo: 'sha256', value: 'a'.repeat(64) },
          extract: { type: 'tar.gz', strip: 1 },
        },
      },
    },
    bins: ['demo'],
  }, 'darwin-arm64');

  assert.equal(resolved.install.url, 'https://example.test/demo.tar.gz');
  assert.equal(resolved.installType, 'binary');
  assert.equal(resolved._resolved.platformKey, 'darwin');

  assert.throws(
    () => resolveRegistryPackageForPlatform({
      ...resolved,
      install: {
        source: 'download',
        platforms: {},
      },
    }, 'linux-x64'),
    /does not support platform linux-x64/
  );
});
