import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  downloadGitHubDirectory,
  parseGitHubTreeUrl,
  resolveGitHubTreeSource,
} from '../../github-source.js';

test('resolveGitHubTreeSource pins a public tree URL to a commit and stack path', async () => {
  const calls = [];
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const source = await resolveGitHubTreeSource(
    'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo',
    {
      async fetch(url) {
        calls.push(String(url));
        if (String(url).endsWith('/commits/main')) {
          return Response.json({ sha: commit });
        }
        if (String(url).includes('/commits/')) {
          return new Response('', { status: 404 });
        }
        if (String(url).includes('/contents/catalog/stacks/demo?')) {
          return Response.json([
            {
              name: 'manifest.json',
              type: 'file',
              download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/catalog/stacks/demo/manifest.json`,
            },
          ]);
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    },
  );

  assert.deepEqual(source, {
    type: 'github',
    requestedUrl: 'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo',
    repository: 'acme/rudi-packages',
    owner: 'acme',
    repo: 'rudi-packages',
    requestedRef: 'main',
    resolvedCommit: commit,
    path: 'catalog/stacks/demo',
  });
  assert.equal(calls[0], 'https://api.github.com/repos/acme/rudi-packages/commits/main');
  assert.equal(
    calls.includes(`https://api.github.com/repos/acme/rudi-packages/contents/catalog/stacks/demo?ref=${commit}`),
    true,
  );
});

test('parseGitHubTreeUrl accepts a one-segment repository subtree', () => {
  assert.deepEqual(
    parseGitHubTreeUrl('https://github.com/acme/rudi-packages/tree/main/demo'),
    {
      requestedUrl: 'https://github.com/acme/rudi-packages/tree/main/demo',
      owner: 'acme',
      repo: 'rudi-packages',
      refAndPath: ['main', 'demo'],
    },
  );
});

test('resolveGitHubTreeSource retries longer slash refs after an invalid stack path', async () => {
  const shortCommit = '1111111111111111111111111111111111111111';
  const longCommit = '2222222222222222222222222222222222222222';
  const source = await resolveGitHubTreeSource(
    'https://github.com/acme/repo/tree/feature/foo/catalog/stacks/demo',
    {
      async fetch(url) {
        const value = String(url);
        if (value.endsWith('/commits/feature')) return Response.json({ sha: shortCommit });
        if (value.endsWith('/commits/feature%2Ffoo')) return Response.json({ sha: longCommit });
        if (value.includes('/commits/')) return new Response('', { status: 404 });
        if (value.includes('contents/foo/catalog/stacks/demo?')) {
          return new Response('', { status: 404 });
        }
        if (value.includes('contents/catalog/stacks/demo?')) {
          return Response.json([{
            name: 'manifest.json',
            path: 'catalog/stacks/demo/manifest.json',
            type: 'file',
            download_url: `https://raw.githubusercontent.com/acme/repo/${longCommit}/catalog/stacks/demo/manifest.json`,
          }]);
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
    },
  );

  assert.equal(source.requestedRef, 'feature/foo');
  assert.equal(source.path, 'catalog/stacks/demo');
  assert.equal(source.resolvedCommit, longCommit);
});

test('resolveGitHubTreeSource fails closed when ref and path are genuinely ambiguous', async () => {
  const shortCommit = '1111111111111111111111111111111111111111';
  const longCommit = '2222222222222222222222222222222222222222';
  await assert.rejects(
    () => resolveGitHubTreeSource(
      'https://github.com/acme/repo/tree/feature/foo/catalog/stacks/demo',
      {
        async fetch(url) {
          const value = String(url);
          if (value.endsWith('/commits/feature')) return Response.json({ sha: shortCommit });
          if (value.endsWith('/commits/feature%2Ffoo')) return Response.json({ sha: longCommit });
          if (value.includes('/commits/')) return new Response('', { status: 404 });
          if (value.includes('contents/foo/catalog/stacks/demo?')) {
            return Response.json([{
              name: 'manifest.json',
              type: 'file',
              download_url: `https://raw.githubusercontent.com/acme/repo/${shortCommit}/foo/catalog/stacks/demo/manifest.json`,
            }]);
          }
          if (value.includes('contents/catalog/stacks/demo?')) {
            return Response.json([{
              name: 'manifest.json',
              type: 'file',
              download_url: `https://raw.githubusercontent.com/acme/repo/${longCommit}/catalog/stacks/demo/manifest.json`,
            }]);
          }
          throw new Error(`Unexpected fetch: ${url}`);
        },
      },
    ),
    /Ambiguous GitHub tree URL/,
  );
});

test('parseGitHubTreeUrl rejects traversal before URL normalization', () => {
  assert.throws(
    () => parseGitHubTreeUrl(
      'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo/../evil',
    ),
    /Invalid GitHub tree URL path/,
  );
});

test('parseGitHubTreeUrl rejects non-public, foreign, decorated, and ambiguous sources', () => {
  const invalid = [
    'http://github.com/acme/repo/tree/main/stacks/demo',
    'https://github.com.evil.example/acme/repo/tree/main/stacks/demo',
    'https://user@github.com/acme/repo/tree/main/stacks/demo',
    'https://github.com/acme/repo/tree/main/stacks/demo?token=value',
    'https://github.com/acme/repo/tree/main/stacks/demo#readme',
    'https://github.com/acme/repo/tree/main',
    'https://github.com/acme/repo/tree/main/stacks%2Fdemo',
  ];
  for (const value of invalid) {
    assert.throws(() => parseGitHubTreeUrl(value), undefined, value);
  }
});

test('downloadGitHubDirectory writes only pinned files from the selected subtree', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-source-'));
  const destination = path.join(root, 'demo');
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const source = {
    type: 'github',
    requestedUrl: 'https://github.com/acme/rudi-packages/tree/main/catalog/stacks/demo',
    repository: 'acme/rudi-packages',
    owner: 'acme',
    repo: 'rudi-packages',
    requestedRef: 'main',
    resolvedCommit: commit,
    path: 'catalog/stacks/demo',
  };

  try {
    await downloadGitHubDirectory(source, source.path, destination, {
      async fetch(url) {
        const value = String(url);
        if (value.includes(`/git/trees/${commit}?recursive=1`)) {
          return Response.json({
            truncated: false,
            tree: [
              { path: 'catalog/stacks/demo/manifest.json', type: 'blob', mode: '100644' },
              { path: 'catalog/stacks/demo/src', type: 'tree', mode: '040000' },
              { path: 'catalog/stacks/demo/src/index.js', type: 'blob', mode: '100755' },
            ],
          });
        }
        if (value.includes('/contents/catalog/stacks/demo?')) {
          return Response.json([
            {
              name: 'manifest.json',
              path: 'catalog/stacks/demo/manifest.json',
              type: 'file',
              size: 18,
              download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/catalog/stacks/demo/manifest.json`,
            },
            {
              name: 'src',
              path: 'catalog/stacks/demo/src',
              type: 'dir',
            },
          ]);
        }
        if (value.includes('/contents/catalog/stacks/demo/src?')) {
          return Response.json([
            {
              name: 'index.js',
              path: 'catalog/stacks/demo/src/index.js',
              type: 'file',
              size: 10,
              download_url: `https://raw.githubusercontent.com/acme/rudi-packages/${commit}/catalog/stacks/demo/src/index.js`,
            },
          ]);
        }
        if (value.endsWith('/manifest.json')) return new Response('{"kind":"stack"}');
        if (value.endsWith('/src/index.js')) return new Response('export {};');
        throw new Error(`Unexpected fetch: ${url}`);
      },
    });

    assert.equal(
      fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'),
      '{"kind":"stack"}',
    );
    assert.equal(
      fs.readFileSync(path.join(destination, 'src', 'index.js'), 'utf8'),
      'export {};',
    );
    assert.notEqual(fs.statSync(path.join(destination, 'src', 'index.js')).mode & 0o111, 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('downloadGitHubDirectory enforces one cumulative file limit across sibling directories', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-limit-'));
  const destination = path.join(root, 'demo');
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const source = {
    type: 'github',
    requestedUrl: 'https://github.com/acme/repo/tree/main/stack',
    repository: 'acme/repo',
    owner: 'acme',
    repo: 'repo',
    requestedRef: 'main',
    resolvedCommit: commit,
    path: 'stack',
  };
  const raw = (file) => `https://raw.githubusercontent.com/acme/repo/${commit}/${file}`;

  try {
    await assert.rejects(
      () => downloadGitHubDirectory(source, source.path, destination, {
        maxFiles: 1,
        async fetch(url) {
          const value = String(url);
          if (value.includes(`/git/trees/${commit}?recursive=1`)) {
            return Response.json({
              truncated: false,
              tree: [
                { path: 'stack/a', type: 'tree', mode: '040000' },
                { path: 'stack/a/one.txt', type: 'blob', mode: '100644' },
                { path: 'stack/b', type: 'tree', mode: '040000' },
                { path: 'stack/b/two.txt', type: 'blob', mode: '100644' },
              ],
            });
          }
          if (value.includes('/contents/stack?')) {
            return Response.json([
              { name: 'a', path: 'stack/a', type: 'dir' },
              { name: 'b', path: 'stack/b', type: 'dir' },
            ]);
          }
          if (value.includes('/contents/stack/a?')) {
            return Response.json([{
              name: 'one.txt', path: 'stack/a/one.txt', type: 'file', size: 1,
              download_url: raw('stack/a/one.txt'),
            }]);
          }
          if (value.includes('/contents/stack/b?')) {
            return Response.json([{
              name: 'two.txt', path: 'stack/b/two.txt', type: 'file', size: 1,
              download_url: raw('stack/b/two.txt'),
            }]);
          }
          if (value.startsWith('https://raw.githubusercontent.com/')) {
            return new Response('x');
          }
          throw new Error(`Unexpected fetch: ${url}`);
        },
      }),
      /maximum file count of 1/,
    );
    assert.equal(fs.existsSync(destination), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('downloadGitHubDirectory rejects an incomplete Contents traversal', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-github-incomplete-'));
  const destination = path.join(root, 'demo');
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const source = {
    type: 'github',
    requestedUrl: 'https://github.com/acme/repo/tree/main/stack',
    repository: 'acme/repo',
    owner: 'acme',
    repo: 'repo',
    requestedRef: 'main',
    resolvedCommit: commit,
    path: 'stack',
  };

  try {
    await assert.rejects(
      () => downloadGitHubDirectory(source, source.path, destination, {
        async fetch(url) {
          const value = String(url);
          if (value.includes(`/git/trees/${commit}?recursive=1`)) {
            return Response.json({
              truncated: false,
              tree: [
                { path: 'stack/manifest.json', type: 'blob', mode: '100644' },
                { path: 'stack/omitted.js', type: 'blob', mode: '100644' },
              ],
            });
          }
          if (value.includes('/contents/stack?')) {
            return Response.json([{
              name: 'manifest.json', path: 'stack/manifest.json', type: 'file', size: 2,
              download_url: `https://raw.githubusercontent.com/acme/repo/${commit}/stack/manifest.json`,
            }]);
          }
          if (value.endsWith('/stack/manifest.json')) return new Response('{}');
          throw new Error(`Unexpected fetch: ${url}`);
        },
      }),
      /Contents response omitted pinned tree file: stack\/omitted\.js/,
    );
    assert.equal(fs.existsSync(destination), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
