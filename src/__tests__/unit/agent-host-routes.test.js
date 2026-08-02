import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { buildAgentHostRoutes } from '../../daemon/routes/agent-host.js';
import {
  createMockCtx,
  createMockReq,
  createMockRes,
  parseResBody,
} from '../helpers/serve-mocks.js';

function createStore(records = new Map(), groups = new Map()) {
  return {
    close() {},
    get(id) { return records.get(id) || null; },
    getGroup(id) { return groups.get(id) || null; },
    list() { return [...records.values()]; },
    listGroups() { return [...groups.values()]; },
  };
}

describe('Agent Host daemon routes', () => {
  test('dispatches an idempotent detached launch without echoing its prompt', async () => {
    const ctx = createMockCtx();
    const calls = [];
    const records = new Map();
    const routes = buildAgentHostRoutes(ctx, {
      dispatchImpl: async request => {
        calls.push(request);
        const launch = {
          launchId: request.launchId,
          provider: 'codex',
          status: 'running',
        };
        records.set(request.launchId, launch);
        return launch;
      },
      storeFactory: () => createStore(records),
    });
    const body = {
      launchId: 'launch_route_test',
      originDirectory: '/tmp/project',
      prompt: 'do not echo this',
      provider: 'codex',
      workspaceMode: 'read-only',
    };
    const first = createMockReq('POST', '/agent-host/v1/launches', { body });
    const firstRes = createMockRes();
    assert.equal(await routes.handle(first.req, firstRes, first.url), true);
    assert.equal(parseResBody(firstRes).launch.launchId, 'launch_route_test');
    assert.equal(JSON.stringify(parseResBody(firstRes)).includes('do not echo this'), false);

    const replay = createMockReq('POST', '/agent-host/v1/launches', { body });
    const replayRes = createMockRes();
    await routes.handle(replay.req, replayRes, replay.url);
    assert.equal(parseResBody(replayRes).replayed, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.prompt, 'do not echo this');
  });

  test('rejects undeclared launch request fields at ingress', async () => {
    const ctx = createMockCtx();
    const routes = buildAgentHostRoutes(ctx, {
      dispatchImpl: async () => { throw new Error('must not dispatch'); },
      storeFactory: () => createStore(),
    });
    const { req, url } = createMockReq('POST', '/agent-host/v1/launches', {
      body: {
        launchId: 'launch_route_invalid',
        originDirectory: '/tmp/project',
        prompt: 'hello',
        provider: 'codex',
        secretOverride: 'unexpected',
      },
    });
    const res = createMockRes();

    assert.equal(await routes.handle(req, res, url), true);
    assert.equal(res.state.statusCode, 400);
    assert.equal(parseResBody(res).code, 'INVALID_FIELD');
  });

  test('routes stop through the lifecycle core and returns the updated launch', async () => {
    const ctx = createMockCtx();
    const launch = { launchId: 'launch_route_stop', status: 'running' };
    const calls = [];
    const routes = buildAgentHostRoutes(ctx, {
      stopImpl: async (launchId) => {
        calls.push(launchId);
        return { alreadyTerminal: false, launch: { ...launch, status: 'stopped' } };
      },
      storeFactory: () => createStore(new Map([[launch.launchId, launch]])),
    });
    const { req, url } = createMockReq('POST', '/agent-host/v1/launches/launch_route_stop/stop', {
      body: {},
    });
    const res = createMockRes();

    assert.equal(await routes.handle(req, res, url), true);
    assert.deepEqual(calls, ['launch_route_stop']);
    assert.equal(parseResBody(res).launch.status, 'stopped');
  });

  test('dispatches an idempotent provider-neutral group without echoing task prompts', async () => {
    const ctx = createMockCtx();
    const calls = [];
    const groups = new Map();
    const routes = buildAgentHostRoutes(ctx, {
      groupDispatchImpl: async (request) => {
        calls.push(request);
        const group = {
          groupId: request.groupId,
          launches: request.tasks.map(task => ({
            launchId: task.launchId,
            provider: task.provider,
            status: 'running',
          })),
          status: 'running',
        };
        groups.set(request.groupId, group);
        return group;
      },
      storeFactory: () => createStore(new Map(), groups),
    });
    const body = {
      groupId: 'group_route_test',
      originDirectory: '/tmp/project',
      tasks: [
        { launchId: 'launch_route_claude', prompt: 'private one', provider: 'claude' },
        { launchId: 'launch_route_codex', prompt: 'private two', provider: 'codex' },
      ],
      workspace: '/tmp/project',
      workspaceMode: 'worktree',
    };

    const first = createMockReq('POST', '/agent-host/v1/groups', { body });
    const firstRes = createMockRes();
    assert.equal(await routes.handle(first.req, firstRes, first.url), true);
    assert.equal(parseResBody(firstRes).group.groupId, 'group_route_test');
    assert.equal(JSON.stringify(parseResBody(firstRes)).includes('private one'), false);

    const replay = createMockReq('POST', '/agent-host/v1/groups', { body });
    const replayRes = createMockRes();
    await routes.handle(replay.req, replayRes, replay.url);
    assert.equal(parseResBody(replayRes).replayed, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].tasks[0].prompt, 'private one');
  });

  test('serves current host and model capabilities from the shared provider registry', async () => {
    const ctx = createMockCtx();
    const routes = buildAgentHostRoutes(ctx, {
      inspectHostImpl: async provider => ({
        authentication: 'authenticated',
        installed: true,
        provider,
        routerConfigured: true,
        skillsSynchronized: true,
        version: '1.2.3',
      }),
      listProvidersImpl: () => ['claude', 'codex'],
      modelConfigImpl: provider => ({
        models: {
          available: [{ alias: 'fast', id: `${provider}-fast`, name: 'Fast' }],
          default: `${provider}-fast`,
        },
      }),
      resolveProviderImpl: provider => provider,
      storeFactory: () => createStore(),
    });

    const hostsRequest = createMockReq('GET', '/agent-host/v1/hosts');
    const hostsRes = createMockRes();
    assert.equal(await routes.handle(hostsRequest.req, hostsRes, hostsRequest.url), true);
    assert.deepEqual(parseResBody(hostsRes).hosts.map(host => host.provider), ['claude', 'codex']);

    const modelsRequest = createMockReq('GET', '/agent-host/v1/models/codex');
    const modelsRes = createMockRes();
    assert.equal(await routes.handle(modelsRequest.req, modelsRes, modelsRequest.url), true);
    assert.equal(parseResBody(modelsRes).default, 'codex-fast');
    assert.equal(parseResBody(modelsRes).models[0].id, 'codex-fast');
  });
});
