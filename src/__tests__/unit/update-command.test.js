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
      return { packages: { 'skill:rudi-engineering-gate': {
        id: 'skill:rudi-engineering-gate', name: 'Engineering Gate', version: '1.0.0', kind: 'skill', path: 'catalog/skills/rudi-engineering-gate',
      } } };
    },
    async inspectRegistrySkillUpdate(pkg, destination) {
      return { id: pkg.id, from: `/tmp/${pkg.id}`, to: destination, action: 'update' };
    },
    async listInstalled() {
      calls.push(['listInstalled']);
      return [
        { id: 'stack:video-editor', kind: 'stack', name: 'video-editor', path: '/tmp/stack-video-editor' },
        { id: 'runtime:node', kind: 'runtime', name: 'node' },
        { id: 'skill:video-editor', kind: 'skill', name: 'video-editor' },
      ];
    },
    async updatePackage(id, options) {
      calls.push(['updatePackage', id, options]);
      return { success: true, id, path: `/tmp/${id.replace(':', '-')}` };
    },
    getPackageLockfilePath(id) {
      return `/tmp/rudi-locks/${id.replace(':', '-')}.lock.yaml`;
    },
    async createStackUpdateSnapshot(stackPath, options) {
      calls.push(['createStackUpdateSnapshot', stackPath, options]);
      return { targetPath: stackPath, backupRoot: `${stackPath}.backup` };
    },
    async restoreStackUpdateSnapshot(snapshot) {
      calls.push(['restoreStackUpdateSnapshot', snapshot]);
    },
    async discardStackUpdateSnapshot(snapshot) {
      calls.push(['discardStackUpdateSnapshot', snapshot]);
    },
    async loadStackManifest(stackPath) {
      calls.push(['loadStackManifest', stackPath]);
      return {
        version: '2.0.0',
        runtime: 'node',
        command: ['node', 'dist/index.js'],
        requires: { secrets: [{ name: 'STACK_TOKEN', required: false }] },
      };
    },
    async buildStack(stackPath, manifest, options) {
      calls.push(['buildStack', stackPath, manifest, options]);
      return { built: true };
    },
    validateStack(stackPath, manifest) {
      calls.push(['validateStack', stackPath, manifest]);
      return { valid: true };
    },
    registerStack(id, stackInfo) {
      calls.push(['registerStack', id, stackInfo]);
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

test('runUpdate rebuilds, validates, and refreshes stack metadata before indexing', async () => {
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
      ['createStackUpdateSnapshot', '/tmp/stack-video-editor', {
        lockfilePath: '/tmp/rudi-locks/stack-video-editor.lock.yaml',
      }],
      ['updatePackage', 'stack:video-editor', { preserveState: false }],
      ['loadStackManifest', '/tmp/stack-video-editor'],
      ['buildStack', '/tmp/stack-video-editor', {
        version: '2.0.0',
        runtime: 'node',
        command: ['node', 'dist/index.js'],
        requires: { secrets: [{ name: 'STACK_TOKEN', required: false }] },
      }, { force: true, verbose: false }],
      ['validateStack', '/tmp/stack-video-editor', {
        version: '2.0.0',
        runtime: 'node',
        command: ['node', 'dist/index.js'],
        requires: { secrets: [{ name: 'STACK_TOKEN', required: false }] },
      }],
      ['registerStack', 'stack:video-editor', {
        path: '/tmp/stack-video-editor',
        runtime: 'node',
        command: ['node', 'dist/index.js'],
        secrets: [{ name: 'STACK_TOKEN', required: false }],
        version: '2.0.0',
      }],
      ['discardStackUpdateSnapshot', {
        targetPath: '/tmp/stack-video-editor',
        backupRoot: '/tmp/stack-video-editor.backup',
      }],
      ['rebuildToolIndex', {
        stacks: ['stack:video-editor'],
        timeout: 20000,
        validate: false,
      }],
    ]
  );
});

test('runUpdate rejects an explicitly targeted pinned GitHub package before registry refresh', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [{
        id: 'stack:demo',
        kind: 'stack',
        name: 'demo',
        source: {
          type: 'github',
          requestedRef: 'main',
          resolvedCommit: '0123456789abcdef0123456789abcdef01234567',
        },
      }];
    },
    async fetchIndex() {
      assert.fail('pinned GitHub updates must stop before registry refresh');
    },
  });

  await assert.rejects(
    () => runUpdate(['stack:demo'], {}, deps),
    /pinned GitHub source.*reinstall with an explicit GitHub tree URL/i,
  );
});

test('runUpdate --all skips pinned GitHub packages in both planning and execution', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:registry-demo', kind: 'stack', name: 'registry-demo' },
        {
          id: 'stack:github-demo',
          kind: 'stack',
          name: 'github-demo',
          source: {
            type: 'github',
            resolvedCommit: '0123456789abcdef0123456789abcdef01234567',
          },
        },
      ];
    },
  });

  const result = await runUpdate([], { all: true }, deps);

  assert.deepEqual(
    deps.calls.filter((call) => call[0] === 'updatePackage').map((call) => call[1]),
    ['stack:registry-demo'],
  );
  assert.deepEqual(result.plannedPackages, ['stack:registry-demo']);
  assert.deepEqual(result.skippedPackages, [{
    id: 'stack:github-demo',
    error: 'Pinned GitHub source requires an explicit reinstall URL',
  }]);
});

test('runUpdate does not index or report a stack update when its rebuild fails', async () => {
  const deps = createDeps({
    async buildStack(stackPath, manifest, options) {
      deps.calls.push(['buildStack', stackPath, manifest, options]);
      throw new Error('compile failed');
    },
  });

  await assert.rejects(
    () => runUpdate(['stack:video-editor'], {}, deps),
    /compile failed/,
  );

  assert.equal(deps.calls.some(call => call[0] === 'registerStack'), false);
  assert.equal(deps.calls.some(call => call[0] === 'rebuildToolIndex'), false);
  assert.equal(deps.calls.some(call => call[0] === 'restoreStackUpdateSnapshot'), true);
  assert.equal(deps.calls.some(call => call[0] === 'discardStackUpdateSnapshot'), false);
});

test('runUpdate restores a stack snapshot when package download fails', async () => {
  const deps = createDeps({
    async updatePackage(id, options) {
      deps.calls.push(['updatePackage', id, options]);
      return { success: false, id, error: 'download failed' };
    },
  });

  await assert.rejects(
    () => runUpdate(['stack:video-editor'], {}, deps),
    /download failed/,
  );

  assert.equal(deps.calls.some(call => call[0] === 'restoreStackUpdateSnapshot'), true);
  assert.equal(deps.calls.some(call => call[0] === 'discardStackUpdateSnapshot'), false);
});

test('runUpdate reports snapshot cleanup separately after an accepted stack update', async () => {
  const deps = createDeps({
    async discardStackUpdateSnapshot(snapshot) {
      deps.calls.push(['discardStackUpdateSnapshot', snapshot]);
      throw new Error('cleanup denied');
    },
  });

  const result = await runUpdate(['stack:video-editor'], {}, deps);

  assert.equal(result.updated, 1);
  assert.equal(result.failed, 0);
  assert.equal(deps.calls.some(call => call[0] === 'rebuildToolIndex'), true);
  assert.equal(
    deps.calls.some(call => call[0] === 'error' && /cleanup denied/.test(call[1])),
    true,
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

  assert.match(logOutput, /rudi skills sync codex skill:video-editor/);
  assert.match(logOutput, /rudi skills sync claude skill:video-editor/);
  assert.doesNotMatch(logOutput, /skill:video-editor --force/);
  assert.match(logOutput, /No already-managed native projections were selected/i);
});

test('runUpdate reconciles an exact skill to its already-managed native hosts by default', async () => {
  const deps = createDeps({
    async getManagedNativeSkillHosts(skill) {
      deps.calls.push(['getManagedNativeSkillHosts', skill.id]);
      return ['codex', 'claude'];
    },
    async syncCodexSkills(options) {
      deps.calls.push(['syncCodexSkills', options]);
      return {
        codexRoot: '/tmp/codex-skills',
        results: [{ id: 'skill:video-editor', action: 'updated' }],
        restartRequired: true,
      };
    },
    async syncClaudeSkills(options) {
      deps.calls.push(['syncClaudeSkills', options]);
      return { claudeRoot: '/tmp/claude-skills', results: [{ id: 'skill:video-editor', action: 'current' }] };
    },
  });

  const result = await runUpdate(['skill:video-editor'], {}, deps);

  assert.deepEqual(result.skillProjection.targets, ['codex', 'claude']);
  assert.deepEqual(result.skillProjection.skillIds, ['skill:video-editor']);
  assert.equal(deps.calls.find(call => call[0] === 'syncCodexSkills')[1].force, false);
  assert.equal(deps.calls.find(call => call[0] === 'syncClaudeSkills')[1].force, false);
  assert.equal(result.skillProjection.restartRequired, true);
  assert.match(
    deps.calls.filter(call => call[0] === 'log').map(call => call[1]).join('\n'),
    /Restart affected native agent sessions.*hot reload was not performed/,
  );
});

test('stack force never broadens into a related skill projection force', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:video-editor', kind: 'stack', name: 'video-editor', path: '/tmp/stack-video-editor' },
        { id: 'skill:video-editor', kind: 'skill', name: 'video-editor', source: 'rudi' },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [{ id: 'skill:video-editor', kind: 'skill' }],
      };
    },
    async getManagedNativeSkillHosts() {
      return ['codex'];
    },
    async syncCodexSkills(options) {
      deps.calls.push(['syncCodexSkills', options]);
      return { results: [{ id: 'skill:video-editor', action: 'drifted' }] };
    },
  });

  await runUpdate(
    ['stack:video-editor'],
    { force: true, 'with-related-skills': true },
    deps,
  );

  assert.equal(deps.calls.find(call => call[0] === 'syncCodexSkills')[1].force, false);
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
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist', source: 'rudi' },
        { id: 'skill:horizontal-engineering-review', kind: 'skill', name: 'horizontal-engineering-review', source: 'rudi' },
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

test('runUpdate skips external native skills that are not installed in RUDI', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        {
          id: 'skill:external-companion',
          kind: 'skill',
          name: 'external-companion',
          source: 'claude',
        },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:external-companion', kind: 'skill', isOperator: false },
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
    ['stack:swe-engineering'],
  );
  assert.deepEqual(result.relatedSkills.notInstalled, ['skill:external-companion']);
  assert.deepEqual(result.skippedPackages, [{
    id: 'skill:external-companion',
    error: 'Related skill is not installed',
  }]);
});

test('runUpdate finalizes successful stack work and reports a related-skill failure', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        {
          id: 'skill:rudi-engineering-gate',
          kind: 'skill',
          name: 'rudi-engineering-gate',
          source: 'rudi',
        },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:rudi-engineering-gate', kind: 'skill', isOperator: false },
        ],
      };
    },
    async updatePackage(id, options) {
      deps.calls.push(['updatePackage', id, options]);
      if (id === 'skill:rudi-engineering-gate') {
        return { success: false, error: 'fixture related update failed' };
      }
      return { success: true, id, path: `/tmp/${id.replace(':', '-')}` };
    },
  });

  const result = await runUpdate(
    ['stack:swe-engineering'],
    { 'with-related-skills': true },
    deps,
  );

  assert.equal(result.updated, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.packages.map((pkg) => pkg.id), ['stack:swe-engineering']);
  assert.deepEqual(result.failures, [{
    id: 'skill:rudi-engineering-gate',
    error: 'fixture related update failed',
  }]);
  assert.deepEqual(result.indexedStacks, ['stack:swe-engineering']);
  assert.equal(
    deps.calls.filter((call) => call[0] === 'rebuildToolIndex').length,
    1,
  );
});

test('runUpdate aborts related suite work when the target stack update rolls back', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        {
          id: 'skill:rudi-engineering-gate',
          kind: 'skill',
          name: 'rudi-engineering-gate',
          source: 'rudi',
        },
      ];
    },
    async resolvePackage(id) {
      return {
        id,
        kind: 'stack',
        relatedSkills: [
          { id: 'skill:rudi-engineering-gate', kind: 'skill', isOperator: false },
        ],
      };
    },
    async updatePackage(id, options) {
      deps.calls.push(['updatePackage', id, options]);
      if (id === 'stack:swe-engineering') {
        return { success: false, error: 'target update failed' };
      }
      return { success: true, id, path: `/tmp/${id.replace(':', '-')}` };
    },
  });

  await assert.rejects(
    () => runUpdate(
      ['stack:swe-engineering'],
      { 'with-related-skills': true },
      deps,
    ),
    /target update failed/,
  );

  assert.deepEqual(
    deps.calls.filter((call) => call[0] === 'updatePackage').map((call) => call[1]),
    ['stack:swe-engineering'],
  );
  assert.equal(deps.calls.some((call) => call[0] === 'restoreStackUpdateSnapshot'), true);
  assert.equal(deps.calls.some((call) => call[0] === 'rebuildToolIndex'), false);
});

test('runUpdate makes requested native projection failures visible and nonzero', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [{
        id: 'skill:rudi-engineering-gate',
        kind: 'skill',
        name: 'rudi-engineering-gate',
        source: 'rudi',
      }];
    },
    async syncCodexSkills() {
      return {
        codexRoot: '/tmp/codex-skills',
        total: 1,
        results: [{
          id: 'skill:rudi-engineering-gate',
          action: 'failed',
          error: 'fixture wrapper projection failed',
        }],
      };
    },
  });

  const result = await runUpdate(
    ['skill:rudi-engineering-gate'],
    { 'sync-skills': 'codex' },
    deps,
  );

  assert.equal(result.updated, 1);
  assert.equal(result.packageFailed, 0);
  assert.equal(result.projectionFailed, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.projectionFailures, [{
    target: 'codex',
    id: 'skill:rudi-engineering-gate',
    error: 'fixture wrapper projection failed',
  }]);

  const output = [];
  const exits = [];
  await cmdUpdate([], { json: true }, {
    async runUpdate() {
      return result;
    },
    log(line) {
      output.push(line);
    },
    exit(code) {
      exits.push(code);
    },
  });

  assert.deepEqual(exits, [1]);
  assert.equal(JSON.parse(output[0]).projectionFailed, 1);
});

test('runUpdate dry-run logs requested native projection failures for human users', async () => {
  const deps = createDeps({
    async listInstalled() {
      return [{
        id: 'skill:rudi-engineering-gate',
        kind: 'skill',
        name: 'rudi-engineering-gate',
        source: 'rudi',
      }];
    },
    async syncCodexSkills() {
      return {
        codexRoot: '/tmp/codex-skills',
        total: 1,
        results: [{
          id: 'skill:rudi-engineering-gate',
          action: 'failed',
          error: 'fixture dry-run projection failed',
        }],
      };
    },
  });

  const result = await runUpdate(
    ['skill:rudi-engineering-gate'],
    { 'sync-skills': 'codex', 'dry-run': true },
    deps,
  );

  assert.equal(result.failed, 1);
  assert.match(
    deps.calls
      .filter((call) => call[0] === 'error')
      .map((call) => call[1])
      .join('\n'),
    /codex.*skill:rudi-engineering-gate.*fixture dry-run projection failed/,
  );
});

test('runUpdate dry-run returns the exact suite plan without package or index mutations', async () => {
  const deps = createDeps({
    async fetchIndex(options) {
      deps.calls.push(['fetchIndex', options]);
      return {
        schemaVersion: '2',
        packages: {
          'skill:swe-compliance-checklist': { id: 'skill:swe-compliance-checklist', name: 'SWE Checklist', version: '1.0.0', kind: 'skill', path: 'catalog/skills/swe-compliance-checklist' },
          'stack:swe-engineering': {
            id: 'stack:swe-engineering',
            kind: 'stack',
            name: 'SWE Engineering',
            version: '1.0.0',
            related: { skills: ['skill:swe-compliance-checklist'] },
          },
        },
      };
    },
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist', source: 'rudi' },
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
  assert.equal(result.packageFailed, 0);
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
  assert.deepEqual(
    deps.calls.find((call) => call[0] === 'fetchIndex'),
    ['fetchIndex', { force: true, persist: false }],
  );
  assert.equal(deps.calls.some((call) => call[0] === 'resolvePackage'), false);
});

test('runUpdate suite dry-run projects only planned skills to explicitly selected native hosts', async () => {
  const deps = createDeps({
    async fetchIndex(options) {
      deps.calls.push(['fetchIndex', options]);
      return {
        schemaVersion: '2',
        packages: {
          'skill:swe-compliance-checklist': { id: 'skill:swe-compliance-checklist', name: 'SWE Checklist', version: '1.0.0', kind: 'skill', path: 'catalog/skills/swe-compliance-checklist' },
          'stack:swe-engineering': {
            id: 'stack:swe-engineering',
            kind: 'stack',
            name: 'SWE Engineering',
            version: '1.0.0',
            related: { skills: ['skill:swe-compliance-checklist'] },
          },
        },
      };
    },
    async listInstalled() {
      return [
        { id: 'stack:swe-engineering', kind: 'stack', name: 'swe-engineering', path: '/tmp/stack-swe-engineering' },
        { id: 'skill:swe-compliance-checklist', kind: 'skill', name: 'swe-compliance-checklist', source: 'rudi' },
        { id: 'skill:unrelated', kind: 'skill', name: 'unrelated', source: 'rudi' },
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
  assert.equal(syncCall[1].force, false);
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
