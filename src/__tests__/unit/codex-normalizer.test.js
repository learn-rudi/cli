import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { normalize } from '../../agent-host/events/providers/codex.js';

describe('codex normalizer', () => {
  test('preserves capped raw metadata for unknown provider events', () => {
    const normalized = normalize({
      type: 'future.event',
      payload: {
        type: 'future_payload',
        text: 'x'.repeat(20_000),
      },
    });

    assert.equal(normalized.type, 'system');
    assert.equal(normalized.subtype, 'unknown');
    assert.equal(normalized.providerEventType, 'future.event');
    assert.equal(normalized.providerItemType, 'future_payload');
    assert.equal(normalized.unknownReason, 'unknown_event_type');
    assert.equal(normalized.rawPayloadTruncated, true);
    assert.ok(typeof normalized.rawPayload === 'string');
    assert.ok(normalized.rawPayload.length <= 16_000);
  });
});
