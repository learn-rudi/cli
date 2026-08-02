import fs from 'fs';
import path from 'path';
import { PATHS } from '@learnrudi/env';

export const DAEMON_PORT_FILE = path.join(PATHS.home, 'daemon.port');
export const DAEMON_TOKEN_FILE = path.join(PATHS.home, 'daemon.token');

export function readDaemonInfo(options = {}) {
  const portFile = options.portFile || DAEMON_PORT_FILE;
  const tokenFile = options.tokenFile || DAEMON_TOKEN_FILE;

  if (!fs.existsSync(portFile) || !fs.existsSync(tokenFile)) {
    const error = new Error('RUDI daemon is not running. Start it with: rudi daemon start');
    error.code = 'DAEMON_NOT_RUNNING';
    error.portFile = portFile;
    error.tokenFile = tokenFile;
    throw error;
  }

  const portRaw = fs.readFileSync(portFile, 'utf-8').trim();
  const token = fs.readFileSync(tokenFile, 'utf-8').trim();
  const port = Number.parseInt(portRaw, 10);

  if (!Number.isFinite(port) || port <= 0) {
    const error = new Error('Invalid daemon port file. Restart it with: rudi daemon restart');
    error.code = 'DAEMON_INVALID_PORT_FILE';
    error.portFile = portFile;
    throw error;
  }
  if (!token) {
    const error = new Error('Missing daemon token. Restart it with: rudi daemon restart');
    error.code = 'DAEMON_MISSING_TOKEN_FILE';
    error.tokenFile = tokenFile;
    throw error;
  }

  return { port, token, portFile, tokenFile };
}

export async function daemonRequest({
  port,
  token,
  method = 'GET',
  pathname,
  body,
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available in this Node.js runtime');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetchImpl(`http://127.0.0.1:${port}${pathname}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-rudi-token': token,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {}

  if (!response.ok) {
    const message = parsed?.message || parsed?.error || text || `HTTP ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status;
    error.responseBody = parsed;
    error.pathname = pathname;
    throw error;
  }

  return parsed || {};
}

function buildDaemonProbeResult(patch = {}) {
  return {
    running: false,
    reachable: false,
    healthy: false,
    ready: false,
    reason: 'unknown',
    error: null,
    port: null,
    version: null,
    readiness: null,
    status: null,
    toolIndexStatus: null,
    ...patch,
  };
}

export async function getDaemonStatus(options = {}) {
  const readInfo = options.readDaemonInfo || readDaemonInfo;
  const request = options.daemonRequest || daemonRequest;
  const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
    ? options.timeoutMs
    : 1500;

  let daemon;
  try {
    daemon = readInfo(options);
  } catch (error) {
    return buildDaemonProbeResult({
      reason: error.code === 'DAEMON_NOT_RUNNING' ? 'not_running' : 'invalid_connection_files',
      error: error.message,
    });
  }

  try {
    const [readiness, status] = await Promise.all([
      request({ ...daemon, pathname: '/ready', timeoutMs }),
      request({ ...daemon, pathname: '/daemon/status', timeoutMs }),
    ]);
    const ready = readiness?.ready === true;

    return buildDaemonProbeResult({
      running: true,
      reachable: true,
      healthy: ready,
      ready,
      reason: ready ? 'ok' : 'not_ready',
      port: daemon.port,
      version: status?.version || null,
      readiness,
      status,
      toolIndexStatus: status?.toolIndexStatus || readiness?.checks?.toolIndex || null,
    });
  } catch (error) {
    return buildDaemonProbeResult({
      running: false,
      reachable: false,
      healthy: false,
      ready: false,
      reason: 'unreachable',
      error: error.name === 'AbortError' ? `Timed out after ${timeoutMs}ms` : error.message,
      port: daemon.port,
    });
  }
}
