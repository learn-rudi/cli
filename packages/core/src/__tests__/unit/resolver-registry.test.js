import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('resolvePackage preserves canonical v2 installation fields', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-v2-resolver-'));
  const registryRoot = path.join(root, 'registry');
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
  };

  try {
    fs.mkdirSync(registryRoot, { recursive: true });
    fs.writeFileSync(path.join(registryRoot, 'index.json'), JSON.stringify({
      schemaVersion: '2',
      packages: {
        'agent:demo': {
          id: 'agent:demo',
          kind: 'agent',
          name: 'Demo Agent',
          version: 'latest',
          delivery: 'remote',
          install: {
            source: 'npm',
            package: '@example/demo-agent',
          },
          bins: ['demo-agent'],
          detect: {
            command: 'demo-agent --version',
            expectExitCode: 0,
          },
          auth: {
            required: true,
            command: 'demo-agent login',
          },
          meta: {
            description: 'Demo v2 agent',
          },
        },
      },
    }));

    process.env.RUDI_HOME = path.join(root, '.rudi');
    process.env.USE_LOCAL_REGISTRY = 'true';
    process.env.RUDI_REGISTRY_ROOT = registryRoot;

    const { resolvePackage } = await import('../../resolver.js');
    const resolved = await resolvePackage('agent:demo');

    assert.equal(resolved.id, 'agent:demo');
    assert.equal(resolved.description, 'Demo v2 agent');
    assert.equal(resolved.npmPackage, '@example/demo-agent');
    assert.deepEqual(resolved.install, {
      source: 'npm',
      package: '@example/demo-agent',
    });
    assert.deepEqual(resolved.detect, {
      command: 'demo-agent --version',
      expectExitCode: 0,
    });
    assert.equal(resolved.auth.required, true);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolvePackage enforces provider-owned Codex during Registry rollout', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-codex-rollout-'));
  const registryRoot = path.join(root, 'registry');
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
  };

  try {
    fs.mkdirSync(registryRoot, { recursive: true });
    fs.writeFileSync(path.join(registryRoot, 'index.json'), JSON.stringify({
      schemaVersion: '2',
      packages: {
        'agent:codex': {
          id: 'agent:codex',
          kind: 'agent',
          name: 'OpenAI Codex',
          version: 'latest',
          delivery: 'remote',
          install: { source: 'npm', package: '@openai/codex' },
          bins: ['codex'],
          detect: { command: 'codex --version', expectExitCode: 0 },
        },
      },
    }));

    process.env.RUDI_HOME = path.join(root, '.rudi');
    process.env.USE_LOCAL_REGISTRY = 'true';
    process.env.RUDI_REGISTRY_ROOT = registryRoot;

    const { resolvePackage } = await import('../../resolver.js');
    const resolved = await resolvePackage('agent:codex');

    assert.equal(resolved.version, 'system');
    assert.equal(resolved.delivery, 'system');
    assert.deepEqual(resolved.install, { source: 'system' });
    assert.equal(resolved.npmPackage, undefined);
    assert.match(resolved.installHints.manual, /chatgpt\.com\/codex\/install\.sh/);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolvePackage keeps provider-owned Codex registrable when Registry omits the package', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-codex-registry-fallback-'));
  const registryRoot = path.join(root, 'registry');
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
  };

  try {
    fs.mkdirSync(registryRoot, { recursive: true });
    fs.writeFileSync(path.join(registryRoot, 'index.json'), JSON.stringify({
      schemaVersion: '2',
      packages: {},
    }));

    process.env.RUDI_HOME = path.join(root, '.rudi');
    process.env.USE_LOCAL_REGISTRY = 'true';
    process.env.RUDI_REGISTRY_ROOT = registryRoot;

    const { resolvePackage } = await import('../../resolver.js');
    const resolved = await resolvePackage('agent:codex');

    assert.equal(resolved.id, 'agent:codex');
    assert.equal(resolved.delivery, 'system');
    assert.deepEqual(resolved.install, { source: 'system' });
    assert.deepEqual(resolved.bins, ['codex']);
    assert.equal(resolved.detect.command, 'codex --version');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolvePackage keeps v2 stack dependencies installable for skills', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-v2-skill-dependency-'));
  const registryRoot = path.join(root, 'registry');
  const previous = {
    RUDI_HOME: process.env.RUDI_HOME,
    USE_LOCAL_REGISTRY: process.env.USE_LOCAL_REGISTRY,
    RUDI_REGISTRY_ROOT: process.env.RUDI_REGISTRY_ROOT,
  };

  try {
    fs.mkdirSync(path.join(registryRoot, 'catalog/skills'), { recursive: true });
    fs.writeFileSync(path.join(registryRoot, 'catalog/skills/demo.md'), '# Demo\n');
    fs.writeFileSync(path.join(registryRoot, 'index.json'), JSON.stringify({
      schemaVersion: '2',
      packages: {
        'skill:demo': {
          id: 'skill:demo',
          kind: 'skill',
          name: 'Demo Skill',
          version: '1.0.0',
          delivery: 'remote',
          install: { source: 'catalog', path: 'catalog/skills/demo.md' },
          requires: { stacks: ['stack:demo'] },
        },
        'stack:demo': {
          id: 'stack:demo',
          kind: 'stack',
          name: 'Demo Stack',
          version: '1.0.0',
          delivery: 'remote',
          install: { source: 'catalog', path: 'catalog/stacks/demo' },
          runtime: 'node',
          provides: { tools: ['demo_tool'] },
          mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        },
      },
    }));

    process.env.RUDI_HOME = path.join(root, '.rudi');
    process.env.USE_LOCAL_REGISTRY = 'true';
    process.env.RUDI_REGISTRY_ROOT = registryRoot;

    const { resolvePackage } = await import('../../resolver.js');
    const resolved = await resolvePackage('skill:demo');
    assert.equal(resolved.dependencies[0].id, 'stack:demo');
    assert.equal(resolved.dependencies[0].path, 'catalog/stacks/demo');
    assert.deepEqual(resolved.dependencies[0].install, {
      source: 'catalog',
      path: 'catalog/stacks/demo',
    });
    assert.deepEqual(resolved.dependencies[0].command, ['node', 'src/index.js']);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
