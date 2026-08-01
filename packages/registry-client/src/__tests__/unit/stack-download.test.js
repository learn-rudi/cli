import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('downloadPackage installs normalized metadata from the unversioned canonical manifest', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-canonical-stack-download-'));
  const destination = path.join(root, 'demo');
  const previous = {
    fetch: globalThis.fetch,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
  };

  try {
    delete process.env.USE_LOCAL_REGISTRY;
    globalThis.fetch = async (url) => {
      const value = String(url);
      if (value.includes('/contents/catalog/stacks/demo')) {
        return Response.json([
          { name: 'manifest.json', type: 'file', download_url: 'https://download.test/manifest.json' },
          { name: 'manifest.v2.json', type: 'file', download_url: 'https://download.test/manifest.v2.json' },
        ]);
      }
      if (value.endsWith('/manifest.json')) {
        return Response.json({
          id: 'stack:demo',
          kind: 'stack',
          name: 'Canonical Demo',
          version: '1.0.0',
          delivery: 'remote',
          install: { source: 'catalog', path: 'catalog/stacks/demo' },
          runtime: 'node',
          provides: { tools: ['demo_tool'] },
          mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        });
      }
      if (value.endsWith('/manifest.v2.json')) {
        return Response.json({
          id: 'stack:demo',
          kind: 'stack',
          name: 'Obsolete Version-Suffixed Demo',
          version: '9.9.9',
          delivery: 'remote',
          install: { source: 'catalog', path: 'catalog/stacks/demo' },
          runtime: 'node',
          provides: { tools: [] },
          mcp: { transport: 'stdio', command: 'node', args: ['obsolete.js'] },
        });
      }
      return new Response('missing', { status: 404 });
    };

    const { downloadPackage } = await import(`../../index.js?canonical=${Date.now()}`);
    await downloadPackage({
      id: 'stack:demo',
      kind: 'stack',
      name: 'Canonical Demo',
      version: '1.0.0',
      path: 'catalog/stacks/demo',
      delivery: 'remote',
      install: { source: 'catalog', path: 'catalog/stacks/demo' },
    }, destination);

    const installed = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json')));
    assert.equal(installed.name, 'Canonical Demo');
    assert.deepEqual(installed.command, ['node', 'src/index.js']);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.USE_LOCAL_REGISTRY === undefined) delete process.env.USE_LOCAL_REGISTRY;
    else process.env.USE_LOCAL_REGISTRY = previous.USE_LOCAL_REGISTRY;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
