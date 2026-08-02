import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  daemonRequest,
  getDaemonStatus,
  readDaemonInfo,
} from '../../daemon/client.js';

test('daemon client exposes daemon-owned connection and request vocabulary', async () => {
  assert.equal(typeof daemonRequest, 'function');
  assert.equal(typeof getDaemonStatus, 'function');

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-daemon-client-'));
  try {
    assert.throws(
      () => readDaemonInfo({
        portFile: path.join(directory, 'missing-port'),
        tokenFile: path.join(directory, 'missing-token'),
      }),
      (error) => error.code === 'DAEMON_NOT_RUNNING'
        && /rudi daemon start/.test(error.message),
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
