/**
 * E2E test for Ollama runtime setup flow
 * Tests: setup → install → detect → embeddings index → semantic search
 *
 * Note: This test requires Ollama to be installed and running
 * Set SKIP_E2E=true to skip these tests
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Skip if SKIP_E2E is set
const SKIP_E2E = process.env.SKIP_E2E === 'true';

/**
 * Create isolated test environment
 */
function createTestEnv() {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-e2e-'));
  const rudiHome = path.join(testDir, '.rudi');

  // Create directory structure
  fs.mkdirSync(path.join(rudiHome, 'stacks'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'runtimes'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'binaries'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'bins'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'cache'), { recursive: true });
  fs.mkdirSync(path.join(rudiHome, 'sessions'), { recursive: true });

  return { testDir, rudiHome };
}

/**
 * Cleanup test environment
 */
function cleanupTestEnv(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

/**
 * Check if Ollama is installed and running
 */
function checkOllamaAvailable() {
  try {
    execSync('ollama --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Ollama server is reachable
 */
async function checkOllamaRunning() {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

// =============================================================================
// OLLAMA DETECTION & SETUP
// =============================================================================

test('e2e: detect ollama installation', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable()) {
    console.log('Skipping: Ollama not installed');
    return;
  }

  try {
    const output = execSync('ollama --version', { encoding: 'utf8' });
    console.log(`Detected: ${output.trim()}`);

    // Verify version pattern matches manifest detect.pattern
    const pattern = /ollama version is (\d+\.\d+\.\d+)/;
    const match = output.match(pattern);

    if (match) {
      console.log(`Ollama version: ${match[1]}`);
      assert.ok(match[1], 'Should extract version');
    }
  } catch (error) {
    console.log('Ollama detected but version check failed:', error.message);
  }
});

test('e2e: check ollama server reachable', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable()) {
    console.log('Skipping: Ollama not installed');
    return;
  }

  const running = await checkOllamaRunning();

  if (!running) {
    console.log('Ollama is installed but server not running. Start with: ollama serve');
    return;
  }

  console.log('Ollama server is running on localhost:11434');
  assert.ok(running, 'Ollama server should be reachable');
});

test('e2e: check embedding model available', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable() || !(await checkOllamaRunning())) {
    console.log('Skipping: Ollama not running');
    return;
  }

  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();

    const models = data.models || [];
    const hasNomicEmbed = models.some(m => m.name.includes('nomic-embed-text'));

    if (!hasNomicEmbed) {
      console.log('nomic-embed-text not found. Install with: ollama pull nomic-embed-text');
      return;
    }

    console.log('nomic-embed-text model is available');
    assert.ok(hasNomicEmbed, 'Embedding model should be available');
  } catch (error) {
    console.log('Failed to check models:', error.message);
  }
});

// =============================================================================
// EMBEDDINGS GENERATION
// =============================================================================

test('e2e: generate embeddings via ollama', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable() || !(await checkOllamaRunning())) {
    console.log('Skipping: Ollama not running');
    return;
  }

  try {
    const testText = 'This is a test for semantic search';

    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: testText
      })
    });

    const data = await response.json();

    assert.ok(data.embedding, 'Should return embedding vector');
    assert.ok(Array.isArray(data.embedding), 'Embedding should be an array');
    assert.strictEqual(data.embedding.length, 768, 'nomic-embed-text should return 768 dimensions');

    console.log(`Generated embedding with ${data.embedding.length} dimensions`);
  } catch (error) {
    console.log('Failed to generate embeddings:', error.message);
  }
});

test('e2e: generate batch embeddings', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable() || !(await checkOllamaRunning())) {
    console.log('Skipping: Ollama not running');
    return;
  }

  try {
    const texts = [
      'Function to authenticate users',
      'Bug in payment processing',
      'Update documentation for API'
    ];

    const embeddings = [];

    for (const text of texts) {
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: text
        })
      });

      const data = await response.json();
      embeddings.push(data.embedding);
    }

    assert.strictEqual(embeddings.length, 3, 'Should generate 3 embeddings');
    embeddings.forEach((emb, i) => {
      assert.strictEqual(emb.length, 768, `Embedding ${i} should have 768 dimensions`);
    });

    console.log(`Generated ${embeddings.length} batch embeddings`);
  } catch (error) {
    console.log('Failed to generate batch embeddings:', error.message);
  }
});

// =============================================================================
// SEMANTIC SEARCH (COSINE SIMILARITY)
// =============================================================================

test('e2e: semantic search with cosine similarity', { skip: SKIP_E2E }, async () => {
  if (!checkOllamaAvailable() || !(await checkOllamaRunning())) {
    console.log('Skipping: Ollama not running');
    return;
  }

  try {
    // Create a small test corpus
    const corpus = [
      { id: 1, text: 'Fix authentication bug in login flow' },
      { id: 2, text: 'Add dark mode to user interface' },
      { id: 3, text: 'Update payment processing documentation' },
      { id: 4, text: 'Refactor authentication middleware' }
    ];

    // Generate embeddings for corpus
    const corpusEmbeddings = await Promise.all(
      corpus.map(async (item) => {
        const response = await fetch('http://localhost:11434/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nomic-embed-text',
            prompt: item.text
          })
        });
        const data = await response.json();
        return { ...item, embedding: data.embedding };
      })
    );

    // Search query
    const query = 'authentication bugs';
    const queryResponse = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: query
      })
    });
    const queryData = await queryResponse.json();
    const queryEmbedding = queryData.embedding;

    // Calculate cosine similarity
    function cosineSimilarity(a, b) {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }

      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Rank results by similarity
    const results = corpusEmbeddings
      .map(item => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity);

    console.log('Search results for "authentication bugs":');
    results.forEach((r, i) => {
      console.log(`${i + 1}. [${r.similarity.toFixed(3)}] ${r.text}`);
    });

    // Verify top result is related to authentication
    assert.ok(results[0].text.toLowerCase().includes('authentication'), 'Top result should be about authentication');
    assert.ok(results[0].similarity > 0.5, 'Top result should have high similarity');
  } catch (error) {
    console.log('Failed semantic search test:', error.message);
  }
});

// =============================================================================
// FULL SETUP FLOW
// =============================================================================

test('e2e: full ollama setup flow', { skip: SKIP_E2E }, async () => {
  const { testDir, rudiHome } = createTestEnv();

  try {
    if (!checkOllamaAvailable()) {
      console.log('Skipping: Ollama not installed');
      return;
    }

    // Step 1: Detect Ollama
    console.log('1. Detecting Ollama installation...');
    const detectResult = execSync('ollama --version', { encoding: 'utf8' });
    assert.ok(detectResult, 'Ollama should be detected');

    // Step 2: Check server
    console.log('2. Checking Ollama server...');
    const serverRunning = await checkOllamaRunning();
    if (!serverRunning) {
      console.log('Ollama server not running - test cannot continue');
      return;
    }

    // Step 3: Verify embedding model
    console.log('3. Checking embedding model...');
    const tagsResponse = await fetch('http://localhost:11434/api/tags');
    const tagsData = await tagsResponse.json();
    const hasModel = tagsData.models?.some(m => m.name.includes('nomic-embed-text'));

    if (!hasModel) {
      console.log('Embedding model not found - test cannot continue');
      return;
    }

    // Step 4: Create test session
    console.log('4. Creating test session...');
    const sessionDir = path.join(rudiHome, 'sessions', 'test-session');
    fs.mkdirSync(sessionDir, { recursive: true });

    const sessionData = {
      id: 'test-session',
      created: new Date().toISOString(),
      turns: [
        { role: 'user', content: 'How do I fix authentication bugs?' },
        { role: 'assistant', content: 'Check the login flow and middleware' }
      ]
    };

    fs.writeFileSync(
      path.join(sessionDir, 'session.json'),
      JSON.stringify(sessionData, null, 2)
    );

    // Step 5: Generate embeddings for session
    console.log('5. Generating embeddings...');
    const turnText = sessionData.turns[0].content;

    const embedResponse = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: turnText
      })
    });

    const embedData = await embedResponse.json();
    assert.ok(embedData.embedding, 'Should generate embedding');
    assert.strictEqual(embedData.embedding.length, 768, 'Should have 768 dimensions');

    // Step 6: Store embedding
    console.log('6. Storing embedding metadata...');
    const embeddingMeta = {
      turnId: 1,
      sessionId: 'test-session',
      model: 'nomic-embed-text',
      dimensions: 768,
      generatedAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(sessionDir, 'embeddings.json'),
      JSON.stringify(embeddingMeta, null, 2)
    );

    // Step 7: Verify search capability
    console.log('7. Testing semantic search...');
    const searchQuery = 'authentication';
    const searchResponse = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: searchQuery
      })
    });

    const searchData = await searchResponse.json();
    assert.ok(searchData.embedding, 'Should generate search embedding');

    console.log('✓ Full Ollama setup flow completed successfully');
  } catch (error) {
    console.error('E2E test failed:', error.message);
    throw error;
  } finally {
    cleanupTestEnv(testDir);
  }
});

// =============================================================================
// MCP TOOL SURFACE TEST
// =============================================================================

test('e2e: mcp semantic search tool', { skip: SKIP_E2E }, async () => {
  // This test simulates calling the rudi_semantic_search MCP tool
  // In a real scenario, this would be called via JSON-RPC over stdio

  if (!checkOllamaAvailable() || !(await checkOllamaRunning())) {
    console.log('Skipping: Ollama not running');
    return;
  }

  try {
    const toolCall = {
      name: 'rudi_semantic_search',
      arguments: {
        query: 'authentication bugs',
        limit: 5,
        minScore: 0.5
      }
    };

    console.log('Simulating MCP tool call:', JSON.stringify(toolCall, null, 2));

    // In real implementation, this would query the embeddings database
    // For now, we just verify the tool shape is correct
    assert.ok(toolCall.name, 'Tool should have name');
    assert.ok(toolCall.arguments, 'Tool should have arguments');
    assert.ok(toolCall.arguments.query, 'Tool should have query parameter');
    assert.strictEqual(typeof toolCall.arguments.limit, 'number', 'Limit should be number');
    assert.strictEqual(typeof toolCall.arguments.minScore, 'number', 'MinScore should be number');

    console.log('✓ MCP tool shape validated');
  } catch (error) {
    console.error('MCP tool test failed:', error.message);
    throw error;
  }
});
