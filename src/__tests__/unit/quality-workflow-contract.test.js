import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

test('GitHub quality workflow blocks unverified changes', () => {
  const workflow = read('.github/workflows/quality.yml');

  assert.match(workflow, /^name: Quality$/m);
  assert.match(workflow, /^\s{2}pull_request:$/m);
  assert.match(workflow, /^\s{2}push:$/m);
  assert.match(workflow, /^\s{2}contents: read$/m);
  assert.match(workflow, /^\s{4}name: quality$/m);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  assert.match(workflow, /pnpm test/);
  assert.match(workflow, /pnpm build/);
  assert.match(workflow, /node scripts\/agent-debt-runner\.mjs --changed-since/);
  assert.match(workflow, /npm pack --dry-run/);
});

test('debt scan is portable outside the developer workstation', () => {
  const runner = read('scripts/agent-debt-runner.mjs');
  const scannerPath = path.join(REPO_ROOT, 'scripts/agent-debt-scan.cjs');

  assert.equal(fs.existsSync(scannerPath), true, 'repository-owned scanner must exist');
  assert.doesNotMatch(runner, /\/Users\/hoff\/dev\/dev-help/);
  assert.match(runner, /agent-debt-scan\.cjs/);
});
