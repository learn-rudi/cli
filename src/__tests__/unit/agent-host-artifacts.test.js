import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  appendLaunchEvent,
  assertOwnedLaunchDirectory,
  createLaunchOwnershipMarker,
  getLaunchArtifactFiles,
  readLaunchEvents,
} from '../../agent-host/artifacts.js';

const tempRoots = [];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-artifacts-'));
  tempRoots.push(root);
  const launchDirectory = path.join(root, 'launch_artifact_test');
  fs.mkdirSync(launchDirectory, { recursive: true });
  return { launchDirectory, root };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    fs.rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('Agent Host artifacts', () => {
  test('marks and verifies an exact launch-owned directory', () => {
    const { launchDirectory } = fixture();
    createLaunchOwnershipMarker({ launchDirectory, launchId: 'launch_artifact_test' });

    assert.equal(
      assertOwnedLaunchDirectory({ launchDirectory, launchId: 'launch_artifact_test' }),
      path.resolve(launchDirectory),
    );
    assert.throws(
      () => assertOwnedLaunchDirectory({ launchDirectory, launchId: 'launch_other' }),
      /ownership marker does not match/,
    );
  });

  test('appends JSONL events and reads them in bounded byte pages', () => {
    const { launchDirectory } = fixture();
    createLaunchOwnershipMarker({ launchDirectory, launchId: 'launch_artifact_test' });
    const files = getLaunchArtifactFiles(launchDirectory);

    appendLaunchEvent(files.events, { event: { type: 'system' }, type: 'agent.event' });
    appendLaunchEvent(files.events, { launch: { status: 'completed' }, type: 'launch.completed' });

    const first = readLaunchEvents({ eventFile: files.events, limitBytes: 32, offset: 0 });
    const second = readLaunchEvents({ eventFile: files.events, limitBytes: 4096, offset: first.nextOffset });

    assert.equal(first.nextOffset > 0, true);
    assert.equal(second.nextOffset > first.nextOffset, true);
    assert.equal(`${first.data}${second.data}`.split('\n').filter(Boolean).length, 2);
    assert.equal(second.eof, true);
  });

  test('never splits a JSONL event or a multibyte character across reconnect pages', () => {
    const { launchDirectory } = fixture();
    createLaunchOwnershipMarker({ launchDirectory, launchId: 'launch_artifact_test' });
    const files = getLaunchArtifactFiles(launchDirectory);
    appendLaunchEvent(files.events, { event: { message: 'safe ☃ text' }, type: 'agent.event' });
    appendLaunchEvent(files.events, { type: 'launch.completed' });

    const first = readLaunchEvents({ eventFile: files.events, limitBytes: 8, offset: 0 });
    const second = readLaunchEvents({ eventFile: files.events, limitBytes: 8, offset: first.nextOffset });

    assert.doesNotMatch(first.data, /�/);
    assert.doesNotMatch(second.data, /�/);
    assert.doesNotThrow(() => JSON.parse(first.data.trim()));
    assert.doesNotThrow(() => JSON.parse(second.data.trim()));
  });
});
