import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const index = {
  schemaVersion: '2',
  packages: {
    'stack:vercel': { id: 'stack:vercel', kind: 'stack', name: 'Vercel', version: '1.0.0', related: {
      operatorSkill: 'skill:vercel', skills: ['skill:vercel', 'skill:publish-site'],
    } },
    'skill:vercel': { id: 'skill:vercel', kind: 'skill', name: 'Vercel Operator', version: '1.0.0',
      meta: { category: 'web', description: 'Deploy a site', tags: ['capability:deploy', 'provider:vercel'] },
      requires: { stacks: ['stack:vercel'] } },
    'skill:publish-site': { id: 'skill:publish-site', kind: 'skill', name: 'Publish Site', version: '1.0.0',
      meta: { category: 'web', description: 'Publish project', tags: ['capability:deploy', 'provider:vercel'] },
      requires: { stacks: ['stack:vercel'] } },
    'skill:other': { id: 'skill:other', kind: 'skill', name: 'Other', version: '1.0.0', meta: { category: 'data', description: 'Analyze information' } },
  },
};

function search(query, options, cliArgs) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-facet-search-'));
  try {
    fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify(index));
    const commandArgs = cliArgs ? ['src/index.js', ...cliArgs] : ['--input-type=module', '-e', `
      import { searchPackages } from './packages/registry-client/src/index.js';
      console.log(JSON.stringify(await searchPackages(process.argv[1], JSON.parse(process.argv[2]))));
    `, query, JSON.stringify(options)];
    const output = execFileSync(process.execPath, commandArgs, {
      cwd: repoRoot, encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: path.join(root, 'home'),
        USE_LOCAL_REGISTRY: 'true', RUDI_REGISTRY_ROOT: root },
    });
    return JSON.parse(output);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('search finds skill categories and distinguishes operators from required-stack workflows', () => {
  const results = search('web', { kind: 'skill', category: 'web', role: 'operator', provider: 'vercel' });
  assert.deepEqual(results.map(pkg => pkg.id), ['skill:vercel']);
  assert.equal(results[0].skillRole, 'operator');
  assert.deepEqual(results[0].operatorFor, ['stack:vercel']);
  assert.deepEqual(results[0].facets, { capabilities: ['deploy'], domains: [], providers: ['vercel'] });
  const workflows = search('', { kind: 'skill', role: 'workflow', capability: 'deploy' });
  assert.deepEqual(workflows.map(pkg => pkg.id), ['skill:publish-site']);
});

test('CLI query and all-skills JSON searches apply the same facet filters', () => {
  const all = search('', {}, ['search', '--all', '--skills', '--category=web', '--role=operator', '--json']);
  assert.deepEqual(all.skill.map(pkg => pkg.id), ['skill:vercel']);
  const query = search('', {}, ['search', 'web', '--skills', '--role=workflow', '--json']);
  assert.deepEqual(query.map(pkg => pkg.id), ['skill:publish-site']);
});
