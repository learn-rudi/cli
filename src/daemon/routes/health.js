import { readRudiConfig } from '@learnrudi/core';

import {
  getDaemonStatus,
  getHealth,
  getReadiness,
} from '../operations/health.js';
import {
  getToolIndexStatus,
} from '../operations/tool-index.js';
import { DAEMON_API_VERSION } from '../version.js';

const DEFAULT_READY_CHECKS = Object.freeze({
  routes: true,
});

export function createHealthResponse(options = {}) {
  return getHealth({
    version: options.version || DAEMON_API_VERSION,
  });
}

function getDefaultToolIndexStatus(deps) {
  try {
    const status = deps.getToolIndexStatus({ validate: false });
    return {
      status: 'ready',
      ready: true,
      stackCount: status.stackCount,
      toolCount: status.toolCount,
      failureCount: status.failures.length,
      updatedAt: status.updatedAt,
    };
  } catch (error) {
    return {
      status: 'degraded',
      ready: true,
      error: error.message,
    };
  }
}

function getPackageCounts(deps) {
  try {
    const config = deps.readRudiConfig() || {};
    return {
      stack: Object.values(config.stacks || {}).filter(stack => stack?.installed !== false).length,
    };
  } catch {
    return {};
  }
}

function buildStatusPayload(deps, options) {
  return getDaemonStatus({
    version: options.version || DAEMON_API_VERSION,
    port: deps.getPort(),
    startedAtMs: options.startedAtMs,
    nowMs: deps.nowMs(),
    startedAt: options.startedAt,
    toolIndexStatus: deps.getToolIndexStatusForRoute(),
    packageCounts: deps.getPackageCounts(),
  });
}

export function buildDaemonHealthRoutes(ctx, options = {}) {
  const { json, updateRequestAuth } = ctx;
  const deps = {
    getToolIndexStatus,
    readRudiConfig,
    getPort: typeof options.getPort === 'function' ? options.getPort : () => options.port,
    nowMs: typeof options.nowMs === 'function' ? options.nowMs : () => Date.now(),
    getToolIndexStatusForRoute: typeof options.getToolIndexStatus === 'function'
      ? options.getToolIndexStatus
      : null,
    getPackageCounts: typeof options.getPackageCounts === 'function' ? options.getPackageCounts : null,
  };

  deps.getToolIndexStatusForRoute ||= () => getDefaultToolIndexStatus(deps);
  deps.getPackageCounts ||= () => getPackageCounts(deps);

  function handleHealth(req, res, url) {
    if (url.pathname !== '/health') return false;
    updateRequestAuth?.(res, { required: false, result: 'skipped' });
    json(res, createHealthResponse({ version: options.version }));
    return true;
  }

  function handleReady(req, res, url) {
    if (req.method !== 'GET' || url.pathname !== '/ready') return false;
    json(res, getReadiness({
      checks: {
        ...DEFAULT_READY_CHECKS,
        toolIndex: deps.getToolIndexStatusForRoute(),
      },
    }));
    return true;
  }

  function handleVersion(req, res, url) {
    if (req.method !== 'GET' || url.pathname !== '/version') return false;
    json(res, { version: options.version || DAEMON_API_VERSION });
    return true;
  }

  function handleStatus(req, res, url) {
    if (req.method !== 'GET' || url.pathname !== '/daemon/status') return false;
    json(res, buildStatusPayload(deps, options));
    return true;
  }

  return {
    handlePublic: handleHealth,
    handle(req, res, url) {
      return handleReady(req, res, url)
        || handleVersion(req, res, url)
        || handleStatus(req, res, url);
    },
  };
}
