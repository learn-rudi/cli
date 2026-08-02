import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { normalize } from '../../agent-host/events/providers/claude.js';

describe('claude normalizer', () => {
  test('normalizes native rate-limit events with typed reset and overage metadata', () => {
    const normalized = normalize({
      type: 'rate_limit_event',
      rate_limit_info: {
        status: 'allowed',
        resetsAt: 1785684000,
        rateLimitType: 'five_hour',
        overageStatus: 'allowed',
        overageResetsAt: 1785675600,
        isUsingOverage: false,
      },
      session_id: 'provider-session-id',
    });

    assert.deepStrictEqual(normalized, {
      type: 'system',
      subtype: 'rate_limit',
      message: 'Claude rate limit status: allowed',
      rateLimit: {
        status: 'allowed',
        resetsAt: 1785684000,
        rateLimitType: 'five_hour',
        overageStatus: 'allowed',
        overageResetsAt: 1785675600,
        isUsingOverage: false,
      },
    });
  });

  test('preserves finishReason on assistant events', () => {
    const normalized = normalize({
      type: 'assistant',
      message: {
        role: 'assistant',
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'done' }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      },
    });

    assert.equal(normalized.type, 'assistant');
    assert.equal(normalized.finishReason, 'end_turn');
    assert.equal(normalized.model, 'claude-sonnet-4-5-20250929');
  });
});
