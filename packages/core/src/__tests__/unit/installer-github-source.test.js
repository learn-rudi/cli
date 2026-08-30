import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('installPackage installs a pre-resolved GitHub skill and locks its provenance', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-install-'));
  const previous = {
    fetch: globalThis.fetch,
    RUDI_HOME: process.env.RUDI_HOME,
  };
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const skillPath = 'catalog/skills/demo';
  process.env.RUDI_HOME = path.join(root, '.rudi');

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.includes(`/git/trees/${commit}?recursive=1`)) {
      return Response.json({
        truncated: false,
        tree: [
          { path: `${skillPath}/SKILL.md`, type: 'blob', mode: '100644' },
        ],
      });
    }
    if (value.includes(`/contents/${skillPath}?`)) {
      return Response.json([
        {
          name: 'SKILL.md',
          path: `${skillPath}/SKILL.md`,
          type: 'file',
          size: 30,
          download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/${skillPath}/SKILL.md`,
        },
      ]);
    }
    if (value.endsWith(`/${skillPath}/SKILL.md`)) {
      return new Response('---\nname: demo\n---\nUse demo.\n');
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const source = {
    type: 'github',
    requestedUrl: 'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo',
    repository: 'acme/rudi-packages',
    owner: 'acme',
    repo: 'rudi-packages',
    requestedRef: 'main',
    resolvedCommit: commit,
    path: skillPath,
  };
  const resolved = {
    id: 'skill:demo',
    kind: 'skill',
    name: 'demo',
    version: '1.2.3',
    path: skillPath,
    source,
    dependencies: [],
    installed: false,
  };

  try {
    const { installPackage } = await import('../../installer.js');
    const { readLockfile } = await import('../../lockfile.js');
    const result = await installPackage(resolved.id, { resolvedPackage: resolved });

    assert.equal(result.success, true);
    assert.equal(
      fs.readFileSync(path.join(result.path, 'SKILL.md'), 'utf8'),
      '---\nname: demo\n---\nUse demo.\n',
    );
    const lock = readLockfile(resolved.id);
    assert.equal(lock.source.resolvedCommit, commit);
    assert.equal(lock.source.path, skillPath);
    assert.match(lock.checksum, /^[a-f0-9]{64}$/);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.RUDI_HOME === undefined) delete process.env.RUDI_HOME;
    else process.env.RUDI_HOME = previous.RUDI_HOME;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('deferred GitHub replacement rolls back the prior tree and lock, then locks final content', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-rollback-'));
  const previous = { fetch: globalThis.fetch, RUDI_HOME: process.env.RUDI_HOME };
  const oldCommit = '1111111111111111111111111111111111111111';
  const newCommit = '2222222222222222222222222222222222222222';
  const skillPath = 'catalog/skills/demo';
  process.env.RUDI_HOME = path.join(root, '.rudi');

  globalThis.fetch = async (url) => {
    const value = String(url);
    const commit = value.includes(oldCommit) ? oldCommit : newCommit;
    if (value.includes('/git/trees/')) {
      return Response.json({
        truncated: false,
        tree: [{ path: `${skillPath}/SKILL.md`, type: 'blob', mode: '100644' }],
      });
    }
    if (value.includes(`/contents/${skillPath}?`)) {
      return Response.json([{
        name: 'SKILL.md',
        path: `${skillPath}/SKILL.md`,
        type: 'file',
        size: 3,
        download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${skillPath}/SKILL.md`,
      }]);
    }
    if (value.endsWith(`/${skillPath}/SKILL.md`)) {
      return new Response(commit === oldCommit ? 'old' : 'new');
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const makeResolved = (commit) => ({
    id: 'skill:demo',
    kind: 'skill',
    name: 'demo',
    version: commit === oldCommit ? '1.0.0' : '2.0.0',
    path: skillPath,
    source: {
      type: 'github',
      requestedUrl: `https://github.com/acme/repo/tree/${commit}/${skillPath}`,
      repository: 'acme/repo',
      owner: 'acme',
      repo: 'repo',
      requestedRef: commit,
      resolvedCommit: commit,
      path: skillPath,
    },
    dependencies: [],
    installed: false,
  });

  try {
    const {
      commitDeferredInstall,
      installPackage,
      prepareDeferredInstall,
      rollbackDeferredInstall,
    } = await import('../../installer.js');
    const { readLockfile, verifyLockfile } = await import('../../lockfile.js');

    const initial = await installPackage('skill:demo', { resolvedPackage: makeResolved(oldCommit) });
    assert.equal(initial.success, true);
    assert.equal(readLockfile('skill:demo').source.resolvedCommit, oldCommit);

    const replacement = await installPackage('skill:demo', {
      force: true,
      deferFinalize: true,
      resolvedPackage: makeResolved(newCommit),
    });
    assert.equal(fs.readFileSync(path.join(replacement.path, 'SKILL.md'), 'utf8'), 'new');
    assert.equal(readLockfile('skill:demo').source.resolvedCommit, oldCommit);
    await rollbackDeferredInstall(replacement.transaction);
    assert.equal(fs.readFileSync(path.join(replacement.path, 'SKILL.md'), 'utf8'), 'old');
    assert.equal(readLockfile('skill:demo').source.resolvedCommit, oldCommit);

    const finalReplacement = await installPackage('skill:demo', {
      force: true,
      deferFinalize: true,
      resolvedPackage: makeResolved(newCommit),
    });
    fs.writeFileSync(path.join(finalReplacement.path, 'generated.txt'), 'post-install build output');
    fs.mkdirSync(path.join(finalReplacement.path, 'src', 'outputs'), { recursive: true });
    fs.writeFileSync(path.join(finalReplacement.path, 'src', 'outputs', 'tool.js'), 'export const version = 1;');
    await prepareDeferredInstall(finalReplacement.transaction);
    commitDeferredInstall(finalReplacement.transaction);
    assert.equal(readLockfile('skill:demo').source.resolvedCommit, newCommit);
    assert.deepEqual(await verifyLockfile('skill:demo'), { valid: true, errors: [] });
    fs.writeFileSync(path.join(finalReplacement.path, 'src', 'outputs', 'tool.js'), 'export const version = 2;');
    assert.deepEqual(await verifyLockfile('skill:demo'), {
      valid: false,
      errors: ['Installed package content checksum does not match lockfile'],
    });
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.RUDI_HOME === undefined) delete process.env.RUDI_HOME;
    else process.env.RUDI_HOME = previous.RUDI_HOME;
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('external Python requirements require explicit script authorization before installation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-python-policy-'));
  const previous = { fetch: globalThis.fetch, RUDI_HOME: process.env.RUDI_HOME };
  const commit = '3333333333333333333333333333333333333333';
  const stackPath = 'stacks/python-demo';
  process.env.RUDI_HOME = path.join(root, '.rudi');

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.includes('/git/trees/')) {
      return Response.json({
        truncated: false,
        tree: [
          { path: `${stackPath}/manifest.json`, type: 'blob', mode: '100644' },
          { path: `${stackPath}/requirements.txt`, type: 'blob', mode: '100644' },
        ],
      });
    }
    if (value.includes(`/contents/${stackPath}?`)) {
      return Response.json([
        {
          name: 'manifest.json', path: `${stackPath}/manifest.json`, type: 'file', size: 50,
          download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${stackPath}/manifest.json`,
        },
        {
          name: 'requirements.txt', path: `${stackPath}/requirements.txt`, type: 'file', size: 8,
          download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${stackPath}/requirements.txt`,
        },
      ]);
    }
    if (value.endsWith('/manifest.json')) {
      return new Response(JSON.stringify({
        id: 'stack:python-demo',
        kind: 'stack',
        name: 'Python demo',
        version: '1.0.0',
        runtime: 'python',
      }));
    }
    if (value.endsWith('/requirements.txt')) return new Response('demo==1');
    throw new Error(`Unexpected fetch: ${url}`);
  };

  const resolved = {
    id: 'stack:python-demo', kind: 'stack', name: 'Python demo', version: '1.0.0',
    runtime: 'python', path: stackPath, dependencies: [], installed: false,
    source: {
      type: 'github', requestedUrl: `https://github.com/acme/repo/tree/main/${stackPath}`,
      repository: 'acme/repo', owner: 'acme', repo: 'repo', requestedRef: 'main',
      resolvedCommit: commit, path: stackPath,
    },
  };

  try {
    const { installPackage } = await import('../../installer.js');
    const result = await installPackage(resolved.id, { resolvedPackage: resolved });
    assert.equal(result.success, false);
    assert.match(result.error, /Python dependency installation is disabled by default/);
    assert.equal(fs.existsSync(path.join(process.env.RUDI_HOME, 'stacks', 'python-demo')), false);
  } finally {
    globalThis.fetch = previous.fetch;
    if (previous.RUDI_HOME === undefined) delete process.env.RUDI_HOME;
    else process.env.RUDI_HOME = previous.RUDI_HOME;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
