import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveCliArtifactPath } from '../../commands/shims.js';

test('resolveCliArtifactPath follows a global CLI entrypoint symlink', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  const packageDist = path.join(tempRoot, 'lib', 'node_modules', '@learnrudi', 'cli', 'dist');
  const packageEntry = path.join(packageDist, 'index.cjs');
  const routerArtifact = path.join(packageDist, 'router-mcp.js');
  const globalBin = path.join(tempRoot, 'bin');
  const globalEntry = path.join(globalBin, 'rudi');

  fs.mkdirSync(packageDist, { recursive: true });
  fs.mkdirSync(globalBin, { recursive: true });
  fs.writeFileSync(packageEntry, '');
  fs.writeFileSync(routerArtifact, '');
  fs.symlinkSync(packageEntry, globalEntry);

  assert.equal(
    resolveCliArtifactPath(globalEntry, ['dist/router-mcp.js', 'src/router-mcp.js']),
    fs.realpathSync(routerArtifact),
  );
});
