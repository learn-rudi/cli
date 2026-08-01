import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { PATHS } from '@learnrudi/env';
import { getInstallPathForPackage } from '../../installer.js';

test('bundled and flat skills use distinct compatible install destinations', () => {
  assert.equal(
    getInstallPathForPackage({
      id: 'skill:bundle-path-contract',
      kind: 'skill',
      path: 'catalog/skills/bundle-path-contract',
    }),
    path.join(PATHS.skills, 'bundle-path-contract')
  );

  assert.equal(
    getInstallPathForPackage({
      id: 'skill:flat-path-contract',
      kind: 'skill',
      path: 'catalog/skills/flat-path-contract.md',
    }),
    path.join(PATHS.skills, 'flat-path-contract.md')
  );
});
