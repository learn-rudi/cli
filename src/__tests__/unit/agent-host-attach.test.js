import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  appendLaunchEvent,
  createLaunchOwnershipMarker,
  getLaunchArtifactFiles,
} from '../../agent-host/artifacts.js';
import { attachAgentLaunch } from '../../agent-host/attach.js';

describe('Agent Host attach', () => {
  test('replays normalized event artifacts and returns the terminal launch', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-attach-'));
    try {
      const launchId = 'launch_attach_test';
      const launchDirectory = path.join(root, launchId);
      fs.mkdirSync(launchDirectory, { recursive: true });
      createLaunchOwnershipMarker({ launchDirectory, launchId });
      const files = getLaunchArtifactFiles(launchDirectory);
      appendLaunchEvent(files.events, {
        event: { content: [{ text: 'attached output', type: 'text' }], type: 'assistant' },
        launchId,
        provider: 'codex',
        type: 'agent.event',
      });
      appendLaunchEvent(files.events, {
        launch: { launchId, status: 'completed' },
        type: 'launch.completed',
      });
      const launch = {
        launchId,
        outputDestination: launchDirectory,
        provider: 'codex',
        status: 'completed',
      };
      let output = '';

      const result = await attachAgentLaunch(launchId, {
        stdout: { write: chunk => { output += String(chunk); } },
        store: { get: () => launch },
      });

      assert.equal(result.status, 'completed');
      assert.match(output, /attached output/);
      assert.equal(output.includes('launch.completed'), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
