import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('fetchIndex uses the canonical root index without a fallback', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-registry-index-'));
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
    RUDI_REGISTRY_URL: process.env.RUDI_REGISTRY_URL,
    fetch: globalThis.fetch,
  };

  try {
    process.env.RUDI_HOME = path.join(root, '.rudi');
    delete process.env.USE_LOCAL_REGISTRY;
    delete process.env.RUDI_REGISTRY_ROOT;
    delete process.env.RUDI_REGISTRY_URL;

    const requests = [];
    globalThis.fetch = async (url) => {
      requests.push(String(url));
      return Response.json({
        schemaVersion: '2',
        packages: {},
      });
    };

    const {
      DEFAULT_REGISTRY_URL,
      fetchIndex,
    } = await import(`../../index.js?fallback=${Date.now()}`);
    const diagnostics = [];
    const index = await fetchIndex({
      force: true,
      onDiagnostic: (event) => diagnostics.push(event),
    });

    assert.ok(DEFAULT_REGISTRY_URL.endsWith('/index.json'));
    assert.deepEqual(requests, [DEFAULT_REGISTRY_URL]);
    assert.equal(index.schemaVersion, '2');
    assert.deepEqual(diagnostics, []);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const key of ['RUDI_HOME', 'USE_LOCAL_REGISTRY', 'RUDI_REGISTRY_ROOT', 'RUDI_REGISTRY_URL']) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
