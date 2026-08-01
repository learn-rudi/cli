import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('downloadResolvedPackage verifies v2 checksum and cleans failed installs', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-v2-download-'));
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    fetch: globalThis.fetch,
  };
  const bytes = Buffer.from('#!/bin/sh\necho demo\n');
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

  try {
    process.env.RUDI_HOME = path.join(root, '.rudi');
    globalThis.fetch = async () => new Response(bytes);
    const { downloadResolvedPackage } = await import(`../../index.js?v2download=${Date.now()}`);
    const destination = path.join(root, 'installed', 'demo');
    const pkg = {
      id: 'binary:demo',
      kind: 'binary',
      name: 'Demo',
      version: '1.0.0',
      delivery: 'remote',
      install: {
        source: 'download',
        url: 'https://example.test/demo',
        checksum: { algo: 'sha256', value: sha256 },
        extract: { type: 'raw' },
      },
      bins: ['demo'],
    };

    await downloadResolvedPackage(pkg, destination);
    assert.deepEqual(fs.readFileSync(path.join(destination, 'demo')), bytes);
    assert.equal(JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'))).id, 'binary:demo');

    const failedDestination = path.join(root, 'installed', 'bad-demo');
    await assert.rejects(
      downloadResolvedPackage({
        ...pkg,
        id: 'binary:bad-demo',
        install: {
          ...pkg.install,
          checksum: { algo: 'sha256', value: '0'.repeat(64) },
        },
      }, failedDestination),
      /Checksum mismatch for binary:bad-demo/
    );
    assert.equal(fs.existsSync(failedDestination), false);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.RUDI_HOME === undefined) delete process.env.RUDI_HOME;
    else process.env.RUDI_HOME = previous.RUDI_HOME;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('downloadResolvedPackage preserves mapped runtime bin layout', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-v2-runtime-download-'));
  const previousFetch = globalThis.fetch;

  try {
    const archiveRoot = path.join(root, 'node-v1');
    fs.mkdirSync(path.join(archiveRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(archiveRoot, 'lib/node_modules/npm/bin'), { recursive: true });
    fs.writeFileSync(path.join(archiveRoot, 'bin/node'), '#!/bin/sh\n');
    fs.writeFileSync(path.join(archiveRoot, 'lib/node_modules/npm/bin/npm-cli.js'), '#!/usr/bin/env node\n');
    fs.symlinkSync('../lib/node_modules/npm/bin/npm-cli.js', path.join(archiveRoot, 'bin/npm'));
    const archive = path.join(root, 'node.tar.gz');
    execFileSync('tar', ['-czf', archive, '-C', root, 'node-v1']);
    const bytes = fs.readFileSync(archive);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    globalThis.fetch = async () => new Response(bytes);

    const { downloadResolvedPackage } = await import(`../../index.js?runtimeLayout=${Date.now()}`);
    const destination = path.join(root, 'installed');
    await downloadResolvedPackage({
      id: 'runtime:node',
      kind: 'runtime',
      name: 'Node.js',
      version: '1.0.0',
      delivery: 'remote',
      install: {
        source: 'download',
        url: 'https://example.test/node.tar.gz',
        checksum: { algo: 'sha256', value: sha256 },
        extract: { type: 'tar.gz', strip: 1 },
      },
      bins: {
        node: { path: 'bin/node' },
        npm: { path: 'bin/npm' },
      },
    }, destination);

    assert.equal(fs.existsSync(path.join(destination, 'bin/node')), true);
    assert.equal(fs.existsSync(path.join(destination, 'bin/npm')), true);
    assert.equal(fs.existsSync(path.join(destination, 'node')), false);
  } finally {
    globalThis.fetch = previousFetch;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
