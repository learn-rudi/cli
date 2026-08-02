import { execFileSync } from 'node:child_process';

import { assertLaunchId } from './artifacts.js';
import { createLaunchStore } from './launch-store.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'stopped']);

export function verifyDetachedWorkerProcess(launch, dependencies = {}) {
  if (!launch?.ownerPid || launch.executionKind !== 'detached') return false;
  const execFileSyncImpl = dependencies.execFileSyncImpl || execFileSync;
  try {
    const command = String(execFileSyncImpl('ps', [
      '-ww', '-p', String(launch.ownerPid), '-o', 'command=',
    ], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })).trim();
    return command.includes(`agent _worker ${launch.launchId}`);
  } catch {
    return false;
  }
}

export async function stopAgentLaunch(launchId, dependencies = {}) {
  const pollIntervalMs = dependencies.pollIntervalMs || 100;
  const timeoutMs = dependencies.timeoutMs || 10_000;
  const signalProcess = dependencies.signalProcess || process.kill.bind(process);
  const verifyWorkerImpl = dependencies.verifyWorkerImpl || verifyDetachedWorkerProcess;
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1 || pollIntervalMs > 1000) {
    throw new Error('stop pollIntervalMs must be between 1 and 1000');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new Error('stop timeoutMs must be between 1 and 60000');
  }
  const ownsStore = !dependencies.store;
  const store = dependencies.store || createLaunchStore();

  try {
    const launch = store.get(assertLaunchId(launchId));
    if (!launch) throw new Error(`Launch not found: ${launchId}`);
    if (TERMINAL_STATUSES.has(launch.status)) {
      return { alreadyTerminal: true, launch };
    }
    if (launch.executionKind !== 'detached' || !launch.ownerPid) {
      throw new Error(`Launch is not owned by a detachable RUDI worker: ${launchId}`);
    }
    if (!verifyWorkerImpl(launch, dependencies)) {
      throw new Error(`Refusing to signal an unverified worker process for ${launchId}`);
    }

    signalProcess(launch.ownerPid, 'SIGTERM');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      const current = store.get(launchId);
      if (TERMINAL_STATUSES.has(current.status)) {
        return { alreadyTerminal: false, launch: current };
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    const current = store.get(launchId);
    if (current.ownerPid && verifyWorkerImpl(current, dependencies)) {
      signalProcess(current.ownerPid, 'SIGKILL');
    }
    const final = TERMINAL_STATUSES.has(current.status)
      ? current
      : store.transition(launchId, 'stopped', {
        lastError: `Detached worker did not stop within ${timeoutMs}ms and was force-terminated`,
      });
    return { alreadyTerminal: false, forced: true, launch: final };
  } finally {
    if (ownsStore) store.close();
  }
}
