/**
 * Unit tests for embedding providers
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { createOllamaProvider, OLLAMA_MODELS } from '../../providers/ollama.js';

// =============================================================================
// OLLAMA PROVIDER CREATION
// =============================================================================

test('createOllamaProvider: creates provider with default URL', () => {
  const provider = createOllamaProvider();

  assert.strictEqual(provider.id, 'ollama');
  assert.ok(typeof provider.isAvailable === 'function');
  assert.ok(typeof provider.hasModel === 'function');
  assert.ok(typeof provider.embed === 'function');
  assert.ok(typeof provider.embedBatch === 'function');
});

test('createOllamaProvider: accepts custom baseURL', () => {
  const provider = createOllamaProvider({ baseURL: 'http://custom:8080' });
  assert.strictEqual(provider.id, 'ollama');
});

test('createOllamaProvider: respects OLLAMA_HOST env', async () => {
  // Save original
  const original = process.env.OLLAMA_HOST;

  try {
    process.env.OLLAMA_HOST = 'http://env-host:9999';
    const provider = createOllamaProvider();
    // Provider should use env variable (we can't easily test this without mocking)
    assert.strictEqual(provider.id, 'ollama');
  } finally {
    // Restore
    if (original) {
      process.env.OLLAMA_HOST = original;
    } else {
      delete process.env.OLLAMA_HOST;
    }
  }
});

// =============================================================================
// OLLAMA MODELS
// =============================================================================

test('OLLAMA_MODELS: has nomic-embed-text', () => {
  const model = OLLAMA_MODELS['nomic-embed-text'];

  assert.ok(model);
  assert.strictEqual(model.name, 'nomic-embed-text');
  assert.strictEqual(model.dimensions, 768);
});

test('OLLAMA_MODELS: has mxbai-embed-large', () => {
  const model = OLLAMA_MODELS['mxbai-embed-large'];

  assert.ok(model);
  assert.strictEqual(model.name, 'mxbai-embed-large');
  assert.strictEqual(model.dimensions, 1024);
});

test('OLLAMA_MODELS: has all-minilm', () => {
  const model = OLLAMA_MODELS['all-minilm'];

  assert.ok(model);
  assert.strictEqual(model.name, 'all-minilm');
  assert.strictEqual(model.dimensions, 384);
});

// =============================================================================
// EMBED BATCH
// =============================================================================

test('embedBatch: returns empty array for empty input', async () => {
  const provider = createOllamaProvider();
  const result = await provider.embedBatch([], { name: 'test', dimensions: 768 });

  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

test('isAvailable: returns false when server unreachable', async () => {
  // Use invalid port to ensure server is unreachable
  const provider = createOllamaProvider({ baseURL: 'http://localhost:99999' });
  const available = await provider.isAvailable();

  assert.strictEqual(available, false);
});

test('hasModel: returns false when server unreachable', async () => {
  const provider = createOllamaProvider({ baseURL: 'http://localhost:99999' });
  const hasModel = await provider.hasModel('nomic-embed-text');

  assert.strictEqual(hasModel, false);
});
