import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const originalRudiHome = process.env.RUDI_HOME;
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-shims-core-'));
const binsDir = path.join(testHome, 'bins');
fs.mkdirSync(binsDir, { recursive: true });
process.env.RUDI_HOME = testHome;

const { validateShim } = await import('../../shims.js');

after(() => {
  fs.rmSync(testHome, { recursive: true, force: true });
  if (originalRudiHome === undefined) {
    delete process.env.RUDI_HOME;
  } else {
    process.env.RUDI_HOME = originalRudiHome;
  }
});

function writeExecutable(filePath, contents = '#!/bin/sh\nexit 0\n') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, { mode: 0o755 });
}

test('validateShim resolves an assigned wrapper target before checking it', () => {
  const target = path.join(testHome, 'tools', 'demo');
  writeExecutable(target);
  writeExecutable(path.join(binsDir, 'demo'), `#!/bin/sh
TARGET="${target}"
if [ -x "$TARGET" ]; then
  exec "$TARGET" "$@"
fi
exit 127
`);

  assert.deepEqual(validateShim('demo'), {
    valid: true,
    target,
  });
});

test('validateShim accepts a usable declared fallback when the primary target is missing', () => {
  const fallbackDir = path.join(testHome, 'system-bin');
  const fallbackTarget = path.join(fallbackDir, 'demo-fallback');
  writeExecutable(fallbackTarget);
  writeExecutable(path.join(binsDir, 'fallback-demo'), `#!/bin/sh
TARGET="${path.join(testHome, 'missing', 'demo')}"
if [ -x "$TARGET" ]; then
  exec "$TARGET" "$@"
fi
SYSTEM_BIN=$(PATH="${fallbackDir}" command -v "demo-fallback" 2>/dev/null)
if [ -n "$SYSTEM_BIN" ]; then
  exec "$SYSTEM_BIN" "$@"
fi
exit 127
`);

  assert.deepEqual(validateShim('fallback-demo'), {
    valid: true,
    target: fallbackTarget,
  });
});

test('validateShim rejects a wrapper when no declared target is executable', () => {
  const missingTarget = path.join(testHome, 'missing', 'unavailable');
  writeExecutable(path.join(binsDir, 'missing-demo'), `#!/bin/sh
TARGET="${missingTarget}"
exec "$TARGET" "$@"
`);

  assert.deepEqual(validateShim('missing-demo'), {
    valid: false,
    target: missingTarget,
    error: 'Wrapper target does not exist',
  });
});

test('validateShim rejects an executable directory as a wrapper target', () => {
  const directoryTarget = path.join(testHome, 'tools', 'not-a-command');
  fs.mkdirSync(directoryTarget, { recursive: true, mode: 0o755 });
  writeExecutable(
    path.join(binsDir, 'directory-demo'),
    `#!/bin/sh\nexec "${directoryTarget}" "$@"\n`,
  );

  assert.deepEqual(validateShim('directory-demo'), {
    valid: false,
    target: directoryTarget,
    error: 'Wrapper target does not exist',
  });
});

test('validateShim resolves an unquoted command through PATH', () => {
  const commandName = path.basename(process.execPath);
  writeExecutable(
    path.join(binsDir, 'path-demo'),
    `#!/bin/sh\nexec ${commandName} "$@"\n`,
  );

  const result = validateShim('path-demo');

  assert.equal(result.valid, true);
  assert.equal(fs.realpathSync(result.target), fs.realpathSync(process.execPath));
});
