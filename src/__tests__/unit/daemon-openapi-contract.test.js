import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { DAEMON_OPENAPI } from '../../contracts/daemon-openapi.js';

const requiredPaths = [
  '/health',
  '/ready',
  '/version',
  '/daemon/status',
  '/env',
  '/local-llm/status',
  '/packages/search',
  '/packages/install',
  '/agent-host/v1/hosts',
  '/agent-host/v1/models/{provider}',
  '/agent-host/v1/launches',
  '/agent-host/v1/launches/{launchId}',
  '/agent-host/v1/launches/{launchId}/events',
  '/agent-host/v1/launches/{launchId}/resume',
  '/agent-host/v1/launches/{launchId}/{operation}',
  '/agent-host/v1/groups',
  '/agent-host/v1/groups/{groupId}',
  '/agent-host/v1/groups/{groupId}/stop',
];

test('daemon OpenAPI publishes every retained Agent Host and capability route', () => {
  for (const pathname of requiredPaths) {
    assert.ok(DAEMON_OPENAPI.paths[pathname], `missing ${pathname}`);
  }
});

test('daemon OpenAPI publishes canonical Agent Host IDs and the Google alias', () => {
  const provider = DAEMON_OPENAPI.paths['/agent-host/v1/launches']
    .post.requestBody.content['application/json'].schema.properties.provider;
  assert.deepEqual(provider.enum, [
    'claude',
    'codex',
    'antigravity',
    'gemini',
    'google',
  ]);
});

test('daemon OpenAPI excludes retired execution, session, and embedded UI routes', () => {
  const forbiddenPrefixes = [
    '/admin/',
    '/agent/run-group',
    '/analytics/',
    '/fs/',
    '/notes',
    '/plans',
    '/projects',
    '/sessions',
    '/shell/',
    '/terminal/',
  ];

  for (const pathname of Object.keys(DAEMON_OPENAPI.paths)) {
    assert.equal(
      forbiddenPrefixes.some(prefix => pathname.startsWith(prefix)),
      false,
      `retired path remains: ${pathname}`,
    );
  }
});

test('generated daemon OpenAPI artifact matches the source contract', () => {
  const committed = JSON.parse(fs.readFileSync('docs/daemon/openapi.json', 'utf8'));
  assert.deepEqual(committed, DAEMON_OPENAPI);
});
