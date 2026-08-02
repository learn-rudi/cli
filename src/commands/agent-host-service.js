import { startDaemonLifecycle } from '../daemon/runtime/lifecycle.js';
import { daemonRequest, readDaemonInfo } from '../daemon/client.js';

async function requestAgentHostService(pathname, {
  body = undefined,
  method = 'GET',
} = {}, dependencies = {}) {
  const startDaemonImpl = dependencies.startDaemonImpl || startDaemonLifecycle;
  const readDaemonInfoImpl = dependencies.readDaemonInfoImpl || readDaemonInfo;
  const daemonRequestImpl = dependencies.daemonRequestImpl || daemonRequest;
  await startDaemonImpl();
  const daemon = readDaemonInfoImpl();
  return daemonRequestImpl({ ...daemon, body, method, pathname, timeoutMs: 120_000 });
}

export async function dispatchDetachedThroughService(request, dependencies = {}) {
  const pathname = request.operation === 'resume'
    ? `/agent-host/v1/launches/${encodeURIComponent(request.options.launchId)}/resume`
    : '/agent-host/v1/launches';
  const body = { ...request.options, launchId: request.launchId };
  const response = await requestAgentHostService(pathname, {
    body,
    method: 'POST',
  }, dependencies);
  return response.launch;
}

export async function stopDetachedThroughService(launchId, dependencies = {}) {
  return requestAgentHostService(
    `/agent-host/v1/launches/${encodeURIComponent(launchId)}/stop`,
    { body: {}, method: 'POST' },
    dependencies,
  );
}

export async function dispatchGroupThroughService(request, dependencies = {}) {
  const response = await requestAgentHostService('/agent-host/v1/groups', {
    body: request,
    method: 'POST',
  }, dependencies);
  return response.group;
}

export async function stopGroupThroughService(groupId, dependencies = {}) {
  return requestAgentHostService(
    `/agent-host/v1/groups/${encodeURIComponent(groupId)}/stop`,
    { body: {}, method: 'POST' },
    dependencies,
  );
}
