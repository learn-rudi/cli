import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from '@learnrudi/utils/args';

import {
  buildClaudeSkillFiles,
  buildCodexSkillFiles,
  cmdSkills,
  parseNativeSkillSyncTargets,
  syncSelectedSkillsToNativeHosts,
  syncAntigravitySkills,
  syncClaudeSkills,
  syncCodexSkills,
  syncGeminiSkills,
} from '../../commands/skills.js';

function makeTempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('parseNativeSkillSyncTargets rejects an explicitly empty host selection', () => {
  assert.throws(
    () => parseNativeSkillSyncTargets(''),
    /requires a host name/,
  );
});

test('cmdSkills projects only explicitly requested installed RUDI skill IDs', async () => {
  const calls = [];
  const installedSkills = [
    { id: 'skill:rudi-change-map', kind: 'skill', source: 'rudi', entryPath: '/tmp/change-map.md' },
    { id: 'skill:rudi-engineering-gate', kind: 'skill', source: 'rudi', entryPath: '/tmp/engineering-gate.md' },
    { id: 'skill:external-only', kind: 'skill', source: 'claude', entryPath: '/tmp/external.md' },
  ];

  await cmdSkills(
    ['sync', 'codex', 'skill:rudi-change-map'],
    { 'dry-run': true },
    {
      async listInstalled(kind) {
        calls.push(['listInstalled', kind]);
        return installedSkills;
      },
      async syncCodexSkills(options) {
        calls.push(['syncCodexSkills', options]);
        return { codexRoot: '/tmp/codex-skills', results: [] };
      },
      log() {},
    },
  );

  assert.deepEqual(calls[0], ['listInstalled', 'skill']);
  assert.deepEqual(
    calls[1][1].skills.map((skill) => skill.id),
    ['skill:rudi-change-map'],
  );
});

test('CLI boolean sync flags preserve following exact skill IDs and dry-run scope', async () => {
  const parsed = parseArgs([
    'skills',
    'sync',
    'codex',
    '--dry-run',
    'skill:rudi-change-map',
    '--json',
  ]);
  const calls = [];

  assert.equal(parsed.command, 'skills');
  assert.deepEqual(parsed.args, ['sync', 'codex', 'skill:rudi-change-map']);
  assert.equal(parsed.flags['dry-run'], true);
  assert.equal(parsed.flags.json, true);

  await cmdSkills(parsed.args, parsed.flags, {
    async listInstalled() {
      return [{
        id: 'skill:rudi-change-map',
        kind: 'skill',
        source: 'rudi',
        entryPath: '/tmp/rudi-change-map.md',
      }];
    },
    async syncCodexSkills(options) {
      calls.push(options);
      return { codexRoot: '/tmp/codex-skills', total: 0, results: [] };
    },
    log() {},
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].skills.map((skill) => skill.id), ['skill:rudi-change-map']);
  assert.equal(calls[0].dryRun, true);
});

test('cmdSkills requires --all before force-syncing the whole installed skill inventory', async () => {
  const calls = [];

  await assert.rejects(
    () => cmdSkills(
      ['sync', 'codex'],
      { force: true },
      {
        async syncCodexSkills(options) {
          calls.push(options);
          return { codexRoot: '/tmp/codex-skills', results: [] };
        },
        log() {},
      },
    ),
    /--all/,
  );

  assert.deepEqual(calls, []);
});

test('cmdSkills rejects unknown or external skill IDs before native projection', async () => {
  const calls = [];

  await assert.rejects(
    () => cmdSkills(
      ['sync', 'codex', 'skill:external-only'],
      { 'dry-run': true },
      {
        async listInstalled() {
          return [{
            id: 'skill:external-only',
            kind: 'skill',
            source: 'claude',
            entryPath: '/tmp/external.md',
          }];
        },
        async syncCodexSkills(options) {
          calls.push(options);
          return { codexRoot: '/tmp/codex-skills', results: [] };
        },
        log() {},
      },
    ),
    /Installed RUDI skill not found/,
  );

  assert.deepEqual(calls, []);
});

test('cmdSkills allows an explicitly acknowledged whole-inventory force sync', async () => {
  const calls = [];

  await cmdSkills(
    ['sync', 'codex'],
    { all: true, force: true, 'dry-run': true },
    {
      async syncCodexSkills(options) {
        calls.push(options);
        return { codexRoot: '/tmp/codex-skills', results: [] };
      },
      log() {},
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].skills, null);
  assert.equal(calls[0].force, true);
  assert.equal(calls[0].dryRun, true);
});

test('syncSelectedSkillsToNativeHosts converts thrown host failures into structured results', async () => {
  const result = await syncSelectedSkillsToNativeHosts(
    {
      targets: ['codex', 'claude'],
      skillIds: ['skill:rudi-change-map'],
      force: true,
    },
    {
      async listInstalled() {
        return [{
          id: 'skill:rudi-change-map',
          kind: 'skill',
          source: 'rudi',
          entryPath: '/tmp/rudi-change-map.md',
        }];
      },
      async syncCodexSkills() {
        throw new Error('fixture host failure');
      },
      async syncClaudeSkills() {
        return { claudeRoot: '/tmp/claude-skills', total: 0, results: [] };
      },
    },
  );

  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures, [{
    target: 'codex',
    id: 'skill:rudi-change-map',
    error: 'fixture host failure',
  }]);
  assert.equal(result.results.codex.results[0].action, 'failed');
  assert.deepEqual(result.results.claude.results, []);
});

test('buildCodexSkillFiles normalizes RUDI skill metadata for Codex', () => {
  const files = buildCodexSkillFiles(
    {
      id: 'skill:grill-with-docs',
      name: 'Grill With Docs',
      description: 'Stress-test a plan against the existing domain model',
    },
    [
      '---',
      'name: Grill With Docs',
      'description: Registry description',
      'version: 1.0.0',
      '---',
      '',
      'Ask questions one at a time.',
      '',
    ].join('\n')
  );

  assert.equal(files.skillName, 'grill-with-docs');
  assert.match(files.skillMd, /^name: "?grill-with-docs"?$/m);
  assert.match(files.skillMd, /^description: "Stress-test a plan against the existing domain model"$/m);
  assert.match(files.skillMd, /Ask questions one at a time\./);
  assert.match(files.openaiYaml, /display_name: "Grill With Docs"/);
  assert.match(files.openaiYaml, /default_prompt: "Use \$grill-with-docs/);
});

test('buildCodexSkillFiles humanizes a portable hyphen-case skill name for display', () => {
  const files = buildCodexSkillFiles(
    {
      id: 'skill:design-system-extractor',
      name: 'design-system-extractor',
      description: 'Extract a website design system',
    },
    '---\nname: design-system-extractor\ndescription: Extract a website design system\n---\n\nRun the workflow.\n'
  );

  assert.match(files.openaiYaml, /display_name: "Design System Extractor"/);
});

test('syncCodexSkills creates native Codex skill wrappers for RUDI skills', async () => {
  const root = makeTempRoot('rudi-skills-sync-');

  try {
    const source = path.join(root, 'grill-with-docs.md');
    const codexRoot = path.join(root, 'codex-skills');
    fs.writeFileSync(source, [
      '---',
      'name: Grill With Docs',
      'description: Stress-test docs',
      '---',
      '',
      'Ask questions one at a time.',
      '',
    ].join('\n'));

    const result = await syncCodexSkills({
      codexRoot,
      skills: [
        {
          id: 'skill:grill-with-docs',
          kind: 'skill',
          name: 'Grill With Docs',
          description: 'Stress-test docs',
          source: 'rudi',
          entryPath: source,
        },
      ],
    });

    const skillPath = path.join(codexRoot, 'grill-with-docs', 'SKILL.md');
    const openaiPath = path.join(codexRoot, 'grill-with-docs', 'agents', 'openai.yaml');

    assert.equal(result.results[0].action, 'created');
    assert.equal(fs.existsSync(skillPath), true);
    assert.equal(fs.existsSync(openaiPath), true);
    assert.match(fs.readFileSync(skillPath, 'utf-8'), /name: "?grill-with-docs"?/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('syncCodexSkills skips existing wrappers unless force is set', async () => {
  const root = makeTempRoot('rudi-skills-sync-existing-');

  try {
    const source = path.join(root, 'skill.md');
    const codexRoot = path.join(root, 'codex-skills');
    const targetDir = path.join(codexRoot, 'example-skill');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'SKILL.md'), 'existing');
    fs.writeFileSync(source, '---\nname: Example Skill\ndescription: Example\n---\n\nnew body\n');

    const skills = [
      {
        id: 'skill:example-skill',
        kind: 'skill',
        name: 'Example Skill',
        description: 'Example',
        source: 'rudi',
        entryPath: source,
      },
    ];

    const skipped = await syncCodexSkills({ codexRoot, skills });
    assert.equal(skipped.results[0].action, 'skipped');
    assert.equal(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8'), 'existing');

    const updated = await syncCodexSkills({ codexRoot, skills, force: true });
    assert.equal(updated.results[0].action, 'updated');
    assert.match(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8'), /new body/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('syncClaudeSkills creates native Claude skill wrappers for RUDI skills', async () => {
  const root = makeTempRoot('rudi-skills-sync-claude-');

  try {
    const source = path.join(root, 'grill-with-docs.md');
    const claudeRoot = path.join(root, 'claude-skills');
    fs.writeFileSync(source, [
      '---',
      'name: Grill With Docs',
      'description: Stress-test docs',
      '---',
      '',
      'Ask questions one at a time.',
      '',
    ].join('\n'));

    const result = await syncClaudeSkills({
      claudeRoot,
      skills: [
        {
          id: 'skill:grill-with-docs',
          kind: 'skill',
          name: 'Grill With Docs',
          description: 'Stress-test docs',
          source: 'rudi',
          entryPath: source,
        },
      ],
    });

    const skillPath = path.join(claudeRoot, 'grill-with-docs', 'SKILL.md');
    const openaiPath = path.join(claudeRoot, 'grill-with-docs', 'agents', 'openai.yaml');

    assert.equal(result.results[0].action, 'created');
    assert.equal(fs.existsSync(skillPath), true);
    assert.equal(fs.existsSync(openaiPath), false);
    assert.match(fs.readFileSync(skillPath, 'utf-8'), /name: "?grill-with-docs"?/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('native skill sync preserves supported bundled resources for Codex and Claude', async () => {
  const root = makeTempRoot('rudi-skills-sync-bundle-');

  try {
    const sourceDir = path.join(root, 'source', 'demo-bundle');
    const source = path.join(sourceDir, 'SKILL.md');
    const codexRoot = path.join(root, 'codex-skills');
    const claudeRoot = path.join(root, 'claude-skills');
    fs.mkdirSync(path.join(sourceDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(sourceDir, 'references'), { recursive: true });
    fs.mkdirSync(path.join(sourceDir, 'assets'), { recursive: true });
    fs.writeFileSync(source, '---\nname: Demo Bundle\ndescription: Bundled resources\n---\n\nUse the bundle.\n');
    fs.writeFileSync(path.join(sourceDir, 'scripts', 'extract.js'), 'export const extract = true;\n');
    fs.writeFileSync(path.join(sourceDir, 'references', 'spec.json'), '{"demo":true}\n');
    fs.writeFileSync(path.join(sourceDir, 'assets', 'sample.txt'), 'sample\n');

    const skills = [
      {
        id: 'skill:demo-bundle',
        kind: 'skill',
        name: 'Demo Bundle',
        description: 'Bundled resources',
        source: 'rudi',
        path: sourceDir,
        entryPath: source,
      },
    ];

    await syncCodexSkills({ codexRoot, skills });
    await syncClaudeSkills({ claudeRoot, skills });

    for (const targetRoot of [codexRoot, claudeRoot]) {
      const target = path.join(targetRoot, 'demo-bundle');
      assert.equal(fs.readFileSync(path.join(target, 'scripts', 'extract.js'), 'utf8'), 'export const extract = true;\n');
      assert.equal(fs.readFileSync(path.join(target, 'references', 'spec.json'), 'utf8'), '{"demo":true}\n');
      assert.equal(fs.readFileSync(path.join(target, 'assets', 'sample.txt'), 'utf8'), 'sample\n');
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Gemini CLI and Antigravity receive portable RUDI skill wrappers', async () => {
  const root = makeTempRoot('rudi-skills-sync-google-');

  try {
    const source = path.join(root, 'source', 'example-skill', 'SKILL.md');
    const geminiRoot = path.join(root, 'gemini-skills');
    const antigravityRoot = path.join(root, 'antigravity-skills');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, '---\nname: Example Skill\ndescription: Google host proof\n---\n\nRun the workflow.\n');

    const skills = [{
      id: 'skill:example-skill',
      kind: 'skill',
      name: 'Example Skill',
      description: 'Google host proof',
      source: 'rudi',
      entryPath: source,
    }];

    const gemini = await syncGeminiSkills({ geminiRoot, skills });
    const antigravity = await syncAntigravitySkills({ antigravityRoot, skills });

    assert.equal(gemini.results[0].action, 'created');
    assert.equal(antigravity.results[0].action, 'created');
    assert.equal(fs.existsSync(path.join(geminiRoot, 'example-skill', 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(antigravityRoot, 'example-skill', 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(geminiRoot, 'example-skill', 'agents', 'openai.yaml')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('syncClaudeSkills skips existing wrappers unless force is set', async () => {
  const root = makeTempRoot('rudi-skills-sync-claude-existing-');

  try {
    const source = path.join(root, 'skill.md');
    const claudeRoot = path.join(root, 'claude-skills');
    const targetDir = path.join(claudeRoot, 'example-skill');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'SKILL.md'), 'existing');
    fs.writeFileSync(source, '---\nname: Example Skill\ndescription: Example\n---\n\nnew body\n');

    const skills = [
      {
        id: 'skill:example-skill',
        kind: 'skill',
        name: 'Example Skill',
        description: 'Example',
        source: 'rudi',
        entryPath: source,
      },
    ];

    const skipped = await syncClaudeSkills({ claudeRoot, skills });
    assert.equal(skipped.results[0].action, 'skipped');
    assert.equal(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8'), 'existing');

    const updated = await syncClaudeSkills({ claudeRoot, skills, force: true });
    assert.equal(updated.results[0].action, 'updated');
    assert.match(fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8'), /new body/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('buildClaudeSkillFiles emits a Claude SKILL.md without Codex metadata', () => {
  const files = buildClaudeSkillFiles(
    {
      id: 'skill:grill-with-docs',
      name: 'Grill With Docs',
      description: 'Stress-test a plan against the existing domain model',
    },
    [
      '---',
      'name: Grill With Docs',
      'description: Registry description',
      'version: 1.0.0',
      '---',
      '',
      'Ask questions one at a time.',
      '',
    ].join('\n')
  );

  assert.equal(files.skillName, 'grill-with-docs');
  assert.match(files.skillMd, /^name: "?grill-with-docs"?$/m);
  assert.match(files.skillMd, /Ask questions one at a time\./);
  assert.equal(Object.hasOwn(files, 'openaiYaml'), false);
});
