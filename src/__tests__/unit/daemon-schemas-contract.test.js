import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFailureEnvelope,
  createRequestContext,
  createSuccessEnvelope,
  createToolIndexCache,
  validateDaemonHealth,
  validateFailureEnvelope,
  validateLocalLlmRuntimeStatus,
  validatePackageStatus,
  validateRequestContext,
  validateSecretStatus,
  validateSuccessEnvelope,
  validateToolIndexCache,
} from '../../daemon/schemas/index.js';

test('retained daemon envelopes and request context remain schema-valid', () => {
  const request = createRequestContext({
    method: 'GET',
    path: '/agent-host/v1/hosts',
    requestId: 'request-1',
  });
  const success = createSuccessEnvelope({ ok: true });
  const failure = createFailureEnvelope({
    code: 'INVALID_FIELD',
    message: 'provider is invalid',
    requestId: 'request-1',
  });

  assert.equal(validateRequestContext(request).ok, true);
  assert.equal(validateSuccessEnvelope(success).ok, true);
  assert.equal(validateFailureEnvelope(failure).ok, true);
  assert.equal(validateDaemonHealth({ status: 'ok', version: '1.0.0' }).ok, true);
});

test('retained capability schemas validate package, secret, tool, and local LLM state', () => {
  const toolIndex = createToolIndexCache({ byStack: {}, updatedAt: null });
  assert.equal(validateToolIndexCache(toolIndex).ok, true);

  assert.equal(validateSecretStatus({
    configured: true,
    lastCheckedAt: '2026-08-02T12:00:00.000Z',
    name: 'API_TOKEN',
    optionalFor: [],
    requiredFor: ['stack:test'],
    source: 'secrets.json',
  }).ok, true);

  assert.equal(validatePackageStatus({
    id: 'stack:test',
    installed: true,
    kind: 'stack',
    lastIndexedAt: null,
    manifestPath: '/tmp/test/manifest.json',
    mcp: { launch: ['node', 'index.js'] },
    name: 'test',
    path: '/tmp/test',
    problems: [],
    runtime: 'node',
    secrets: [],
    toolCount: 1,
    version: '1.0.0',
  }).ok, true);

  assert.equal(validateLocalLlmRuntimeStatus({
    apiKeyPolicy: 'placeholder',
    available: true,
    baseUrl: 'http://localhost:11434/v1',
    consumer: null,
    consumerContext: 'host_process',
    error: null,
    healthUrl: 'http://localhost:11434/v1/models',
    models: ['llama3.2:3b'],
    providerFamily: 'openai_compatible',
    runtime: 'ollama',
    statusCode: 200,
    target: 'mac_host',
  }).ok, true);
});
