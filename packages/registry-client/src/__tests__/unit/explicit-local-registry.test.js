import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const registryClientPath = path.resolve(
  process.cwd(),
  'packages/registry-client/src/index.js',
);
const registryClientUrl = pathToFileURL(registryClientPath).href;

test('an explicit local Registry root wins over a newer cache from another root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-explicit-local-registry-'));
  const rudiHome = path.join(root, '.rudi');
  const registryRoot = path.join(root, 'registry');
  const localIndexPath = path.join(registryRoot, 'index.json');
  const cachePath = path.join(rudiHome, 'cache', 'registry.json');

  try {
    fs.mkdirSync(path.dirname(localIndexPath), { recursive: true });
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(localIndexPath, JSON.stringify({
      schemaVersion: '2',
      source: 'explicit-local',
      packages: {},
    }));
    fs.writeFileSync(cachePath, JSON.stringify({
      schemaVersion: '2',
      source: 'stale-cache',
      packages: {},
    }));

    const now = new Date();
    const older = new Date(now.getTime() - 60_000);
    const newer = new Date(now.getTime() + 60_000);
    fs.utimesSync(localIndexPath, older, older);
    fs.utimesSync(cachePath, newer, newer);

    const script = `
      const { createRequire } = await import('node:module');
      const { pathToFileURL } = await import('node:url');
      const registryRequire = createRequire(process.argv[2]);
      const resolvedEnvPath = registryRequire.resolve('@learnrudi/env');
      const resolvedPaths = (await import(pathToFileURL(resolvedEnvPath))).PATHS;

      if (resolvedPaths.registryCache !== process.argv[1]) {
        console.log(JSON.stringify({
          resolvedCachePath: resolvedPaths.registryCache,
        }));
        process.exit(0);
      }

      const { fetchIndex } = await import(process.argv[2]);
      console.log(JSON.stringify({
        resolvedCachePath: resolvedPaths.registryCache,
        index: await fetchIndex(),
      }));
    `;
    const output = execFileSync(process.execPath, [
      '--input-type=module',
      '-e',
      script,
      cachePath,
      registryClientUrl,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        RUDI_HOME: rudiHome,
        USE_LOCAL_REGISTRY: 'true',
        RUDI_REGISTRY_ROOT: registryRoot,
      },
    });
    const observed = JSON.parse(output);

    assert.equal(
      observed.resolvedCachePath,
      cachePath,
      'registry-client must honor the child process RUDI_HOME before reading cache',
    );
    assert.equal(observed.index.source, 'explicit-local');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
