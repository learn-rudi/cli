import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('public GitHub stack and operator skill install together in an isolated RUDI home', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-stack-smoke-'));
  const previous = { fetch: globalThis.fetch, RUDI_HOME: process.env.RUDI_HOME };
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const stackPath = 'catalog/stacks/demo';
  const skillPath = 'catalog/skills/demo';
  const manifest = {
    id: 'stack:demo',
    kind: 'stack',
    name: 'Demo',
    version: '1.2.3',
    runtime: 'binary',
    binary: {
      platforms: {
        'darwin-arm64': {
          url: 'https://malicious.example/download.tgz',
          sha256: '',
        },
      },
    },
    command: ['./src/demo'],
    provides: { tools: ['demo_run'] },
    related: {
      operatorSkill: 'skill:demo',
      skills: ['skill:demo'],
      operatorSkillPath: skillPath,
    },
  };

  process.env.RUDI_HOME = path.join(root, 'home');
  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/commits/main')) return Response.json({ sha: commit });
    if (value.includes('/commits/')) return new Response('', { status: 404 });
    if (value.includes(`/git/trees/${commit}?recursive=1`)) {
      return Response.json({
        truncated: false,
        tree: [
          { path: `${stackPath}/manifest.json`, type: 'blob', mode: '100644' },
          { path: `${stackPath}/src`, type: 'tree', mode: '040000' },
          { path: `${stackPath}/src/demo`, type: 'blob', mode: '100755' },
          { path: `${skillPath}/SKILL.md`, type: 'blob', mode: '100644' },
        ],
      });
    }
    if (value.includes(`/contents/${stackPath}/src?`)) {
      return Response.json([{
        name: 'demo', path: `${stackPath}/src/demo`, type: 'file', size: 7,
        download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${stackPath}/src/demo`,
      }]);
    }
    if (value.includes(`/contents/${stackPath}?`)) {
      return Response.json([
        {
          name: 'manifest.json', path: `${stackPath}/manifest.json`, type: 'file', size: 500,
          download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${stackPath}/manifest.json`,
        },
        { name: 'src', path: `${stackPath}/src`, type: 'dir' },
      ]);
    }
    if (value.includes(`/contents/${skillPath}?`)) {
      return Response.json([{
        name: 'SKILL.md', path: `${skillPath}/SKILL.md`, type: 'file', size: 34,
        download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${skillPath}/SKILL.md`,
      }]);
    }
    if (value.endsWith(`/${stackPath}/manifest.json`)) {
      return new Response(JSON.stringify(manifest), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (value.endsWith(`/${stackPath}/src/demo`)) return new Response('binary\n');
    if (value.endsWith(`/${skillPath}/SKILL.md`)) {
      return new Response('---\nname: demo\n---\nUse demo.\n');
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { resolvePackage } = await import('../../resolver.js');
    const { installPackage } = await import('../../installer.js');
    const { readLockfile, verifyLockfile } = await import('../../lockfile.js');
    const resolved = await resolvePackage(
      'https://github.com/acme/repo/tree/main/catalog/stacks/demo',
    );
    const stackResult = await installPackage(resolved.id, { resolvedPackage: resolved });
    const skillResult = await installPackage(resolved.relatedSkills[0].id, {
      resolvedPackage: resolved.relatedSkills[0],
    });

    assert.equal(stackResult.success, true);
    assert.equal(skillResult.success, true);
    assert.equal(fs.existsSync(path.join(stackResult.path, 'src', 'demo')), true);
    assert.notEqual(fs.statSync(path.join(stackResult.path, 'src', 'demo')).mode & 0o111, 0);
    assert.equal(fs.existsSync(path.join(skillResult.path, 'SKILL.md')), true);
    assert.equal(readLockfile('stack:demo').source.resolvedCommit, commit);
    assert.equal(readLockfile('skill:demo').source.resolvedCommit, commit);
    assert.deepEqual(await verifyLockfile('stack:demo'), { valid: true, errors: [] });
    assert.deepEqual(await verifyLockfile('skill:demo'), { valid: true, errors: [] });
    fs.chmodSync(path.join(stackResult.path, 'src', 'demo'), 0o644);
    assert.deepEqual(await verifyLockfile('stack:demo'), {
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
