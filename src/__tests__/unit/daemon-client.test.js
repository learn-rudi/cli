import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  daemonRequest,
  getDaemonStatus,
  readDaemonInfo,
} from '../../commands/daemon-client.js';

describe('readDaemonInfo', () => {
  test('reads port and token from explicit connection files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-daemon-info-'));
    const portFile = path.join(tmp, '.rudi-lite-port');
    const tokenFile = path.join(tmp, '.rudi-lite-token');
    fs.writeFileSync(portFile, '8123');
    fs.writeFileSync(tokenFile, 'secret-token');

    assert.deepEqual(readDaemonInfo({ portFile, tokenFile }), {
      port: 8123,
      token: 'secret-token',
      portFile,
      tokenFile,
    });
  });

  test('classifies missing, invalid port, and missing token files', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-daemon-info-'));
    const portFile = path.join(tmp, '.rudi-lite-port');
    const tokenFile = path.join(tmp, '.rudi-lite-token');

    assert.throws(
      () => readDaemonInfo({ portFile, tokenFile }),
      { code: 'DAEMON_NOT_RUNNING' },
    );

    fs.writeFileSync(portFile, 'not-a-port');
    fs.writeFileSync(tokenFile, 'secret-token');
    assert.throws(
      () => readDaemonInfo({ portFile, tokenFile }),
      { code: 'DAEMON_INVALID_PORT_FILE' },
    );

    fs.writeFileSync(portFile, '8123');
    fs.writeFileSync(tokenFile, '');
    assert.throws(
      () => readDaemonInfo({ portFile, tokenFile }),
      { code: 'DAEMON_MISSING_TOKEN_FILE' },
    );
  });
});

describe('daemonRequest', () => {
  test('sends x-rudi-token and attaches HTTP failure metadata', async () => {
    const calls = [];

    await assert.rejects(
      () => daemonRequest({
        port: 8123,
        token: 'secret-token',
        pathname: '/missing',
        fetchImpl: async (url, options) => {
          calls.push({ url, options });
          return {
            ok: false,
            status: 404,
            async text() {
              return JSON.stringify({ error: 'Not found' });
            },
          };
        },
      }),
      {
        message: 'Not found',
        statusCode: 404,
        pathname: '/missing',
      },
    );

    assert.equal(calls[0].url, 'http://127.0.0.1:8123/missing');
    assert.equal(calls[0].options.headers['x-rudi-token'], 'secret-token');
  });
});

describe('getDaemonStatus', () => {
  test('reports offline when connection files are absent', async () => {
    const status = await getDaemonStatus({
      readDaemonInfo: () => {
        const error = new Error('not running');
        error.code = 'DAEMON_NOT_RUNNING';
        throw error;
      },
    });

    assert.equal(status.running, false);
    assert.equal(status.reachable, false);
    assert.equal(status.ready, false);
    assert.equal(status.reason, 'not_running');
  });

  test('combines readiness and daemon status payloads', async () => {
    const status = await getDaemonStatus({
      readDaemonInfo: () => ({ port: 8123, token: 'secret-token' }),
      daemonRequest: async ({ pathname }) => {
        if (pathname === '/ready') {
          return {
            ready: true,
            status: 'ready',
            checks: {
              db: { status: 'ready', ready: true },
              toolIndex: { status: 'ready', ready: true },
            },
          };
        }
        return {
          version: '1.2.3',
          toolIndexStatus: { status: 'ready', ready: true, toolCount: 10 },
          dbStatus: { status: 'ready', ready: true },
          activeSessionCount: 2,
          activeJobCount: 1,
        };
      },
    });

    assert.equal(status.running, true);
    assert.equal(status.reachable, true);
    assert.equal(status.ready, true);
    assert.equal(status.reason, 'ok');
    assert.equal(status.port, 8123);
    assert.equal(status.version, '1.2.3');
    assert.equal(status.toolIndexStatus.toolCount, 10);
    assert.equal(status.activeSessionCount, 2);
    assert.equal(status.activeJobCount, 1);
  });

  test('reports stale/unreachable connection files when requests fail', async () => {
    const status = await getDaemonStatus({
      readDaemonInfo: () => ({ port: 8123, token: 'secret-token' }),
      daemonRequest: async () => {
        throw new Error('connect ECONNREFUSED');
      },
    });

    assert.equal(status.running, false);
    assert.equal(status.reachable, false);
    assert.equal(status.ready, false);
    assert.equal(status.reason, 'unreachable');
    assert.equal(status.port, 8123);
    assert.equal(status.error, 'connect ECONNREFUSED');
  });
});
