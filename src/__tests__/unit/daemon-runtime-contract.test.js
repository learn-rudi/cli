import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createDaemonHttpContext } from '../../daemon/http/context.js';
import {
  createMockReq,
  createMockRes,
  parseResBody,
} from '../helpers/serve-mocks.js';
import { buildHttpAuthMiddleware } from '../../daemon/runtime/auth.js';
import {
  parseRequestedPort,
  printStartupBanner,
  removeConnectionFiles,
  writeConnectionFiles,
} from '../../daemon/runtime/bootstrap.js';
import { createGracefulShutdown } from '../../daemon/runtime/shutdown.js';

function attachedResponse(ctx, req) {
  const res = createMockRes();
  ctx.attachRequestContext(res, ctx.createRequestContext(req));
  return res;
}

describe('daemon runtime auth middleware', () => {
  test('OPTIONS preflight skips auth and preserves request correlation', () => {
    const ctx = createDaemonHttpContext();
    const middleware = buildHttpAuthMiddleware(ctx);
    const { req } = createMockReq('OPTIONS', '/agent-host/v1/hosts');
    const res = attachedResponse(ctx, req);

    assert.equal(middleware.handleCorsPreflight(req, res, res._rudiRequestContext), true);
    assert.equal(res.state.statusCode, 204);
    assert.equal(res.state.headers['Access-Control-Allow-Origin'], '*');
    assert.equal(res.state.headers['x-rudi-request-id'], res._rudiRequestContext.requestId);
    assert.deepEqual(res._rudiRequestContext.auth, { required: false, result: 'skipped' });
  });

  test('requireAuth accepts the local token and rejects missing or query tokens', () => {
    const ctx = createDaemonHttpContext();
    ctx.setToken('secret-token');
    const middleware = buildHttpAuthMiddleware(ctx);

    const accepted = createMockReq('GET', '/agent-host/v1/hosts', {
      headers: { 'x-rudi-token': 'secret-token' },
    });
    const acceptedRes = attachedResponse(ctx, accepted.req);
    assert.equal(middleware.requireAuth(accepted.req, acceptedRes, accepted.url), true);

    for (const target of ['/env', '/env?token=secret-token']) {
      const rejected = createMockReq('GET', target);
      const rejectedRes = attachedResponse(ctx, rejected.req);
      assert.equal(middleware.requireAuth(rejected.req, rejectedRes, rejected.url), false);
      assert.equal(rejectedRes.state.statusCode, 401);
      assert.equal(parseResBody(rejectedRes).code, 'UNAUTHORIZED');
    }
  });
});

describe('daemon runtime bootstrap helpers', () => {
  test('parseRequestedPort returns requested port or dynamic fallback', () => {
    assert.equal(parseRequestedPort({ port: '8100' }), 8100);
    assert.equal(parseRequestedPort({ port: 'not-a-port' }), 0);
    assert.equal(parseRequestedPort({}), 0);
  });

  test('connection files are user-only and removable', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-connection-'));
    const portFile = path.join(tmp, 'daemon.port');
    const tokenFile = path.join(tmp, 'daemon.token');

    writeConnectionFiles({ port: 8123, token: 'token-value', portFile, tokenFile });
    assert.equal(fs.readFileSync(portFile, 'utf8'), '8123');
    assert.equal(fs.readFileSync(tokenFile, 'utf8'), 'token-value');
    assert.equal(fs.statSync(portFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(tokenFile).mode & 0o777, 0o600);

    removeConnectionFiles({ portFile, tokenFile });
    assert.equal(fs.existsSync(portFile), false);
    assert.equal(fs.existsSync(tokenFile), false);
  });

  test('startup banner identifies the daemon without printing token material', () => {
    const lines = [];
    printStartupBanner({ port: 8123, writeLine: line => lines.push(line) });

    assert.ok(lines.some(line => line.includes('RUDI Local Daemon')));
    assert.ok(lines.some(line => line.includes('Port:  8123')));
    assert.equal(lines.some(line => line.includes('Token:')), false);
  });
});

describe('daemon graceful shutdown', () => {
  test('shutdown closes HTTP, cleans daemon-owned resources, then exits', async () => {
    let serverClosed = false;
    let cleaned = false;
    const exitCodes = [];
    const shutdown = createGracefulShutdown({
      server: { close(callback) { serverClosed = true; callback(); } },
      cleanupResources: () => { cleaned = true; },
      exit: code => exitCodes.push(code),
      log: () => {},
    });

    await shutdown.shutdown(0, 'test');

    assert.equal(serverClosed, true);
    assert.equal(cleaned, true);
    assert.deepEqual(exitCodes, [0]);
  });
});
