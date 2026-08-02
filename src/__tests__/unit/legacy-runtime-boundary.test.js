import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('daemon entrypoint is independent of the retired execution and database runtime', () => {
  const source = read('src/commands/serve.js');

  for (const forbidden of [
    '@learnrudi/db',
    './agent/',
    './sessions/',
    'createWebSocketRuntime',
    'node-pty',
    'runStartupTasks',
  ]) {
    assert.equal(source.includes(forbidden), false, `serve.js contains ${forbidden}`);
  }
});

test('daemon route index exposes capability routes without legacy control-plane routes', () => {
  const source = read('src/daemon/routes/index.js');

  for (const required of [
    'buildAgentHostRoutes',
    'buildDaemonHealthRoutes',
    'buildEnvRoutes',
    'buildLocalLlmRoutes',
    'buildPackageRoutes',
  ]) {
    assert.equal(source.includes(required), true, `missing ${required}`);
  }

  for (const forbidden of [
    'buildAdminRoutes',
    'buildAnalyticsRoutes',
    'buildProjectRoutes',
    'buildTerminalRoutes',
    'commands/serve/routes',
  ]) {
    assert.equal(source.includes(forbidden), false, `route index contains ${forbidden}`);
  }
});

test('packaging excludes retired spawn MCP and run-group templates', () => {
  const packageJson = JSON.parse(read('package.json'));
  const serialized = JSON.stringify({ files: packageJson.files, build: packageJson.scripts.build });

  assert.equal(serialized.includes('spawn-mcp'), false);
  assert.equal(serialized.includes('run-groups'), false);
});
