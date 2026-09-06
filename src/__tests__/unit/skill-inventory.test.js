import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function inventoryCommand(command, { catalog = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-skill-inventory-'));
  try {
    const script = `
      import fs from 'node:fs';
      import path from 'node:path';
      import { installPackage } from './packages/core/src/installer.js';
      import { cmdList } from './src/commands/list.js';
      import { cmdInfo } from './src/commands/info.js';
      const registryRoot = process.env.RUDI_REGISTRY_ROOT;
      const skill = { id: 'skill:web-publisher', kind: 'skill', name: 'Web Publisher', version: '1.2.0',
        path: 'catalog/skills/web-publisher', dependencies: [] };
      const source = path.join(registryRoot, skill.path);
      fs.mkdirSync(source, { recursive: true });
      fs.writeFileSync(path.join(source, 'SKILL.md'), [
        '---', 'name: Web Publisher', 'version: 1.2.0', 'description: Publish and verify a website.',
        'category: web', 'tags: ["capability:deploy", "provider:vercel"]',
        'requires:', '  stacks: ["stack:vercel"]', '---', '',
      ].join('\\n'));
      const result = await installPackage(skill.id, { resolvedPackage: skill });
      if (!result.success) throw new Error(result.error);
      if (${catalog}) fs.writeFileSync(path.join(registryRoot, 'index.json'), JSON.stringify({
        schemaVersion: '2', packages: {
          [skill.id]: skill,
          'stack:vercel': { id: 'stack:vercel', kind: 'stack', name: 'Vercel', version: '1.0.0',
            related: { operatorSkill: skill.id, skills: [skill.id] } },
        },
      }));
      globalThis.fetch = () => { throw new Error('Installed inventory must not need the network'); };
      ${command}
    `;
    return execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: repoRoot, encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: path.join(root, 'home'), CLAUDE_HOME: path.join(root, 'claude'),
        USE_LOCAL_REGISTRY: 'true', RUDI_REGISTRY_ROOT: path.join(root, 'registry') },
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('installed skill listing filters facets and derives operator identity without network access', () => {
  const skills = JSON.parse(inventoryCommand("await cmdList(['skills'], { json: true, role: 'operator', provider: 'vercel' });"));
  assert.equal(skills.length, 1);
  assert.equal(skills[0].skillRole, 'operator');
  assert.deepEqual(skills[0].operatorFor, ['stack:vercel']);
  assert.deepEqual(skills[0].facets.capabilities, ['deploy']);
  const absent = JSON.parse(inventoryCommand("await cmdList(['skills'], { json: true, role: 'workflow' });"));
  assert.deepEqual(absent, []);
});

test('skill info displays entrypoint metadata and its primary stack relationship', () => {
  const output = inventoryCommand("await cmdInfo(['skill:web-publisher'], {});");
  assert.match(output, /Name:\s+Web Publisher/);
  assert.match(output, /Version:\s+1\.2\.0/);
  assert.match(output, /Category:\s+web/);
  assert.match(output, /Role:\s+operator/);
  assert.match(output, /Operator for:\s+stack:vercel/);
});


test('offline inventory preserves metadata and explicitly reports unknown role', () => {
  const skills = JSON.parse(inventoryCommand("await cmdList(['skills'], { json: true, role: 'unknown' });", { catalog: false }));
  assert.equal(skills.length, 1);
  assert.equal(skills[0].skillRole, 'unknown');
  assert.equal(skills[0].category, 'web');
  assert.deepEqual(skills[0].operatorFor, []);
});
