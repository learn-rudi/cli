import assert from 'node:assert/strict';
import test from 'node:test';

import { formatPackageLifecycleLines } from '../../commands/package-lifecycle.js';

test('package lifecycle formatter exposes maturity, support, and deprecation guidance', () => {
  assert.deepEqual(formatPackageLifecycleLines({
    id: 'stack:demo',
    lifecycle: {
      maturity: 'stable',
      support: 'maintenance',
      deprecation: {
        announcedAt: '2026-08-02',
        message: 'Use the replacement for new installs.',
        replacementId: 'stack:replacement',
        removalAfter: '2026-11-01',
      },
    },
  }), [
    'Lifecycle: stable · maintenance',
    'Deprecated since 2026-08-02: Use the replacement for new installs.',
    'Replacement: stack:replacement',
    'Removal after: 2026-11-01',
  ]);
});

test('package lifecycle formatter treats omitted metadata as unclassified', () => {
  assert.deepEqual(formatPackageLifecycleLines({ id: 'stack:demo' }), []);
});
