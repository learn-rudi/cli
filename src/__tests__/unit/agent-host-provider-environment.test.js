import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  buildAgentExecutableEnvironment,
  buildProviderEnvironment,
} from '../../agent-host/providers/common.js';
import { buildGeminiProviderEnvironment } from '../../agent-host/providers/gemini.js';

describe('Agent Host provider environment', () => {
  it('removes RUDI-owned runtime paths while preserving provider and system paths', () => {
    const environment = buildAgentExecutableEnvironment(
      '/Users/example/.local/bin/gemini',
      {},
      {
        HOME: '/Users/example',
        PATH: [
          '/Users/example/.rudi/bins',
          '/Users/example/.rudi/runtimes/node/bin',
          '/opt/rudi-managed/runtimes/python/bin',
          '.',
          '..',
          'relative/bin',
          '/vendor/node/bin',
          '/usr/bin',
        ].join(path.delimiter),
        RUDI_HOME: '/opt/rudi-managed',
      },
    );

    assert.deepEqual(environment.PATH.split(path.delimiter), [
      '/Users/example/.local/bin',
      '/vendor/node/bin',
      '/usr/bin',
    ]);
  });

  it('injects only declared provider credentials from RUDI secrets', () => {
    const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-provider-env-'));
    fs.writeFileSync(path.join(rudiHome, 'secrets.json'), JSON.stringify({
      GEMINI_API_KEY: 'managed-key',
      UNRELATED_SECRET: 'must-not-leak',
    }));
    const config = {
      headless: {
        authEnvVars: ['GEMINI_API_KEY'],
        env: { CI: 'true' },
      },
    };

    const environment = buildProviderEnvironment(config, {
      baseEnvironment: {},
      rudiHome,
    });

    assert.deepEqual(environment, { CI: 'true', GEMINI_API_KEY: 'managed-key' });
    assert.equal('UNRELATED_SECRET' in environment, false);
  });

  it('prefers an explicit process credential over the stored value', () => {
    const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-provider-env-'));
    fs.writeFileSync(path.join(rudiHome, 'secrets.json'), JSON.stringify({ GEMINI_API_KEY: 'stored' }));

    const environment = buildProviderEnvironment({
      headless: { authEnvVars: ['GEMINI_API_KEY'], env: {} },
    }, {
      baseEnvironment: { GEMINI_API_KEY: 'explicit' },
      rudiHome,
    });

    assert.equal(environment.GEMINI_API_KEY, 'explicit');
  });

  it('selects API-key auth for one Gemini launch without changing user settings', () => {
    const rudiHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-provider-env-'));
    const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-agent-gemini-runtime-'));
    fs.writeFileSync(path.join(rudiHome, 'secrets.json'), JSON.stringify({
      GEMINI_API_KEY: 'managed-key',
    }));
    const config = {
      headless: { authEnvVars: ['GEMINI_API_KEY'], env: {} },
    };

    const environment = buildGeminiProviderEnvironment(config, {
      baseEnvironment: {},
      rudiHome,
      runtimeDirectory,
      systemSettingsPath: path.join(runtimeDirectory, 'missing-system-settings.json'),
    });
    const settingsPath = environment.GEMINI_CLI_SYSTEM_SETTINGS_PATH;

    assert.equal(settingsPath.startsWith(runtimeDirectory), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), {
      security: { auth: { selectedType: 'gemini-api-key' } },
    });
    assert.equal(fs.readFileSync(settingsPath, 'utf8').includes('managed-key'), false);
    assert.equal(fs.statSync(settingsPath).mode & 0o777, 0o600);
  });
});
