import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dispatchDetachedThroughService,
  dispatchGroupThroughService,
  stopDetachedThroughService,
  stopGroupThroughService,
} from '../../commands/agent-host-service.js';

function createDependencies(responses) {
  const requests = [];
  let starts = 0;
  return {
    dependencies: {
      async daemonRequestImpl(request) {
        requests.push(request);
        return responses.shift();
      },
      readDaemonInfoImpl: () => ({ port: 4567, token: 'local-token' }),
      startDaemonImpl: async () => { starts += 1; },
    },
    get starts() { return starts; },
    requests,
  };
}

test('Agent Host service client starts the daemon and maps lifecycle requests to v1 routes', async () => {
  const harness = createDependencies([
    { launch: { launchId: 'launch-new' } },
    { launch: { launchId: 'launch-resume' } },
    { launch: { launchId: 'launch-new', status: 'stopped' } },
    { group: { groupId: 'group-new' } },
    { group: { groupId: 'group-new', status: 'stopped' } },
  ]);

  await dispatchDetachedThroughService({
    launchId: 'launch-new',
    operation: 'launch',
    options: { prompt: 'launch prompt', provider: 'codex' },
  }, harness.dependencies);
  await dispatchDetachedThroughService({
    launchId: 'launch-resume',
    operation: 'resume',
    options: { launchId: 'launch-parent', prompt: 'resume prompt' },
  }, harness.dependencies);
  await stopDetachedThroughService('launch-new', harness.dependencies);
  await dispatchGroupThroughService({ groupId: 'group-new', tasks: [] }, harness.dependencies);
  await stopGroupThroughService('group-new', harness.dependencies);

  assert.equal(harness.starts, 5);
  assert.deepEqual(harness.requests.map(request => [request.method, request.pathname]), [
    ['POST', '/agent-host/v1/launches'],
    ['POST', '/agent-host/v1/launches/launch-parent/resume'],
    ['POST', '/agent-host/v1/launches/launch-new/stop'],
    ['POST', '/agent-host/v1/groups'],
    ['POST', '/agent-host/v1/groups/group-new/stop'],
  ]);
  assert.equal(harness.requests[0].body.launchId, 'launch-new');
  assert.equal(harness.requests[1].body.launchId, 'launch-resume');
  assert.equal(harness.requests[0].port, 4567);
  assert.equal(harness.requests[0].token, 'local-token');
});
