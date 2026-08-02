import {
  assertLaunchId,
  assertOwnedLaunchDirectory,
  getLaunchArtifactFiles,
  readLaunchEvents,
} from '../../agent-host/artifacts.js';
import { dispatchDetachedAgent } from '../../agent-host/detached.js';
import {
  assertAgentGroupId,
  createLaunchStore,
} from '../../agent-host/launch-store.js';
import {
  launchDetachedAgentGroup,
  stopAgentGroup,
} from '../../agent-host/group.js';
import { inspectAgentHost } from '../../agent-host/preflight.js';
import {
  getAgentProviderConfig,
  listAgentProviders,
  resolveAgentProviderId,
} from '../../agent-host/providers/index.js';
import {
  diffAgentLaunch,
  discardAgentLaunch,
  promoteAgentLaunch,
  stopAgentLaunch,
} from '../../agent-host/lifecycle.js';
import {
  MAX_AGENT_HOST_BODY_BYTES,
  parseAgentHostIntegerQuery,
  validateAgentGroupRequest,
  validateAgentLaunchRequest,
  validateAgentResumeRequest,
} from './agent-host-validation.js';

function withStore(storeFactory, operation) {
  const store = storeFactory();
  try {
    return operation(store);
  } finally {
    store.close();
  }
}

export function buildAgentHostRoutes(ctx, dependencies = {}) {
  const { error, invalidField, json, readBody } = ctx;
  const dispatchImpl = dependencies.dispatchImpl || dispatchDetachedAgent;
  const diffImpl = dependencies.diffImpl || diffAgentLaunch;
  const discardImpl = dependencies.discardImpl || discardAgentLaunch;
  const groupDispatchImpl = dependencies.groupDispatchImpl || launchDetachedAgentGroup;
  const groupStopImpl = dependencies.groupStopImpl || stopAgentGroup;
  const inspectHostImpl = dependencies.inspectHostImpl || inspectAgentHost;
  const listProvidersImpl = dependencies.listProvidersImpl || listAgentProviders;
  const modelConfigImpl = dependencies.modelConfigImpl || getAgentProviderConfig;
  const promoteImpl = dependencies.promoteImpl || promoteAgentLaunch;
  const stopImpl = dependencies.stopImpl || stopAgentLaunch;
  const storeFactory = dependencies.storeFactory || (() => createLaunchStore());
  const resolveProviderImpl = dependencies.resolveProviderImpl || resolveAgentProviderId;
  const pendingDispatches = new Map();
  const pendingGroupDispatches = new Map();

  function respondError(res, caught, fallbackStatus = 400) {
    if (caught.field && invalidField) {
      return invalidField(res, caught.field, caught.message, { status: caught.statusCode || fallbackStatus });
    }
    return error(res, caught.message, caught.statusCode || fallbackStatus);
  }

  async function dispatchIdempotently({ launchId, operation, options }) {
    const existing = withStore(storeFactory, store => store.get(launchId));
    if (existing) return { launch: existing, replayed: true };
    if (pendingDispatches.has(launchId)) {
      return { launch: await pendingDispatches.get(launchId), replayed: true };
    }
    const pending = dispatchImpl({ launchId, operation, options });
    pendingDispatches.set(launchId, pending);
    try {
      return { launch: await pending, replayed: false };
    } finally {
      pendingDispatches.delete(launchId);
    }
  }

  async function dispatchGroupIdempotently(request) {
    const existing = withStore(storeFactory, store => store.getGroup(request.groupId));
    if (existing) return { group: existing, replayed: true };
    if (pendingGroupDispatches.has(request.groupId)) {
      return { group: await pendingGroupDispatches.get(request.groupId), replayed: true };
    }
    const pending = groupDispatchImpl(request);
    pendingGroupDispatches.set(request.groupId, pending);
    try {
      return { group: await pending, replayed: false };
    } finally {
      pendingGroupDispatches.delete(request.groupId);
    }
  }

  return {
    async handle(req, res, url) {
      if (!url.pathname.startsWith('/agent-host/v1/')) return false;

      try {
        if (req.method === 'GET' && url.pathname === '/agent-host/v1/hosts') {
          const hosts = await Promise.all(listProvidersImpl().map(async provider => ({
            ...await inspectHostImpl(provider),
            provider,
          })));
          json(res, { hosts });
          return true;
        }

        const modelsMatch = url.pathname.match(/^\/agent-host\/v1\/models\/([^/]+)$/);
        if (req.method === 'GET' && modelsMatch) {
          const provider = decodeURIComponent(modelsMatch[1]);
          const nativeProvider = resolveProviderImpl(provider);
          const config = modelConfigImpl(nativeProvider);
          json(res, {
            approvalModes: Object.keys(config.headless?.approvalModes || {}),
            capabilities: config.capabilities || {},
            default: config.models.default,
            models: config.models.available,
            name: config.name || provider,
            nativeProvider,
            permissionModes: Object.keys(config.headless?.permissionModes || {}),
            provider,
          });
          return true;
        }

        if (req.method === 'POST' && url.pathname === '/agent-host/v1/groups') {
          const body = await readBody(req, { maxBodySize: MAX_AGENT_HOST_BODY_BYTES });
          const request = validateAgentGroupRequest(body);
          const result = await dispatchGroupIdempotently(request);
          json(res, result, result.replayed ? 200 : 202);
          return true;
        }

        if (req.method === 'GET' && url.pathname === '/agent-host/v1/groups') {
          const limit = parseAgentHostIntegerQuery(url.searchParams.get('limit'), 50, {
            field: 'limit', max: 1000, min: 1,
          });
          const groups = withStore(storeFactory, store => store.listGroups({ limit }));
          json(res, { groups });
          return true;
        }

        const groupStopMatch = url.pathname.match(/^\/agent-host\/v1\/groups\/([^/]+)\/stop$/);
        if (req.method === 'POST' && groupStopMatch) {
          const groupId = assertAgentGroupId(decodeURIComponent(groupStopMatch[1]));
          await readBody(req, { maxBodySize: 1024 });
          json(res, await groupStopImpl(groupId));
          return true;
        }

        const groupMatch = url.pathname.match(/^\/agent-host\/v1\/groups\/([^/]+)$/);
        if (req.method === 'GET' && groupMatch) {
          const groupId = assertAgentGroupId(decodeURIComponent(groupMatch[1]));
          const group = withStore(storeFactory, store => store.getGroup(groupId));
          if (!group) return error(res, `Agent Host group not found: ${groupId}`, 404);
          json(res, { group });
          return true;
        }

        if (req.method === 'POST' && url.pathname === '/agent-host/v1/launches') {
          const body = await readBody(req, { maxBodySize: MAX_AGENT_HOST_BODY_BYTES });
          const launchId = assertLaunchId(body?.launchId);
          const options = validateAgentLaunchRequest(body);
          const result = await dispatchIdempotently({ launchId, operation: 'launch', options });
          json(res, result, result.replayed ? 200 : 202);
          return true;
        }

        const resumeMatch = url.pathname.match(/^\/agent-host\/v1\/launches\/([^/]+)\/resume$/);
        if (req.method === 'POST' && resumeMatch) {
          const parentLaunchId = assertLaunchId(decodeURIComponent(resumeMatch[1]));
          const body = await readBody(req, { maxBodySize: MAX_AGENT_HOST_BODY_BYTES });
          const launchId = assertLaunchId(body?.launchId);
          const options = {
            ...validateAgentResumeRequest(body),
            launchId: parentLaunchId,
          };
          const result = await dispatchIdempotently({ launchId, operation: 'resume', options });
          json(res, result, result.replayed ? 200 : 202);
          return true;
        }

        if (req.method === 'GET' && url.pathname === '/agent-host/v1/launches') {
          const limit = parseAgentHostIntegerQuery(url.searchParams.get('limit'), 50, {
            field: 'limit', max: 1000, min: 1,
          });
          const status = url.searchParams.get('status') || null;
          const launches = withStore(storeFactory, store => store.list({ limit, status }));
          json(res, { launches });
          return true;
        }

        const eventMatch = url.pathname.match(/^\/agent-host\/v1\/launches\/([^/]+)\/events$/);
        if (req.method === 'GET' && eventMatch) {
          const launchId = assertLaunchId(decodeURIComponent(eventMatch[1]));
          const launch = withStore(storeFactory, store => store.get(launchId));
          if (!launch) return error(res, `Launch not found: ${launchId}`, 404);
          assertOwnedLaunchDirectory({ launchDirectory: launch.outputDestination, launchId });
          const offset = parseAgentHostIntegerQuery(url.searchParams.get('offset'), 0, {
            field: 'offset', max: Number.MAX_SAFE_INTEGER, min: 0,
          });
          const limitBytes = parseAgentHostIntegerQuery(url.searchParams.get('limitBytes'), 1024 * 1024, {
            field: 'limitBytes', max: 10 * 1024 * 1024, min: 1,
          });
          const page = readLaunchEvents({
            eventFile: getLaunchArtifactFiles(launch.outputDestination).events,
            limitBytes,
            offset,
          });
          json(res, { ...page, launch });
          return true;
        }

        const operationMatch = url.pathname.match(
          /^\/agent-host\/v1\/launches\/([^/]+)\/(stop|diff|promote|discard)$/,
        );
        if (operationMatch) {
          const launchId = assertLaunchId(decodeURIComponent(operationMatch[1]));
          const operation = operationMatch[2];
          if (operation === 'diff' && req.method === 'GET') {
            json(res, { diff: diffImpl(launchId) });
            return true;
          }
          if (req.method !== 'POST') return false;
          await readBody(req, { maxBodySize: 1024 });
          const result = operation === 'stop'
            ? await stopImpl(launchId)
            : operation === 'promote'
              ? await promoteImpl(launchId)
              : await discardImpl(launchId);
          json(res, result);
          return true;
        }

        const launchMatch = url.pathname.match(/^\/agent-host\/v1\/launches\/([^/]+)$/);
        if (req.method === 'GET' && launchMatch) {
          const launchId = assertLaunchId(decodeURIComponent(launchMatch[1]));
          const launch = withStore(storeFactory, store => store.get(launchId));
          if (!launch) return error(res, `Launch not found: ${launchId}`, 404);
          json(res, { launch });
          return true;
        }

        return false;
      } catch (caught) {
        return respondError(res, caught, /promote|discard/.test(url.pathname) ? 409 : 400);
      }
    },
  };
}
