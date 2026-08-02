import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const AGENT_HOST_ROOT = path.resolve(import.meta.dirname, '../../agent-host');
const SOURCE_ROOT = path.resolve(import.meta.dirname, '../..');

function listJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

test('Agent Host owns its provider adapters and never imports legacy agent execution', () => {
  const violations = listJavaScriptFiles(AGENT_HOST_ROOT).flatMap((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    return source.includes('commands/agent/')
      ? [path.relative(AGENT_HOST_ROOT, filePath)]
      : [];
  });

  assert.deepEqual(violations, []);
});

test('retired execution and session source trees contain no shipped files', () => {
  for (const relativePath of [
    'commands/agent',
    'commands/sessions',
    'commands/serve',
  ]) {
    const absolutePath = path.join(SOURCE_ROOT, relativePath);
    const files = fs.existsSync(absolutePath)
      ? fs.readdirSync(absolutePath, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
      : [];
    assert.deepEqual(files, [], relativePath);
  }

  assert.equal(fs.existsSync(path.join(SOURCE_ROOT, 'spawn-mcp.js')), false, 'spawn-mcp.js');
});
