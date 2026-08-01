import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('getManifest reads and normalizes the unversioned canonical manifest', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-canonical-manifest-'));
  const registryRoot = path.join(root, 'registry');
  const stackRoot = path.join(registryRoot, 'catalog/stacks/demo');
  const previous = {
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
  };

  try {
    fs.mkdirSync(stackRoot, { recursive: true });
    fs.writeFileSync(path.join(stackRoot, 'manifest.json'), JSON.stringify({
      id: 'stack:demo',
      kind: 'stack',
      name: 'Canonical Demo',
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
    }));
    fs.writeFileSync(path.join(stackRoot, 'manifest.v2.json'), JSON.stringify({
      id: 'stack:demo',
      kind: 'stack',
      name: 'Obsolete Version-Suffixed Demo',
      version: '9.9.9',
      delivery: 'remote',
      install: { source: 'catalog', path: 'catalog/stacks/demo' },
      runtime: 'node',
      provides: { tools: [] },
      mcp: { transport: 'stdio', command: 'node', args: ['obsolete.js'] },
    }));

    process.env.USE_LOCAL_REGISTRY = 'true';
    process.env.RUDI_REGISTRY_ROOT = registryRoot;

    const { getManifest } = await import(`../../index.js?manifest=${Date.now()}`);
    const manifest = await getManifest({
      id: 'stack:demo',
      kind: 'stack',
      path: 'catalog/stacks/demo',
      delivery: 'remote',
      install: { source: 'catalog', path: 'catalog/stacks/demo' },
    });

    assert.equal(manifest.name, 'Canonical Demo');
    assert.deepEqual(manifest.command, ['node', 'src/index.js']);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
