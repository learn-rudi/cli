import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const installerUrl = new URL('../../installer.js', import.meta.url);

test('failed legacy Agent Host npm removal preserves metadata for retry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-remove-'));
  const rudiHome = path.join(root, 'rudi');
  const agentPath = path.join(rudiHome, 'agents', 'codex');
  const npmPath = path.join(rudiHome, 'runtimes', 'node', 'bin', 'npm');
  fs.mkdirSync(agentPath, { recursive: true });
  fs.mkdirSync(path.dirname(npmPath), { recursive: true });
  fs.writeFileSync(path.join(agentPath, 'manifest.json'), JSON.stringify({
    bins: ['codex'],
    id: 'agent:codex',
    npmPackage: '@openai/codex',
  }));
  fs.writeFileSync(npmPath, '#!/bin/sh\nexit 42\n', { mode: 0o755 });

  try {
    const script = `
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { uninstallPackage } = await import(process.argv[1]);
      const result = await uninstallPackage('agent:codex');
      console.log(JSON.stringify({
        result,
        metadataPreserved: fs.existsSync(path.join(process.env.RUDI_HOME, 'agents/codex/manifest.json'))
      }));
    `;
    const child = spawnSync(process.execPath, [
      '--input-type=module',
      '--eval',
      script,
      fileURLToPath(installerUrl),
    ], {
      encoding: 'utf8',
      env: { ...process.env, RUDI_HOME: rudiHome },
    });
    assert.equal(child.status, 0, child.stderr);
    const observed = JSON.parse(child.stdout.trim().split('\n').at(-1));
    assert.equal(observed.result.success, false);
    assert.equal(observed.metadataPreserved, true);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});
