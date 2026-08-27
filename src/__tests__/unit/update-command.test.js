import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cmdUpdate,
  resolveUpdateTarget,
  runUpdate,
} from '../../commands/update.js';

function createDeps(overrides = {}) {
  const calls = [];
  return {
    calls,
    async fetchIndex(options) {
      calls.push(['fetchIndex', options]);
      return {};
    },
    async listInstalled() {
      calls.push(['listInstalled']);
      return [
        { id: 'stack:video-editor', kind: 'stack', name: 'video-editor' },
        { id: 'runtime:node', kind: 'runtime', name: 'node' },
        { id: 'skill:video-editor', kind: 'skill', name: 'video-editor' },
      ];
    },
    async updatePackage(id, options) {
      calls.push(['updatePackage', id, options]);
      return { success: true, id, path: `/tmp/${id.replace(':', '-')}` };
    },
    async rebuildToolIndex(options) {
      calls.push(['rebuildToolIndex', options]);
      return { indexed: options.stacks.length, failed: 0, index: { byStack: {} } };
    },
    log(message) {
      calls.push(['log', message]);
    },
    error(message) {
      calls.push(['error', message]);
    },
    ...overrides,
  };
}

test('cmdUpdate JSON mode emits exactly one structured result document', async () => {
  const output = [];
  const expected = {
    dryRun: true,
    updated: 0,
    failed: 0,
    plannedPackages: ['stack:swe-engineering'],
  };

  await cmdUpdate(
    ['stack:swe-engineering'],
    { json: true, 'dry-run': true },
    {
      async runUpdate() {
        return expected;
      },
      log(line) {
        output.push(line);
      },
      exit(code) {
        assert.fail(`unexpected exit ${code}`);
      },
    },
  );

  assert.equal(output.length, 1);
  assert.deepEqual(JSON.parse(output[0]), expected);
});

test('resolveUpdateTarget rejects ambiguous bare package names instead of defaulting to runtime', async () => {
  const deps = createDeps();

  await assert.rejects(
    () => resolveUpdateTarget('video-editor', deps),
    /Ambiguous package "video-editor"/
  );
});

test('resolveUpdateTarget rejects Agent Host updates before package inventory lookup', async () => {
  const deps = createDeps({
    async listInstalled() {
      assert.fail('external Agent Host updates must not inspect RUDI package inventory');
    },
  });

  await assert.rejects(
    () => resolveUpdateTarget('agent:codex', deps),
    /vendor-managed.*cannot be updated by RUDI.*rudi agent hosts --json/i,
  );
});

test('runUpdate updates an explicit stack through core installer and rebuilds its tool index', async () => {
  const deps = createDeps();

  const result = await runUpdate(['stack:video-editor'], {}, deps);

  assert.equal(result.updated, 1);
  assert.equal(result.failed, 0);
  const nonLogCalls = deps.calls.filter(call => call[0] !== 'log');
  const indexCall = nonLogCalls.find(call => call[0] === 'rebuildToolIndex');
  assert.equal(typeof indexCall[1].log, 'function');
  delete indexCall[1].log;
  assert.deepEqual(
    nonLogCalls,
    [
      ['listInstalled'],
      ['fetchIndex', { force: true }],
      ['updatePackage', 'stack:video-editor', { preserveState: false }],
      ['rebuildToolIndex', {
        stacks: ['stack:video-editor'],
        timeout: 20000,
        validate: false,
      }],
    ]
  );
});

test('runUpdate preserves install-local state only when explicitly requested', async () => {
  const deps = createDeps();

  await runUpdate(['stack:video-editor'], { 'preserve-state': true }, deps);

  assert.deepEqual(
    deps.calls.find(call => call[0] === 'updatePackage'),
    ['updatePackage', 'stack:video-editor', { preserveState: true }]
  );

  const falseDeps = createDeps();
  await runUpdate(['stack:video-editor'], { 'preserve-state': 'false' }, falseDeps);

  assert.deepEqual(
    falseDeps.calls.find(call => call[0] === 'updatePackage'),
    ['updatePackage', 'stack:video-editor', { preserveState: false }]
  );
});

test('runUpdate reports native skill wrapper sync commands after updating a skill', async () => {
  const deps = createDeps();

  const result = await runUpdate(['skill:video-editor'], {}, deps);

  assert.equal(result.updated, 1);
  assert.deepEqual(
    deps.calls.filter(call => call[0] === 'rebuildToolIndex'),
    []
  );

  const logOutput = deps.calls
    .filter(call => call[0] === 'log')
    .map(call => call[1])
    .join('\n');

  assert.match(logOutput, /rudi skills sync codex skill:video-editor --force/);
  assert.match(logOutput, /rudi skills sync claude skill:video-editor --force/);
  assert.match(logOutput, /not overwritten automatically/i);
});

test('runUpdate requires explicit --all before touching the whole installed inventory', async () => {
  const deps = createDeps();

  await assert.rejects(
    () => runUpdate([], {}, deps),
    /--all/,
  );

  assert.deepEqual(deps.calls, []);
});

test('runUpdate rejects extra positional package IDs instead of silently ignoring them', async () => {
  const deps = createDeps();

  await assert.rejects(
    () => runUpdate(['stack:video-editor', 'runtime:node'], {}, deps),
    /one package id/,
  );

  assert.deepEqual(deps.calls, []);
});

test('runUpdate expands an installed stack through Registry related.skills when explicitly requested', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist' },
        { id: 'skill:horizontal-engineering-review', kind: 'skill', name: 'horizontal-engineering-review' },
        { id: 'runtime:node', kind: 'runtime', name: 'node' },
      ];
    },
    async resolvePackage(id) {
      assert.equal(id, 'stack:swe-engineering');
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:swe-compliance-checklist', kind: 'skill', isOperator: true },
          { id: 'skill:horizontal-engineering-review', kind: 'skill', isOperator: false },
          { id: 'skill:not-installed', kind: 'skill', isOperator: false },
        ],
      };
    },
  });

  const result = await runUpdate(
    ['stack:swe-engineering'],
    { 'with-related-skills': true },
    deps,
  );

  assert.deepEqual(
    deps.calls.filter((call) => call[0] === 'updatePackage').map((call) => call[1]),
    [
      'stack:swe-engineering',
      'skill:swe-compliance-checklist',
      'skill:horizontal-engineering-review',
    ],
  );
  assert.deepEqual(result.relatedSkills.notInstalled, ['skill:not-installed']);
  assert.equal(result.skipped, 1);
  assert.deepEqual(result.skippedPackages, [{
    id: 'skill:not-installed',
    error: 'Related skill is not installed',
  }]);
  assert.deepEqual(result.updatedSkills, [
    'skill:horizontal-engineering-review',
    'skill:swe-compliance-checklist',
  ]);
});

test('runUpdate dry-run returns the exact suite plan without package or index mutations', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist' },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:swe-compliance-checklist', kind: 'skill', isOperator: true },
        ],
      };
    },
  });

  const result = await runUpdate(
    ['stack:swe-engineering'],
    { 'with-related-skills': true, 'dry-run': true },
    deps,
  );

  assert.equal(result.dryRun, true);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.plannedPackages, [
    'stack:swe-engineering',
    'skill:swe-compliance-checklist',
  ]);
  assert.deepEqual(result.plannedIndexedStacks, ['stack:swe-engineering']);
  assert.deepEqual(
    deps.calls.filter((call) => ['updatePackage', 'rebuildToolIndex'].includes(call[0])),
    [],
  );
});

test('runUpdate suite dry-run projects only planned skills to explicitly selected native hosts', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist' },
        { id: 'skill:unrelated', kind: 'skill', name: 'unrelated' },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:swe-compliance-checklist', kind: 'skill', isOperator: true },
        ],
      };
    },
    async syncCodexSkills(options) {
      deps.calls.push(['syncCodexSkills', options]);
      return { codexRoot: '/tmp/codex-skills', results: [] };
    },
  });

  const result = await runUpdate(
    ['stack:swe-engineering'],
    {
      'with-related-skills': true,
      'sync-skills': 'codex',
      'dry-run': true,
    },
    deps,
  );

  const syncCall = deps.calls.find((call) => call[0] === 'syncCodexSkills');
  assert.deepEqual(syncCall[1].skills.map((skill) => skill.id), [
    'skill:swe-compliance-checklist',
  ]);
  assert.equal(syncCall[1].force, true);
  assert.equal(syncCall[1].dryRun, true);
  assert.deepEqual(result.skillProjection.targets, ['codex']);
  assert.deepEqual(result.skillProjection.skillIds, ['skill:swe-compliance-checklist']);
});

test('runUpdate all updates installed packages and rebuilds stack index once', async () => {
  const deps = createDeps();

  const result = await runUpdate([], { all: true }, deps);

  assert.equal(result.updated, 3);
  assert.equal(result.failed, 0);
  assert.deepEqual(
    deps.calls.filter(call => call[0] === 'updatePackage').map(call => call[1]),
    ['stack:video-editor', 'runtime:node', 'skill:video-editor']
  );
  assert.equal(
    deps.calls.filter(call => call[0] === 'rebuildToolIndex').length,
    1
  );
  assert.deepEqual(
    deps.calls.find(call => call[0] === 'rebuildToolIndex')[1].stacks,
    ['stack:video-editor']
  );
});

test('runUpdate fails explicit updates for packages that are not installed', async () => {
  const deps = createDeps();

  await assert.rejects(
    () => runUpdate(['stack:not-installed'], {}, deps),
    /Package not installed: stack:not-installed/
  );
});
