import fs from 'node:fs';
import { spawn } from 'node:child_process';

import {
  appendLaunchEvent,
  assertLaunchId,
  assertOwnedLaunchDirectory,
  getLaunchArtifactFiles,
} from './artifacts.js';
import { launchAgent } from './launch.js';
import { createLaunchStore } from './launch-store.js';
import { resumeAgent } from './resume.js';

const MAX_WORKER_REQUEST_BYTES = 12 * 1024 * 1024;
const DEFAULT_START_TIMEOUT_MS = 45_000;

function validateOperation(operation) {
  if (operation !== 'launch' && operation !== 'resume') {
    throw new Error(`Unknown detached worker operation: ${operation}`);
  }
  return operation;
}

function discardSink() {
  return { write() { return true; } };
}

function appendPrivateText(file, value) {
  const handle = fs.openSync(file, 'a', 0o600);
  try {
    fs.writeFileSync(handle, String(value), 'utf8');
  } finally {
    fs.closeSync(handle);
  }
  fs.chmodSync(file, 0o600);
}

export async function dispatchDetachedAgent({ launchId, operation, options }, dependencies = {}) {
  assertLaunchId(launchId);
  validateOperation(operation);
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Detached worker options are required');
  }

  const {
    entrypoint = process.argv[1],
    nodePath = process.execPath,
    spawnImpl = spawn,
    timeoutMs = DEFAULT_START_TIMEOUT_MS,
  } = dependencies;
  if (typeof entrypoint !== 'string' || entrypoint.trim() === '') {
    throw new Error('Cannot resolve the RUDI entrypoint for detached execution');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new Error('Detached startup timeout must be between 1 and 120000ms');
  }

  const request = JSON.stringify({ operation, options });
  if (Buffer.byteLength(request, 'utf8') > MAX_WORKER_REQUEST_BYTES) {
    throw new Error(`Detached worker request exceeds ${MAX_WORKER_REQUEST_BYTES} bytes`);
  }

  return await new Promise((resolve, reject) => {
    let buffer = '';
    let settled = false;
    const child = spawnImpl(nodePath, [entrypoint, 'agent', '_worker', launchId], {
      detached: true,
      env: process.env,
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { child.kill('SIGTERM'); } catch {}
      reject(new Error(`Detached worker did not acknowledge startup within ${timeoutMs}ms`));
    }, timeoutMs);
    timer.unref?.();

    function finish(error, launch = null) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout?.destroy?.();
      child.unref?.();
      if (error) reject(error);
      else resolve(launch);
    }

    child.once('spawn', () => {
      child.stdin.end(`${request}\n`);
    });
    child.once('error', error => finish(new Error(`Unable to start detached worker: ${error.message}`)));
    child.once('exit', (code, signal) => {
      if (!settled) {
        finish(new Error(`Detached worker exited before startup acknowledgement (${code ?? signal ?? 'unknown'})`));
      }
    });
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      if (Buffer.byteLength(buffer, 'utf8') > 1024 * 1024) {
        finish(new Error('Detached worker acknowledgement exceeded 1048576 bytes'));
        return;
      }
      const newline = buffer.indexOf('\n');
      if (newline === -1) return;
      let acknowledgement;
      try {
        acknowledgement = JSON.parse(buffer.slice(0, newline));
      } catch {
        finish(new Error('Detached worker returned an invalid startup acknowledgement'));
        return;
      }
      if (acknowledgement?.ok !== true || !acknowledgement.launch) {
        finish(new Error(acknowledgement?.error || 'Detached worker failed to start'));
        return;
      }
      finish(null, acknowledgement.launch);
    });
  });
}

export async function runDetachedAgentWorker({ launchId, request }, dependencies = {}) {
  assertLaunchId(launchId);
  const operation = validateOperation(request?.operation);
  if (!request?.options || typeof request.options !== 'object' || Array.isArray(request.options)) {
    throw new Error('Detached worker options are required');
  }

  const ownsStore = !dependencies.store;
  const store = dependencies.store || createLaunchStore();
  const launchImpl = dependencies.launchImpl || launchAgent;
  const resumeImpl = dependencies.resumeImpl || resumeAgent;
  const ownerPid = dependencies.ownerPid || process.pid;
  const sendAcknowledgement = dependencies.sendAcknowledgement
    || (payload => process.stdout.write(`${JSON.stringify(payload)}\n`));
  let acknowledged = false;
  let artifactFiles = null;

  function files() {
    if (artifactFiles) return artifactFiles;
    const launch = store.get(launchId);
    if (!launch) throw new Error(`Launch not found while writing worker artifacts: ${launchId}`);
    assertOwnedLaunchDirectory({
      launchDirectory: launch.outputDestination,
      launchId,
    });
    artifactFiles = getLaunchArtifactFiles(launch.outputDestination);
    return artifactFiles;
  }

  function acknowledge(launch) {
    if (acknowledged) return;
    acknowledged = true;
    sendAcknowledgement({ launch, ok: true });
  }

  const commonDependencies = {
    eventSink: event => appendLaunchEvent(files().events, event),
    idFactory: () => launchId,
    onSpawn: acknowledge,
    ownerPid,
    stderr: { write: value => appendPrivateText(files().stderr, value) },
    stdout: discardSink(),
    store,
  };

  try {
    const options = { ...request.options, executionKind: 'detached' };
    const result = operation === 'launch'
      ? await launchImpl(options, commonDependencies)
      : await resumeImpl(options, commonDependencies);
    acknowledge(result);
    return result;
  } catch (error) {
    if (!acknowledged) sendAcknowledgement({ error: error.message, ok: false });
    throw error;
  } finally {
    if (ownsStore) store.close();
  }
}

export async function readDetachedWorkerRequest(stdin = process.stdin) {
  let body = '';
  let bytes = 0;
  for await (const chunk of stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    bytes += buffer.length;
    if (bytes > MAX_WORKER_REQUEST_BYTES) {
      throw new Error(`Detached worker request exceeds ${MAX_WORKER_REQUEST_BYTES} bytes`);
    }
    body += buffer.toString('utf8');
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Detached worker request must be valid JSON');
  }
  return parsed;
}
