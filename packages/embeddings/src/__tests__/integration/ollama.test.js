/**
 * Integration tests for Ollama embedding provider
 * Requires Ollama to be installed and running with nomic-embed-text model
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { createOllamaProvider, OLLAMA_MODELS } from '../../providers/ollama.js';
import { cosineSimilarity } from '../../utils/vector.js';

// Check if Ollama is available
async function isOllamaAvailable() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// SERVER CONNECTIVITY
// =============================================================================

test('integration: ollama server is reachable', async () => {
  const available = await isOllamaAvailable();

  if (!available) {
    console.log('Skipping: Ollama server not running');
    console.log('Start with: ollama serve');
    return;
  }

  const provider = createOllamaProvider();
  const isAvail = await provider.isAvailable();

  assert.strictEqual(isAvail, true);
});

test('integration: list available models', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const response = await fetch('http://localhost:11434/api/tags');
  const data = await response.json();

  console.log('Available models:', data.models?.map(m => m.name).join(', '));

  assert.ok(Array.isArray(data.models));
});

// =============================================================================
// EMBEDDING GENERATION
// =============================================================================

test('integration: generate single embedding', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');

  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    console.log('Install with: ollama pull nomic-embed-text');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];
  const embedding = await provider.embed('Hello, world!', model);

  assert.ok(embedding instanceof Float32Array);
  assert.strictEqual(embedding.length, 768);

  // Check values are reasonable (not all zeros, in typical range)
  let hasNonZero = false;
  for (let i = 0; i < embedding.length; i++) {
    if (embedding[i] !== 0) hasNonZero = true;
    assert.ok(Math.abs(embedding[i]) < 10, `Value at ${i} too large: ${embedding[i]}`);
  }
  assert.ok(hasNonZero, 'Embedding should have non-zero values');
});

test('integration: generate batch embeddings', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');
  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];
  const texts = ['Hello', 'World', 'Test'];

  const embeddings = await provider.embedBatch(texts, model);

  assert.strictEqual(embeddings.length, 3);
  embeddings.forEach((emb, i) => {
    assert.ok(emb instanceof Float32Array, `Embedding ${i} should be Float32Array`);
    assert.strictEqual(emb.length, 768, `Embedding ${i} should have 768 dimensions`);
  });
});

// =============================================================================
// SEMANTIC SIMILARITY
// =============================================================================

test('integration: similar texts have high similarity', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');
  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];

  const embedding1 = await provider.embed('The cat sat on the mat', model);
  const embedding2 = await provider.embed('A cat was sitting on a mat', model);

  const similarity = cosineSimilarity(embedding1, embedding2);

  console.log(`Similarity between similar texts: ${similarity.toFixed(4)}`);
  assert.ok(similarity > 0.8, `Expected high similarity, got ${similarity}`);
});

test('integration: dissimilar texts have lower similarity', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');
  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];

  const embedding1 = await provider.embed('The cat sat on the mat', model);
  const embedding2 = await provider.embed('Quantum physics explains the behavior of subatomic particles', model);

  const similarity = cosineSimilarity(embedding1, embedding2);

  console.log(`Similarity between dissimilar texts: ${similarity.toFixed(4)}`);
  assert.ok(similarity < 0.5, `Expected lower similarity, got ${similarity}`);
});

test('integration: semantic search ranking', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');
  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];

  // Corpus
  const documents = [
    'Fix authentication bug in login flow',
    'Add dark mode to user interface',
    'Update payment processing documentation',
    'Refactor authentication middleware',
    'Implement new search algorithm'
  ];

  const query = 'authentication issues';

  // Embed all
  const [queryEmb, ...docEmbs] = await Promise.all([
    provider.embed(query, model),
    ...documents.map(doc => provider.embed(doc, model))
  ]);

  // Rank by similarity
  const results = documents
    .map((doc, i) => ({
      doc,
      similarity: cosineSimilarity(queryEmb, docEmbs[i])
    }))
    .sort((a, b) => b.similarity - a.similarity);

  console.log('Search results for "authentication issues":');
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. [${r.similarity.toFixed(3)}] ${r.doc}`);
  });

  // Top results should be about authentication
  assert.ok(
    results[0].doc.toLowerCase().includes('authentication'),
    'Top result should be about authentication'
  );
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

test('integration: handles invalid model gracefully', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const fakeModel = { name: 'nonexistent-model-12345', dimensions: 768 };

  await assert.rejects(
    () => provider.embed('test', fakeModel),
    /Ollama error/
  );
});

test('integration: handles empty string input', async () => {
  const available = await isOllamaAvailable();
  if (!available) {
    console.log('Skipping: Ollama server not running');
    return;
  }

  const provider = createOllamaProvider();
  const hasModel = await provider.hasModel('nomic-embed-text');
  if (!hasModel) {
    console.log('Skipping: nomic-embed-text model not installed');
    return;
  }

  const model = OLLAMA_MODELS['nomic-embed-text'];
  const embedding = await provider.embed('', model);

  // Empty string should still produce an embedding
  assert.ok(embedding instanceof Float32Array);
  assert.strictEqual(embedding.length, 768);
});
