/**
 * Unit tests for provider auto-detection
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { getProvider } from '../../providers/index.js';

// =============================================================================
// PROVIDER SELECTION
// =============================================================================

test('getProvider: ollama returns ollama provider', async () => {
  const result = await getProvider('ollama');

  assert.strictEqual(result.provider.id, 'ollama');
  assert.strictEqual(result.model.name, 'nomic-embed-text');
  assert.strictEqual(result.model.dimensions, 768);
});

test('getProvider: openai throws without API key', async () => {
  // Save original
  const original = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;

    await assert.rejects(
      () => getProvider('openai'),
      /OPENAI_API_KEY required/
    );
  } finally {
    if (original) {
      process.env.OPENAI_API_KEY = original;
    }
  }
});

test('getProvider: unknown provider throws', async () => {
  await assert.rejects(
    () => getProvider('unknown'),
    /Unknown provider: unknown/
  );
});

test('getProvider: auto falls back correctly', async () => {
  // This test depends on whether Ollama is running
  // If neither available, should throw helpful error

  // Save original
  const original = process.env.OPENAI_API_KEY;

  try {
    delete process.env.OPENAI_API_KEY;

    try {
      const result = await getProvider('auto');
      // If we get here, Ollama must be running
      assert.strictEqual(result.provider.id, 'ollama');
    } catch (error) {
      // No provider available - expected if Ollama not running
      assert.ok(error.message.includes('No embedding provider available'));
      assert.ok(error.message.includes('Install Ollama'));
      assert.ok(error.message.includes('OPENAI_API_KEY'));
    }
  } finally {
    if (original) {
      process.env.OPENAI_API_KEY = original;
    }
  }
});

// =============================================================================
// MODEL DIMENSIONS
// =============================================================================

test('getProvider: ollama returns 768 dimensions', async () => {
  const result = await getProvider('ollama');
  assert.strictEqual(result.model.dimensions, 768);
});

test('getProvider: openai returns 1536 dimensions', async () => {
  // Only test if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.log('Skipping: OPENAI_API_KEY not set');
    return;
  }

  const result = await getProvider('openai');
  assert.strictEqual(result.model.dimensions, 1536);
});
