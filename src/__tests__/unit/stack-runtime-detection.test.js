import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { detectRuntime as detectAuthRuntime } from '../../commands/auth.js';
import {
  checkAuth,
  checkIfRunning,
  detectRuntime as detectWhichRuntime,
} from '../../commands/which.js';

async function withTempStack(layout, run) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'rudi-stack-'));
  try {
    await layout(dir);
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('auth runtime detection finds flat node stack auth script', async () => {
  await withTempStack(
    async (dir) => {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'auth.ts'), '');
    },
    async (dir) => {
      const result = await detectAuthRuntime(dir);

      assert.deepEqual(result, {
        runtime: 'node',
        authScript: path.join(dir, 'src', 'auth.ts'),
        useTsx: true,
      });
    },
  );
});

test('auth runtime detection still finds structured node stack auth script', async () => {
  await withTempStack(
    async (dir) => {
      await mkdir(path.join(dir, 'node', 'src'), { recursive: true });
      await writeFile(path.join(dir, 'node', 'src', 'auth.ts'), '');
    },
    async (dir) => {
      const result = await detectAuthRuntime(dir);

      assert.deepEqual(result, {
        runtime: 'node',
        authScript: path.join(dir, 'node', 'src', 'auth.ts'),
        useTsx: true,
      });
    },
  );
});

test('which runtime detection finds flat node stack entry point', async () => {
  await withTempStack(
    async (dir) => {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'index.ts'), '');
    },
    async (dir) => {
      const result = await detectWhichRuntime(dir);

      assert.deepEqual(result, {
        runtime: 'node',
        entry: 'src/index.ts',
      });
    },
  );
});

test('which runtime detection still finds structured node stack entry point', async () => {
  await withTempStack(
    async (dir) => {
      await mkdir(path.join(dir, 'node', 'dist'), { recursive: true });
      await writeFile(path.join(dir, 'node', 'dist', 'index.js'), '');
    },
    async (dir) => {
      const result = await detectWhichRuntime(dir);

      assert.deepEqual(result, {
        runtime: 'node',
        entry: 'node/dist/index.js',
      });
    },
  );
});

test('which runtime detection finds flat python stack entry point', async () => {
  await withTempStack(
    async (dir) => {
      await mkdir(path.join(dir, 'src'), { recursive: true });
      await writeFile(path.join(dir, 'src', 'index.py'), '');
    },
    async (dir) => {
      const result = await detectWhichRuntime(dir);

      assert.deepEqual(result, {
        runtime: 'python',
        entry: 'src/index.py',
      });
    },
  );
});

test('which auth status finds account tokens in RUDI stack state', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'rudi-home-'));
  await withTempStack(
    async (dir) => {
      const stackName = path.basename(dir);
      const accountDir = path.join(home, 'state', 'stacks', stackName, 'accounts', 'rudi@example.com');
      await mkdir(accountDir, { recursive: true });
      await writeFile(path.join(accountDir, 'token.json'), '{}');
    },
    async (dir) => {
      const stackName = path.basename(dir);
      const result = await checkAuth(dir, 'node', { rudiHome: home });

      assert.equal(result.configured, true);
      assert.deepEqual(result.files, [
        `state/stacks/${stackName}/accounts/rudi@example.com/token.json`,
      ]);
    },
  );
  await rm(home, { recursive: true, force: true });
});

test('which auth status finds manifest-declared credentials without reading secret values', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'rudi-home-'));
  await withTempStack(
    async () => {},
    async (dir) => {
      const calls = [];
      const result = await checkAuth(dir, 'node', {
        rudiHome: home,
        stack: {
          id: 'stack:github',
          requires: {
            secrets: [
              { name: 'GITHUB_TOKEN', required: true },
              { name: 'GITHUB_API_BASE_URL', required: false },
            ],
          },
        },
        async hasSecret(name) {
          calls.push(name);
          return name === 'GITHUB_TOKEN';
        },
      });

      assert.equal(result.configured, true);
      assert.deepEqual(result.files, ['RUDI secrets (GITHUB_TOKEN)']);
      assert.deepEqual(calls, ['GITHUB_TOKEN', 'GITHUB_API_BASE_URL']);
      assert.equal('getSecret' in result, false);
    },
  );
  await rm(home, { recursive: true, force: true });
});

test('which auth status does not create an absent RUDI secrets store', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'rudi-home-'));
  await withTempStack(
    async () => {},
    async (dir) => {
      const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
        import { existsSync } from 'node:fs';
        import { checkAuth } from './src/commands/which.js';

        const secretsPath = process.env.RUDI_HOME + '/secrets.json';
        const result = await checkAuth(${JSON.stringify(dir)}, 'node', {
          rudiHome: process.env.RUDI_HOME,
          stack: {
            id: 'stack:github',
            requires: { secrets: [{ name: 'GITHUB_TOKEN', required: true }] },
          },
        });
        console.log(JSON.stringify({ result, secretsFileExists: existsSync(secretsPath) }));
      `], {
        cwd: process.cwd(),
        env: { ...process.env, RUDI_HOME: home },
        encoding: 'utf-8',
      });
      const { result, secretsFileExists } = JSON.parse(output);

      assert.equal(result.configured, false);
      assert.equal(secretsFileExists, false);
    },
  );
  await rm(home, { recursive: true, force: true });
});

test('which auth status rejects malformed required secret metadata', async () => {
  await withTempStack(
    async () => {},
    async (dir) => {
      await assert.rejects(
        () => checkAuth(dir, 'node', {
          stack: {
            id: 'stack:malformed',
            requires: {
              secrets: [
                { name: '', required: true },
                { name: 'OPTIONAL_TOKEN', required: false },
              ],
            },
          },
          async hasSecret(name) {
            return name === 'OPTIONAL_TOKEN';
          },
        }),
        /Invalid stack secret name at index 0/,
      );
    },
  );
});

test('which auth status rejects secret names the runtime would not inject verbatim', async () => {
  await withTempStack(
    async () => {},
    async (dir) => {
      await assert.rejects(
        () => checkAuth(dir, 'node', {
          stack: {
            id: 'stack:malformed',
            requires: {
              secrets: [{ name: ' GITHUB_TOKEN ', required: true }],
            },
          },
          async hasSecret(name) {
            return name === 'GITHUB_TOKEN';
          },
        }),
        /Invalid stack secret name at index 0/,
      );
    },
  );
});

test('which auth status does not infer complete auth from one optional secret in a multi-secret contract', async () => {
  await withTempStack(
    async () => {},
    async (dir) => {
      const result = await checkAuth(dir, 'node', {
        stack: {
          id: 'stack:composite',
          requires: {
            secrets: [
              { name: 'SERVICE_ACCOUNT', required: false },
              { name: 'SERVICE_KEY', required: false },
            ],
          },
        },
        async hasSecret(name) {
          return name === 'SERVICE_ACCOUNT';
        },
      });

      assert.equal(result.configured, false);
    },
  );
});

test('which auth status accepts a present single optional secret contract', async () => {
  await withTempStack(
    async () => {},
    async (dir) => {
      const result = await checkAuth(dir, 'node', {
        stack: {
          id: 'stack:github',
          requires: {
            secrets: [{ name: 'GITHUB_TOKEN', required: false }],
          },
        },
        async hasSecret(name) {
          return name === 'GITHUB_TOKEN';
        },
      });

      assert.equal(result.configured, true);
      assert.deepEqual(result.files, ['RUDI secrets (GITHUB_TOKEN)']);
    },
  );
});

test('which auth status only lets declared populated env keys satisfy a manifest contract', async () => {
  await withTempStack(
    async (dir) => {
      await writeFile(
        path.join(dir, '.env'),
        'UNRELATED_VALUE=present\nGITHUB_TOKEN="" # intentionally unset\n',
      );
    },
    async (dir) => {
      const result = await checkAuth(dir, 'node', {
        stack: {
          id: 'stack:github',
          requires: {
            secrets: [{ name: 'GITHUB_TOKEN', required: true }],
          },
        },
        async hasSecret() {
          return false;
        },
      });

      assert.equal(result.configured, false);
      assert.deepEqual(result.files, []);
    },
  );
});

test('which auth status accepts a declared populated env key as the manifest credential', async () => {
  await withTempStack(
    async (dir) => {
      await writeFile(path.join(dir, '.env'), 'GITHUB_TOKEN=local-development-token\n');
    },
    async (dir) => {
      const result = await checkAuth(dir, 'node', {
        stack: {
          id: 'stack:github',
          requires: {
            secrets: [{ name: 'GITHUB_TOKEN', required: true }],
          },
        },
        async hasSecret() {
          return false;
        },
      });

      assert.equal(result.configured, true);
      assert.deepEqual(result.files, ['.env']);
    },
  );
});

test('which running check treats stack names as literal process filters', () => {
  const calls = [];
  const running = checkIfRunning('video-editor"; touch /tmp/rudi-probe #', {
    runCommand(command, args) {
      calls.push({ command, args });
      return [
        'hoff 101 0.0 node /Users/hoff/.rudi/stacks/video-editor/dist/index.js',
        'hoff 202 0.0 node /Users/hoff/.rudi/stacks/google-workspace/dist/index.js',
      ].join('\n');
    },
  });

  assert.equal(running, false);
  assert.deepEqual(calls, [{ command: 'ps', args: ['aux'] }]);
});
