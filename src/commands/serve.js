/**
 * Internal daemon process entrypoint.
 *
 * The daemon exposes local capabilities and a thin Agent Host control plane.
 * Native agent providers own normal execution and authoritative transcripts.
 */

import http from 'node:http';
import { URL } from 'node:url';

import { createDaemonHttpContext } from '../daemon/http/context.js';
import {
  buildAgentHostRoutes,
  buildDaemonHealthRoutes,
  buildEnvRoutes,
  buildLocalLlmRoutes,
  buildPackageRoutes,
} from '../daemon/routes/index.js';
import { buildHttpAuthMiddleware } from '../daemon/runtime/auth.js';
import {
  parseRequestedPort,
  printStartupBanner,
  removeConnectionFiles,
  startDaemonHttpServer,
  writeConnectionFiles,
} from '../daemon/runtime/bootstrap.js';
import { createGracefulShutdown } from '../daemon/runtime/shutdown.js';

export async function cmdServe(_args, flags = {}) {
  const startedAtMs = Date.now();
  const ctx = createDaemonHttpContext();
  const {
    attachRequestContext,
    createRequestContext,
    error,
    generateToken,
    log,
    setToken,
  } = ctx;
  const auth = buildHttpAuthMiddleware(ctx);
  const token = generateToken();
  setToken(token);

  let daemonPort = 0;
  const healthRoutes = buildDaemonHealthRoutes(ctx, {
    getPort: () => daemonPort,
    startedAtMs,
  });
  const routes = [
    healthRoutes,
    buildEnvRoutes(ctx),
    buildLocalLlmRoutes(ctx),
    buildPackageRoutes(ctx),
    buildAgentHostRoutes(ctx),
  ];

  const server = http.createServer(async (req, res) => {
    const requestContext = createRequestContext(req);
    attachRequestContext(res, requestContext);
    if (auth.handleCorsPreflight(req, res, requestContext)) return;

    const url = new URL(req.url || '/', 'http://localhost');
    const startedAt = Date.now();
    try {
      if (healthRoutes.handlePublic(req, res, url)) return;
      if (!auth.requireAuth(req, res, url)) return;

      for (const route of routes) {
        if (await route.handle(req, res, url)) return;
      }

      error(res, 'Not found', 404);
    } catch (caught) {
      const status = Number.isInteger(caught.statusCode) ? caught.statusCode : 500;
      log('http', status >= 500 ? 'error' : 'warn', caught.message, {
        method: req.method,
        path: url.pathname,
        requestId: requestContext.requestId,
        status,
      });
      error(res, status >= 500 ? 'Internal daemon error' : caught.message, status);
    } finally {
      const status = res.statusCode || requestContext.response?.status || 200;
      log('http', status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', 'request_complete', {
        auth: requestContext.auth?.result || 'unknown',
        latencyMs: Date.now() - startedAt,
        method: req.method,
        path: url.pathname,
        requestId: requestContext.requestId,
        status,
      });
    }
  });

  const packageRoutes = routes.find(route => typeof route.cleanup === 'function');
  const shutdown = createGracefulShutdown({
    server,
    log,
    cleanupResources: async () => {
      removeConnectionFiles();
      packageRoutes?.cleanup();
    },
  });
  shutdown.registerProcessHandlers({
    onUncaughtException: caught => log('daemon', 'error', caught.message),
    onUnhandledRejection: caught => log('daemon', 'error', String(caught)),
  });

  startDaemonHttpServer(server, {
    port: parseRequestedPort(flags),
    onListening(actualPort) {
      daemonPort = actualPort;
      writeConnectionFiles({ port: actualPort, token });
      printStartupBanner({ port: actualPort });
    },
  });
}
