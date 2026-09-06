import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../..');
const installerUrl = pathToFileURL(path.join(repoRoot, 'packages/core/src/installer.js')).href;

test('listInstalled canonicalizes legacy stack manifest ids', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-list-installed-'));
  const rudiHome = path.join(root, '.rudi');
  const stackPath = path.join(rudiHome, 'stacks', 'video-editor');
  fs.mkdirSync(stackPath, { recursive: true });
  fs.writeFileSync(path.join(stackPath, 'manifest.json'), JSON.stringify({
    id: 'video-editor',
    name: 'Video Editor',
    version: '1.0.0',
  }));

  try {
    const script = `
      const { listInstalled } = await import(process.argv[1]);
      const installed = await listInstalled('stack');
      console.log(JSON.stringify(installed));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, installerUrl], {
      cwd: repoRoot,
      env: { ...process.env, RUDI_HOME: rudiHome },
      encoding: 'utf8',
    });

    const installed = JSON.parse(output);
    assert.equal(installed.length, 1);
    assert.equal(installed[0].id, 'stack:video-editor');
    assert.equal(installed[0].kind, 'stack');
    assert.equal(installed[0].name, 'Video Editor');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('listInstalled includes local and Claude directory skills with metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-list-installed-skills-'));
  const rudiHome = path.join(root, '.rudi');
  const claudeHome = path.join(root, '.claude');
  const rudiSkillDir = path.join(rudiHome, 'skills', 'grill-with-docs');
  const claudeSkillDir = path.join(claudeHome, 'skills', 'pdf');
  fs.mkdirSync(rudiSkillDir, { recursive: true });
  fs.mkdirSync(claudeSkillDir, { recursive: true });
  fs.writeFileSync(path.join(rudiHome, 'skills', 'brainstorm.md'), [
    '---',
    'name: brainstorm',
    'description: Flat brainstorm skill',
    'category: thinking',
    '---',
    ''
  ].join('\n'));
  fs.writeFileSync(path.join(rudiSkillDir, 'SKILL.md'), [
    '---',
    'name: grill-with-docs',
    'description: Challenge a plan against docs',
    '---',
    ''
  ].join('\n'));
  fs.writeFileSync(path.join(claudeSkillDir, 'SKILL.md'), [
    '---',
    'name: pdf',
    'description: Work with PDF files',
    '---',
    ''
  ].join('\n'));

  try {
    const script = `
      const { listInstalled } = await import(process.argv[1]);
      const installed = await listInstalled('skill');
      console.log(JSON.stringify(installed));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script, installerUrl], {
      cwd: repoRoot,
      env: { ...process.env, RUDI_HOME: rudiHome, CLAUDE_HOME: claudeHome },
      encoding: 'utf8',
    });

    const installed = JSON.parse(output);
    assert.deepEqual(
      installed.map(skill => [skill.id, skill.description, skill.format, skill.source]).sort(),
      [
        ['skill:brainstorm', 'Flat brainstorm skill', 'flat', 'rudi'],
        ['skill:grill-with-docs', 'Challenge a plan against docs', 'directory', 'rudi'],
        ['skill:pdf', 'Work with PDF files', 'directory', 'claude'],
      ],
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('installed skill metadata preserves YAML facet lists and multiline descriptions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-skill-metadata-'));
  const skillRoot = path.join(root, 'skills', 'web-publisher');
  fs.mkdirSync(skillRoot, { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), [
    '---',
    'name: Web Publisher',
    'description: >-',
    '  Publish a website',
    '  and verify its deployment.',
    'category: web',
    'tags: ["capability:deploy", "provider:vercel"]',
    'requires:',
    '  stacks: ["stack:vercel"]',
    '---',
    '',
  ].join('\r\n'));
  try {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { listInstalled } = await import(process.argv[1]);
      console.log(JSON.stringify((await listInstalled('skill')).find(s => s.id === 'skill:web-publisher')));
    `, installerUrl], {
      cwd: repoRoot,
      env: { ...process.env, RUDI_HOME: root, CLAUDE_HOME: path.join(root, 'claude') },
      encoding: 'utf8',
    });
    const skill = JSON.parse(output);
    assert.deepEqual(skill.tags, ['capability:deploy', 'provider:vercel']);
    assert.equal(skill.description, 'Publish a website and verify its deployment.');
    assert.deepEqual(skill.requires, { stacks: ['stack:vercel'] });
    assert.equal(skill.category, 'web');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
