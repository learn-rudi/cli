import assert from 'node:assert/strict';
import test from 'node:test';

import { createRouterDispatcher } from '../../router-core.js';

function fixture(options = {}) {
  const calls = [];
  const dispatcher = createRouterDispatcher({
    protocolVersion: '2024-11-05',
    serverInfo: { name: 'test-router', version: '1.0.0' },
    toolNameStyle: options.toolNameStyle,
    async discoverStackTools() {
      return [
        {
          stackId: 'stack-one',
          tools: [
            {
              name: 'read.value',
              description: 'Read a value',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      ];
    },
    async executeStackTool(call) {
      calls.push(call);
      return { content: [{ type: 'text', text: 'ok' }] };
    },
  });
  return { dispatcher, calls };
}

test('shared dispatcher namespaces discovery and routes exact calls', async () => {
  const { dispatcher, calls } = fixture();
  assert.deepEqual(await dispatcher.listTools(), [
    {
      name: 'stack-one.read.value',
      description: '[stack-one] Read a value',
      inputSchema: { type: 'object', properties: {} },
    },
  ]);

  const result = await dispatcher.callTool('stack-one.read.value', { id: 7 });
  assert.deepEqual(result, { content: [{ type: 'text', text: 'ok' }] });
  assert.deepEqual(calls, [
    { stackId: 'stack-one', toolName: 'read.value', arguments: { id: 7 } },
  ]);
});

test('default call policy rejects undiscovered canonical tools before adapter execution', async () => {
  const { dispatcher, calls } = fixture();
  await assert.rejects(
    () => dispatcher.callTool('stack-one.not-listed', {}),
    /Unknown canonical tool name/,
  );
  assert.deepEqual(calls, []);
});

test('portable calls reject undiscovered names before adapter execution', async () => {
  const { dispatcher, calls } = fixture({ toolNameStyle: 'portable' });
  await assert.rejects(
    () => dispatcher.callTool('not-listed', {}),
    /Unknown portable tool name/,
  );
  assert.deepEqual(calls, []);
});

test('adapter-authoritative policy explicitly preserves local direct-call compatibility', async () => {
  const calls = [];
  const dispatcher = createRouterDispatcher({
    callPolicy: 'adapter-authoritative',
    async discoverStackTools() { return []; },
    async executeStackTool(call) {
      calls.push(call);
      return { ok: true };
    },
  });
  assert.deepEqual(await dispatcher.callTool('installed.hidden', { value: 1 }), { ok: true });
  assert.deepEqual(calls, [{
    stackId: 'installed',
    toolName: 'hidden',
    arguments: { value: 1 },
  }]);
});

test('portable names remain reversible and bounded', async () => {
  const { dispatcher, calls } = fixture({ toolNameStyle: 'portable' });
  const [tool] = await dispatcher.listTools();
  assert.match(tool.name, /^[a-zA-Z0-9_-]{1,54}$/);
  await dispatcher.callTool(tool.name, {});
  assert.equal(calls[0].stackId, 'stack-one');
  assert.equal(calls[0].toolName, 'read.value');
});

test('JSON-RPC handling preserves initialize, notifications, calls, and errors', async () => {
  const { dispatcher } = fixture();

  assert.deepEqual(await dispatcher.handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
  }), {
    jsonrpc: '2.0',
    id: 1,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'test-router', version: '1.0.0' },
    },
  });
  assert.equal(await dispatcher.handleRequest({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  }), null);
  assert.equal(await dispatcher.handleRequest({
    jsonrpc: '2.0',
    method: 'unknown/notification',
  }), null);

  const unknown = await dispatcher.handleRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'unknown/request',
  });
  assert.equal(unknown.error.code, -32601);

  const invalidCall = await dispatcher.handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'invalid', arguments: {} },
  });
  assert.equal(invalidCall.error.code, -32603);
  assert.match(invalidCall.error.message, /expected: stack\.tool_name/);
});

test('duplicate canonical tool names fail closed', async () => {
  const dispatcher = createRouterDispatcher({
    async discoverStackTools() {
      return [
        { stackId: 'same', tools: [{ name: 'tool' }] },
        { stackId: 'same', tools: [{ name: 'tool' }] },
      ];
    },
    async executeStackTool() {},
  });

  await assert.rejects(() => dispatcher.listTools(), /Duplicate tool name/);
});
