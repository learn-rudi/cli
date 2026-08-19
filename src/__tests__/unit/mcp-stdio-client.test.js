import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createMcpStdioClient } from '../../mcp-stdio-client.js';

test('MCP stdio client initializes and parses JSON tool results', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-mcp-client-'));
  const serverPath = path.join(tempDir, 'fake-router.mjs');
  fs.writeFileSync(serverPath, `
    import readline from 'node:readline';
    const lines = readline.createInterface({ input: process.stdin });
    lines.on('line', (line) => {
      const request = JSON.parse(line);
      if (request.id == null) return;
      const result = request.method === 'initialize'
        ? { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'fake', version: '1' } }
        : { content: [{ type: 'text', text: JSON.stringify({ tool: request.params.name, input: request.params.arguments }) }] };
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\\n');
    });
  `);

  const client = createMcpStdioClient({
    command: process.execPath,
    args: [serverPath],
    timeoutMs: 2_000,
  });
  try {
    assert.deepEqual(
      await client.callJsonTool('stack:google-workspace.gmail_profile', { account: 'operator@example.com' }),
      {
        tool: 'stack:google-workspace.gmail_profile',
        input: { account: 'operator@example.com' },
      },
    );
  } finally {
    await client.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('MCP stdio client closes promptly after a router spawn failure', async () => {
  const missingCommand = path.join(
    os.tmpdir(),
    `rudi-missing-router-${process.pid}-${Date.now()}`,
  );
  const client = createMcpStdioClient({
    command: missingCommand,
    timeoutMs: 200,
  });

  await assert.rejects(
    client.callJsonTool('stack:example.status', {}),
    /Unable to start MCP router/,
  );

  let timerId;
  const deadline = new Promise((resolve) => {
    timerId = setTimeout(resolve, 1_500, 'timeout');
  });
  const outcome = await Promise.race([
    client.close().then(() => 'closed'),
    deadline,
  ]);
  clearTimeout(timerId);
  assert.equal(outcome, 'closed');
});
