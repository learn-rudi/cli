import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPortableToolNameMap,
  isPortableToolName,
} from '../../router-tool-names.js';

describe('router portable MCP tool names', () => {
  it('replaces client-incompatible namespace punctuation without losing dispatch identity', () => {
    const mapping = buildPortableToolNameMap([
      'stack:swe-engineering.swe_manual_list',
      'stack:mail.send-message',
    ]);

    assert.equal(
      mapping.canonicalToPortable.get('stack:swe-engineering.swe_manual_list'),
      'stack_swe-engineering_swe_manual_list',
    );
    assert.equal(
      mapping.portableToCanonical.get('stack_swe-engineering_swe_manual_list'),
      'stack:swe-engineering.swe_manual_list',
    );
    assert.equal(isPortableToolName('stack_swe-engineering_swe_manual_list'), true);
  });

  it('keeps aliases within the client limit and hashes collisions deterministically', () => {
    const first = 'stack:very-long-provider-name.with_a_tool_name_that_is_far_too_long_for_google_clients';
    const collisionA = 'stack:a.b_c';
    const collisionB = 'stack:a_b.c';
    const mapping = buildPortableToolNameMap([first, collisionA, collisionB]);

    for (const alias of mapping.canonicalToPortable.values()) {
      assert.equal(isPortableToolName(alias), true);
      assert.ok(alias.length <= 54);
    }
    assert.notEqual(
      mapping.canonicalToPortable.get(collisionA),
      mapping.canonicalToPortable.get(collisionB),
    );
    assert.deepEqual(
      buildPortableToolNameMap([first, collisionA, collisionB]).canonicalToPortable,
      mapping.canonicalToPortable,
    );
  });
});
