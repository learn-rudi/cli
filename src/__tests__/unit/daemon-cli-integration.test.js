import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDaemonDoctorState,
  shouldReportDaemonIssue,
} from '../../commands/doctor.js';
import {
  formatAgentStatusDetails,
  getDaemonOnlyStatus,
  getFullStatus,
} from '../../commands/status.js';

describe('daemon status CLI integration', () => {
  test('getFullStatus includes daemon readiness in JSON status shape', async () => {
    const daemon = {
      running: true,
      reachable: true,
      healthy: true,
      ready: true,
      reason: 'ok',
      port: 8123,
      version: '1.2.3',
    };

    const inspectedProviders = [];
    const status = await getFullStatus({
      daemonStatusProvider: async () => daemon,
      agentHostInspector: async (provider) => {
        inspectedProviders.push(provider);
        return {
          authenticated: provider !== 'claude',
          binaryPath: `/Users/example/.local/bin/${provider === 'antigravity' ? 'agy' : provider}`,
          installed: true,
          provider,
          version: `${provider} 1.0.0`,
        };
      },
    });

    assert.equal(status.daemon, daemon);
    assert.equal(status.summary.daemonRunning, true);
    assert.equal(status.summary.daemonReady, true);
    assert.deepEqual(inspectedProviders, ['claude', 'codex', 'gemini', 'antigravity']);
    assert.deepEqual(status.agents.map(agent => agent.source), [
      'external',
      'external',
      'external',
      'external',
    ]);
    assert.equal(status.agents[0].ready, false);
    assert.equal(status.agents[1].path, '/Users/example/.local/bin/codex');
  });

  test('getDaemonOnlyStatus avoids unrelated system inventory work', async () => {
    const daemon = {
      running: false,
      reachable: false,
      healthy: false,
      ready: false,
      reason: 'not_running',
    };

    const status = await getDaemonOnlyStatus({
      daemonStatusProvider: async () => daemon,
    });

    assert.equal(status.daemon, daemon);
    assert.equal(status.summary.daemonRunning, false);
    assert.equal(status.summary.daemonReady, false);
    assert.equal(status.agents, undefined);
    assert.equal(status.runtimes, undefined);
    assert.equal(status.binaries, undefined);
  });

  test('human agent status distinguishes unobservable authentication from failure', () => {
    assert.equal(formatAgentStatusDetails({
      authenticated: null,
      installed: true,
      ready: true,
    }), 'Installed: yes, Auth: unknown, Ready: yes');
  });
});

describe('daemon doctor CLI integration', () => {
  test('offline daemon is informational, stale or unhealthy daemon is actionable', () => {
    const offline = { reason: 'not_running', reachable: false, ready: false };
    const stale = { reason: 'unreachable', reachable: false, ready: false };
    const degraded = { reason: 'not_ready', reachable: true, ready: false };
    const ready = { reason: 'ok', reachable: true, ready: true };

    assert.equal(formatDaemonDoctorState(offline), 'not running');
    assert.equal(formatDaemonDoctorState(stale), 'unreachable');
    assert.equal(formatDaemonDoctorState(degraded), 'not ready');
    assert.equal(formatDaemonDoctorState(ready), 'ready');

    assert.equal(shouldReportDaemonIssue(offline), false);
    assert.equal(shouldReportDaemonIssue(stale), true);
    assert.equal(shouldReportDaemonIssue(degraded), true);
    assert.equal(shouldReportDaemonIssue(ready), false);
  });
});
