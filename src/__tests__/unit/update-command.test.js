import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
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

  assert.match(logOutput, /rudi skills sync codex --force/);
  assert.match(logOutput, /rudi skills sync claude --force/);
  assert.match(logOutput, /not overwritten automatically/i);
});

test('runUpdate all updates installed packages and rebuilds stack index once', async () => {
  const deps = createDeps();

  const result = await runUpdate([], {}, deps);

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
