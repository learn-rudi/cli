import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { downloadPackage } from '../../index.js';

function mockResponse(body, options = {}) {
  const { ok = true, status = 200 } = options;
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Not Found',
    async json() {
      return typeof body === 'string' ? JSON.parse(body) : body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

test('downloadPackage recursively downloads a bundled skill directory', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-bundled-skill-download-'));
  const previousFetch = globalThis.fetch;
  const previousLocalRegistry = process.env.USE_LOCAL_REGISTRY;

  delete process.env.USE_LOCAL_REGISTRY;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const responses = new Map([
      [
        'https://api.github.com/repos/learnrudi/registry/contents/catalog/skills/demo-bundle',
        mockResponse([
          {
            name: 'SKILL.md',
            type: 'file',
            download_url: 'https://downloads.test/SKILL.md',
          },
          {
            name: 'scripts',
            type: 'dir',
            url: 'https://api.github.com/repos/learnrudi/registry/contents/catalog/skills/demo-bundle/scripts',
          },
          {
            name: 'references',
            type: 'dir',
            url: 'https://api.github.com/repos/learnrudi/registry/contents/catalog/skills/demo-bundle/references',
          },
        ]),
      ],
      [
        'https://api.github.com/repos/learnrudi/registry/contents/catalog/skills/demo-bundle/scripts',
        mockResponse([
          {
            name: 'extract.js',
            type: 'file',
            download_url: 'https://downloads.test/extract.js',
          },
        ]),
      ],
      [
        'https://api.github.com/repos/learnrudi/registry/contents/catalog/skills/demo-bundle/references',
        mockResponse([
          {
            name: 'spec.json',
            type: 'file',
            download_url: 'https://downloads.test/spec.json',
          },
        ]),
      ],
      ['https://downloads.test/SKILL.md', mockResponse('---\nname: Demo Bundle\n---\n')],
      ['https://downloads.test/extract.js', mockResponse('export const demo = true;\n')],
      ['https://downloads.test/spec.json', mockResponse('{"demo":true}\n')],
    ]);

    return responses.get(url) || mockResponse('', { ok: false, status: 404 });
  };

  try {
    const destination = path.join(root, 'demo-bundle');
    await downloadPackage(
      {
        id: 'skill:demo-bundle',
        kind: 'skill',
        name: 'Demo Bundle',
        path: 'catalog/skills/demo-bundle',
      },
      destination
    );

    assert.equal(fs.readFileSync(path.join(destination, 'SKILL.md'), 'utf8'), '---\nname: Demo Bundle\n---\n');
    assert.equal(fs.readFileSync(path.join(destination, 'scripts', 'extract.js'), 'utf8'), 'export const demo = true;\n');
    assert.equal(fs.readFileSync(path.join(destination, 'references', 'spec.json'), 'utf8'), '{"demo":true}\n');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousLocalRegistry === undefined) {
      delete process.env.USE_LOCAL_REGISTRY;
    } else {
      process.env.USE_LOCAL_REGISTRY = previousLocalRegistry;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
