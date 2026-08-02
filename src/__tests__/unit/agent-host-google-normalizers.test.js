import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createAgentEventNormalizer,
  extractNativeSessionId,
} from '../../agent-host/events/normalize.js';

describe('Agent Host Google event normalization', () => {
  test('normalizes Antigravity response deltas and final result', () => {
    const normalizer = createAgentEventNormalizer('antigravity');
    const deltaRaw = {
      event: 'step_update',
      step_update: {
        conversation_id: 'conversation-1',
        state: 'ACTIVE',
        step_type: 'agent_response',
        text_delta: 'RUDI_GOOGLE_HOST_OK',
      },
    };
    const resultRaw = {
      event: 'result',
      result: {
        conversation_id: 'conversation-1',
        duration_seconds: 1.5,
        num_turns: 1,
        response: 'RUDI_GOOGLE_HOST_OK\n',
        status: 'SUCCESS',
        usage: {
          cache_read_tokens: 3,
          input_tokens: 10,
          output_tokens: 2,
        },
      },
    };

    const delta = normalizer.normalize(deltaRaw)[0].normalized;
    const result = normalizer.normalize(resultRaw)[0].normalized;

    assert.deepEqual(delta, {
      content: [{ text: 'RUDI_GOOGLE_HOST_OK', type: 'text' }],
      type: 'assistant',
    });
    assert.equal(result.type, 'result');
    assert.equal(result.providerSessionId, 'conversation-1');
    assert.equal(result.result, 'RUDI_GOOGLE_HOST_OK\n');
    assert.deepEqual(result.usage, {
      cacheReadTokens: 3,
      inputTokens: 10,
      outputTokens: 2,
    });
    assert.equal(extractNativeSessionId(deltaRaw), 'conversation-1');
  });

  test('normalizes Gemini stream-json messages, tools, errors, and results', () => {
    const normalizer = createAgentEventNormalizer('gemini');
    const assistant = normalizer.normalize({
      content: 'Hello from Gemini',
      delta: true,
      role: 'assistant',
      session_id: 'gemini-session',
      type: 'message',
    })[0].normalized;
    const tool = normalizer.normalize({
      parameters: { path: 'README.md' },
      tool_id: 'tool-1',
      tool_name: 'read_file',
      type: 'tool_use',
    })[0].normalized;
    const error = normalizer.normalize({
      message: 'Authentication failed',
      severity: 'error',
      type: 'error',
    })[0].normalized;
    const result = normalizer.normalize({
      stats: { duration_ms: 1234 },
      status: 'success',
      type: 'result',
    })[0].normalized;

    assert.deepEqual(assistant, {
      content: [{ text: 'Hello from Gemini', type: 'text' }],
      type: 'assistant',
    });
    assert.deepEqual(tool.content[0], {
      id: 'tool-1',
      input: { path: 'README.md' },
      name: 'read_file',
      type: 'tool_use',
    });
    assert.deepEqual(error, { message: 'Authentication failed', type: 'error' });
    assert.equal(result.type, 'result');
    assert.equal(result.durationMs, 1234);
  });
});
