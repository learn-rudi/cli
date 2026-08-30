import { test } from 'node:test';
import assert from 'node:assert/strict';

test('resolvePackage turns a public GitHub tree into a pinned stack and operator skill', async () => {
  const previousFetch = globalThis.fetch;
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const stackPath = 'catalog/stacks/demo';
  const skillPath = 'catalog/skills/demo';

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/commits/main')) return Response.json({ sha: commit });
    if (value.includes('/commits/')) return new Response('', { status: 404 });
    if (value.includes(`/contents/${stackPath}?`)) {
      return Response.json([
        {
          name: 'manifest.json',
          path: `${stackPath}/manifest.json`,
          type: 'file',
          size: 500,
          download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/${stackPath}/manifest.json`,
        },
      ]);
    }
    if (value.endsWith(`/${stackPath}/manifest.json`)) {
      return Response.json({
        id: 'stack:demo',
        kind: 'stack',
        name: 'Demo',
        version: '1.2.3',
        runtime: 'node',
        provides: { tools: ['demo_run'] },
        mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        related: {
          operatorSkill: 'skill:demo',
          skills: ['skill:demo'],
          operatorSkillPath: skillPath,
        },
      });
    }
    if (value.includes(`/contents/${skillPath}?`)) {
      return Response.json([
        {
          name: 'SKILL.md',
          path: `${skillPath}/SKILL.md`,
          type: 'file',
          size: 100,
          download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/${skillPath}/SKILL.md`,
        },
      ]);
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { resolvePackage } = await import('../../resolver.js');
    const resolved = await resolvePackage(
      'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo',
    );

    assert.equal(resolved.id, 'stack:demo');
    assert.equal(resolved.version, '1.2.3');
    assert.equal(resolved.source.resolvedCommit, commit);
    assert.equal(resolved.source.path, stackPath);
    assert.deepEqual(
      resolved.relatedSkills.map((skill) => ({
        id: skill.id,
        isOperator: skill.isOperator,
        sourcePath: skill.source.path,
        resolvedCommit: skill.source.resolvedCommit,
      })),
      [{
        id: 'skill:demo',
        isOperator: true,
        sourcePath: skillPath,
        resolvedCommit: commit,
      }],
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('resolvePackage rejects path-bearing package IDs from an external manifest', async () => {
  const previousFetch = globalThis.fetch;
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const stackPath = 'catalog/stacks/demo';

  globalThis.fetch = async (url) => {
    const value = String(url);
    if (value.endsWith('/commits/main')) return Response.json({ sha: commit });
    if (value.includes('/commits/')) return new Response('', { status: 404 });
    if (value.includes(`/contents/${stackPath}?`)) {
      return Response.json([{
        name: 'manifest.json',
        path: `${stackPath}/manifest.json`,
        type: 'file',
        size: 400,
        download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/${stackPath}/manifest.json`,
      }]);
    }
    if (value.endsWith(`/${stackPath}/manifest.json`)) {
      return Response.json({
        id: 'stack:../../escape',
        kind: 'stack',
        name: 'Escape',
        version: '1.0.0',
        related: {
          operatorSkill: 'skill:demo',
          skills: ['skill:demo'],
          operatorSkillPath: 'catalog/skills/demo',
        },
      });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const { resolvePackage } = await import('../../resolver.js');
    await assert.rejects(
      () => resolvePackage(
        'https://github.com/acme/repo/tree/main/catalog/stacks/demo',
      ),
      /canonical stack package id/,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('pinned GitHub lock matching requires the same repository, commit, and subtree', async () => {
  const { isMatchingPinnedGitHubLock } = await import('../../resolver.js');
  const source = {
    type: 'github',
    repository: 'acme/repo',
    resolvedCommit: '0123456789abcdef0123456789abcdef01234567',
    path: 'catalog/skills/demo',
  };
  const lock = { source: { ...source } };

  assert.equal(isMatchingPinnedGitHubLock(lock, source), true);
  assert.equal(isMatchingPinnedGitHubLock(lock, { ...source, repository: 'other/repo' }), false);
  assert.equal(isMatchingPinnedGitHubLock(lock, { ...source, resolvedCommit: '1'.repeat(40) }), false);
  assert.equal(isMatchingPinnedGitHubLock(lock, { ...source, path: 'catalog/skills/other' }), false);
  assert.equal(isMatchingPinnedGitHubLock({ source: { type: 'registry' } }, source), false);
});
