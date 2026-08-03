import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

test('resolvePackage surfaces related skills without adding them to dependency install order', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-related-skills-'));
  const registryRoot = path.join(root, 'registry');
  const rudiHome = path.join(root, '.rudi');

  process.env.RUDI_HOME = rudiHome;
  process.env.USE_LOCAL_REGISTRY = 'true';
  process.env.RUDI_REGISTRY_ROOT = registryRoot;

  writeJson(path.join(registryRoot, 'index.json'), {
    schemaVersion: '2',
    packages: {
      'stack:video-editor': {
        id: 'stack:video-editor',
        kind: 'stack',
        name: 'Video Editor',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/stacks/video-editor' },
        runtime: 'node',
        provides: { tools: ['video_render'] },
        mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        related: {
          operatorSkill: 'skill:shortform-your-words-script',
          skills: ['skill:shortform-your-words-script'],
        },
      },
      'skill:shortform-your-words-script': {
        id: 'skill:shortform-your-words-script',
        kind: 'skill',
        name: 'Shortform Your Words Script',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/skills/shortform-your-words-script.md' },
      },
    },
  });

  writeJson(path.join(registryRoot, 'catalog/stacks/video-editor/manifest.json'), {
    id: 'video-editor',
    name: 'Video Editor',
    version: '1.0.0',
    related: {
      operatorSkill: 'skill:shortform-your-words-script',
      skills: ['skill:shortform-your-words-script']
    }
  });

  const { resolvePackage, getInstallOrder } = await import('../../resolver.js');

  const resolved = await resolvePackage('stack:video-editor');

  assert.deepEqual(
    resolved.relatedSkills.map((skill) => ({
      id: skill.id,
      kind: skill.kind,
      name: skill.name,
      installed: skill.installed,
      isOperator: skill.isOperator,
    })),
    [
      {
        id: 'skill:shortform-your-words-script',
        kind: 'skill',
        name: 'Shortform Your Words Script',
        installed: false,
        isOperator: true,
      },
    ]
  );
  assert.deepEqual(getInstallOrder(resolved).map((pkg) => pkg.id), ['stack:video-editor']);

  fs.rmSync(root, { recursive: true, force: true });
});

test('resolvePackage rejects a stack whose primary operator skill is missing', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-missing-operator-skill-'));
  const registryRoot = path.join(root, 'registry');
  const rudiHome = path.join(root, '.rudi');

  process.env.RUDI_HOME = rudiHome;
  process.env.USE_LOCAL_REGISTRY = 'true';
  process.env.RUDI_REGISTRY_ROOT = registryRoot;

  writeJson(path.join(registryRoot, 'index.json'), {
    schemaVersion: '2',
    packages: {
      'stack:demo': {
        id: 'stack:demo',
        kind: 'stack',
        name: 'Demo',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/stacks/demo' },
        runtime: 'node',
        provides: { tools: ['demo_run'] },
        mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        related: { skills: [] },
      },
    },
  });

  const { resolvePackage } = await import('../../resolver.js');

  await assert.rejects(
    resolvePackage('stack:demo'),
    /stack:demo requires related\.operatorSkill/
  );

  fs.rmSync(root, { recursive: true, force: true });
});

test('resolvePackage rejects an operator skill omitted from related.skills', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-unrelated-operator-skill-'));
  const registryRoot = path.join(root, 'registry');
  const rudiHome = path.join(root, '.rudi');

  process.env.RUDI_HOME = rudiHome;
  process.env.USE_LOCAL_REGISTRY = 'true';
  process.env.RUDI_REGISTRY_ROOT = registryRoot;

  writeJson(path.join(registryRoot, 'index.json'), {
    schemaVersion: '2',
    packages: {
      'stack:demo': {
        id: 'stack:demo',
        kind: 'stack',
        name: 'Demo',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/stacks/demo' },
        runtime: 'node',
        provides: { tools: ['demo_run'] },
        mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        related: {
          operatorSkill: 'skill:demo',
          skills: [],
        },
      },
      'skill:demo': {
        id: 'skill:demo',
        kind: 'skill',
        name: 'Demo Operator',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/skills/demo.md' },
      },
    },
  });

  const { resolvePackage } = await import('../../resolver.js');

  await assert.rejects(
    resolvePackage('stack:demo'),
    /related\.operatorSkill must appear in related\.skills/
  );

  fs.rmSync(root, { recursive: true, force: true });
});

test('resolvePackage rejects an unknown primary operator skill package', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-unknown-operator-skill-'));
  const registryRoot = path.join(root, 'registry');
  const rudiHome = path.join(root, '.rudi');

  process.env.RUDI_HOME = rudiHome;
  process.env.USE_LOCAL_REGISTRY = 'true';
  process.env.RUDI_REGISTRY_ROOT = registryRoot;

  writeJson(path.join(registryRoot, 'index.json'), {
    schemaVersion: '2',
    packages: {
      'stack:demo': {
        id: 'stack:demo',
        kind: 'stack',
        name: 'Demo',
        version: '1.0.0',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/stacks/demo' },
        runtime: 'node',
        provides: { tools: ['demo_run'] },
        mcp: { transport: 'stdio', command: 'node', args: ['src/index.js'] },
        related: {
          operatorSkill: 'skill:missing',
          skills: ['skill:missing'],
        },
      },
    },
  });

  const { resolvePackage } = await import('../../resolver.js');

  await assert.rejects(
    resolvePackage('stack:demo'),
    /operator skill package not found: skill:missing/
  );

  fs.rmSync(root, { recursive: true, force: true });
});

test('resolvePackage installs workflow-required skills as dependencies', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-workflow-skills-'));
  const registryRoot = path.join(root, 'registry');
  const rudiHome = path.join(root, '.rudi');

  process.env.RUDI_HOME = rudiHome;
  process.env.USE_LOCAL_REGISTRY = 'true';
  process.env.RUDI_REGISTRY_ROOT = registryRoot;

  writeJson(path.join(registryRoot, 'index.json'), {
    schemaVersion: '2',
    packages: {
      'workflow:daily-brief': {
        id: 'workflow:daily-brief',
        name: 'Daily Brief',
        version: '1.0.0',
        kind: 'workflow',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/workflows/daily-brief.yaml' },
        requires: {
          skills: ['shortform-your-words-script'],
        },
      },
      'skill:shortform-your-words-script': {
        id: 'skill:shortform-your-words-script',
        name: 'Shortform Your Words Script',
        version: '1.0.0',
        kind: 'skill',
        delivery: 'remote',
        install: { source: 'catalog', path: 'catalog/skills/shortform-your-words-script.md' },
      },
    },
  });

  fs.mkdirSync(path.join(registryRoot, 'catalog/workflows'), { recursive: true });
  fs.writeFileSync(path.join(registryRoot, 'catalog/workflows/daily-brief.yaml'), 'id: workflow:daily-brief\n');

  const { resolvePackage, getInstallOrder } = await import('../../resolver.js');

  const resolved = await resolvePackage('workflow:daily-brief');

  assert.deepEqual(
    resolved.dependencies.map((dependency) => ({
      id: dependency.id,
      kind: dependency.kind,
      name: dependency.name,
      installed: dependency.installed,
    })),
    [
      {
        id: 'skill:shortform-your-words-script',
        kind: 'skill',
        name: 'Shortform Your Words Script',
        installed: false,
      },
    ]
  );
  assert.deepEqual(
    getInstallOrder(resolved).map((pkg) => pkg.id),
    ['skill:shortform-your-words-script', 'workflow:daily-brief']
  );

  fs.rmSync(root, { recursive: true, force: true });
});
