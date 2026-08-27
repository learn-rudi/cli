import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function runCli(args) {
  return spawnSync(process.execPath, ['src/index.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('default help visibly separates core, advanced, internal, and retired commands', () => {
  const result = runCli(['help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /CORE COMMANDS/);
  assert.match(result.stdout, /ADVANCED COMMANDS/);
  assert.match(result.stdout, /INTERNAL COMMANDS/);
  assert.match(result.stdout, /RETIRED LEGACY COMMANDS/);
});

test('retired execution and session commands are notices rather than dispatch targets', () => {
  for (const command of [
    'apply',
    'db',
    'import',
    'logs',
    'parallel',
    'project',
    'run-group',
    'session',
  ]) {
    const result = runCli([command]);
    assert.equal(result.status, 1, `${command}: ${result.stderr || result.stdout}`);
    assert.match(result.stderr, new RegExp(`Retired command: ${command}`));
    assert.doesNotMatch(result.stderr, /Cannot find module|ERR_MODULE_NOT_FOUND/);
  }
});

test('retired command help is a migration notice without legacy usage instructions', () => {
  const result = runCli(['help', 'parallel']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /RETIRED LEGACY COMMAND/);
  assert.match(result.stdout, /rudi agent group/);
  assert.doesNotMatch(result.stdout, /rudi parallel "<task1>"/);
});

test('update --help routes to truthful command-specific safety and suite options', () => {
  const result = runCli(['update', '--help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /rudi update - Update installed packages/);
  assert.match(result.stdout, /--all/);
  assert.match(result.stdout, /--with-related-skills/);
  assert.match(result.stdout, /--sync-skills/);
  assert.match(result.stdout, /--dry-run/);
  assert.match(result.stdout, /--json/);
  assert.doesNotMatch(result.stdout, /CORE COMMANDS/);
});

test('install --help documents related-skill controls without advertising unsupported JSON', () => {
  const result = runCli(['install', '--help']);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /--with-related-skills/);
  assert.match(result.stdout, /--no-related-skills/);
  const options = result.stdout.match(/OPTIONS([\s\S]*?)(?:OUTPUT|EXAMPLES)/)?.[1] || '';
  assert.doesNotMatch(options, /--json/);
});

test('guarded skills failures emit one structured JSON error document', () => {
  const result = runCli(['skills', 'sync', 'codex', '--all=false', '--force', '--dry-run', '--json']);

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.doesNotMatch(result.stderr, /^Error:/m);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.success, false);
  assert.match(payload.error, /--all/);
});
