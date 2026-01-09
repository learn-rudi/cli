/**
 * Unit tests for vector math utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  l2Normalize,
  dot,
  cosineSimilarity,
  float32ToBuffer,
  bufferToFloat32
} from '../../utils/vector.js';

// =============================================================================
// L2 NORMALIZATION
// =============================================================================

test('l2Normalize: normalizes vector to unit length', () => {
  const v = new Float32Array([3, 4]); // 3-4-5 triangle
  const normalized = l2Normalize(v);

  // Should have unit length (sqrt(sum of squares) = 1)
  const length = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
  assert.ok(Math.abs(length - 1) < 0.0001, `Expected unit length, got ${length}`);

  // Expected values: 3/5 = 0.6, 4/5 = 0.8
  assert.ok(Math.abs(normalized[0] - 0.6) < 0.0001);
  assert.ok(Math.abs(normalized[1] - 0.8) < 0.0001);
});

test('l2Normalize: handles zero vector', () => {
  const v = new Float32Array([0, 0, 0]);
  const normalized = l2Normalize(v);

  // Should not throw, should return zero vector
  assert.strictEqual(normalized.length, 3);
  assert.strictEqual(normalized[0], 0);
  assert.strictEqual(normalized[1], 0);
  assert.strictEqual(normalized[2], 0);
});

test('l2Normalize: preserves direction', () => {
  const v = new Float32Array([1, 2, 3]);
  const normalized = l2Normalize(v);

  // Ratios should be preserved
  const ratio1 = v[1] / v[0];
  const ratio2 = normalized[1] / normalized[0];
  assert.ok(Math.abs(ratio1 - ratio2) < 0.0001);
});

test('l2Normalize: returns new array (does not mutate)', () => {
  const v = new Float32Array([3, 4]);
  const normalized = l2Normalize(v);

  assert.notStrictEqual(v, normalized);
  assert.strictEqual(v[0], 3);
  assert.strictEqual(v[1], 4);
});

// =============================================================================
// DOT PRODUCT
// =============================================================================

test('dot: computes dot product correctly', () => {
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([4, 5, 6]);

  // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
  const result = dot(a, b);
  assert.strictEqual(result, 32);
});

test('dot: returns 0 for orthogonal vectors', () => {
  const a = new Float32Array([1, 0]);
  const b = new Float32Array([0, 1]);

  const result = dot(a, b);
  assert.strictEqual(result, 0);
});

test('dot: returns 1 for identical normalized vectors', () => {
  const v = l2Normalize(new Float32Array([1, 2, 3]));
  const result = dot(v, v);

  assert.ok(Math.abs(result - 1) < 0.0001);
});

test('dot: equals cosine similarity for normalized vectors', () => {
  const a = l2Normalize(new Float32Array([1, 2, 3]));
  const b = l2Normalize(new Float32Array([4, 5, 6]));

  const dotResult = dot(a, b);
  const cosineResult = cosineSimilarity(a, b);

  assert.ok(Math.abs(dotResult - cosineResult) < 0.0001);
});

// =============================================================================
// COSINE SIMILARITY
// =============================================================================

test('cosineSimilarity: returns 1 for identical vectors', () => {
  const v = new Float32Array([1, 2, 3]);
  const result = cosineSimilarity(v, v);

  assert.ok(Math.abs(result - 1) < 0.0001);
});

test('cosineSimilarity: returns -1 for opposite vectors', () => {
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([-1, -2, -3]);

  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result - (-1)) < 0.0001);
});

test('cosineSimilarity: returns 0 for orthogonal vectors', () => {
  const a = new Float32Array([1, 0, 0]);
  const b = new Float32Array([0, 1, 0]);

  const result = cosineSimilarity(a, b);
  assert.ok(Math.abs(result) < 0.0001);
});

test('cosineSimilarity: is scale invariant', () => {
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([4, 5, 6]);

  const result1 = cosineSimilarity(a, b);

  // Scale both vectors
  const aScaled = new Float32Array([10, 20, 30]);
  const bScaled = new Float32Array([40, 50, 60]);
  const result2 = cosineSimilarity(aScaled, bScaled);

  assert.ok(Math.abs(result1 - result2) < 0.0001);
});

test('cosineSimilarity: handles high-dimensional vectors', () => {
  // Simulate embedding dimensions (768)
  const size = 768;
  const a = new Float32Array(size);
  const b = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    a[i] = Math.random();
    b[i] = Math.random();
  }

  const result = cosineSimilarity(a, b);

  // Result should be between -1 and 1
  assert.ok(result >= -1 && result <= 1, `Result ${result} out of range`);
});

// =============================================================================
// BUFFER CONVERSION
// =============================================================================

test('float32ToBuffer: converts Float32Array to Buffer', () => {
  const v = new Float32Array([1.5, 2.5, 3.5]);
  const buf = float32ToBuffer(v);

  assert.ok(Buffer.isBuffer(buf));
  assert.strictEqual(buf.length, v.length * 4); // 4 bytes per float32
});

test('bufferToFloat32: converts Buffer back to Float32Array', () => {
  const original = new Float32Array([1.5, 2.5, 3.5]);
  const buf = float32ToBuffer(original);
  const restored = bufferToFloat32(buf);

  assert.strictEqual(restored.length, original.length);
  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(restored[i] - original[i]) < 0.0001);
  }
});

test('buffer roundtrip: preserves precision', () => {
  // Test with typical embedding values
  const original = new Float32Array([0.123456, -0.789012, 0.345678]);
  const buf = float32ToBuffer(original);
  const restored = bufferToFloat32(buf);

  for (let i = 0; i < original.length; i++) {
    assert.ok(Math.abs(restored[i] - original[i]) < 0.000001);
  }
});

test('buffer roundtrip: handles 768-dim embeddings', () => {
  const size = 768;
  const original = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    original[i] = (Math.random() - 0.5) * 2; // Range -1 to 1
  }

  const buf = float32ToBuffer(original);
  const restored = bufferToFloat32(buf);

  assert.strictEqual(buf.length, size * 4);
  assert.strictEqual(restored.length, size);

  for (let i = 0; i < size; i++) {
    assert.ok(Math.abs(restored[i] - original[i]) < 0.000001);
  }
});

// =============================================================================
// SEMANTIC SIMILARITY SANITY CHECKS
// =============================================================================

test('semantic: similar texts should have high similarity', () => {
  // Simulated embeddings for "cat" and "kitten" (would be similar in real model)
  // For testing, we create vectors that are similar
  const cat = new Float32Array([0.8, 0.5, 0.3, 0.1]);
  const kitten = new Float32Array([0.75, 0.55, 0.25, 0.15]);

  const similarity = cosineSimilarity(cat, kitten);

  // These should be similar (>0.9)
  assert.ok(similarity > 0.9, `Expected high similarity, got ${similarity}`);
});

test('semantic: dissimilar texts should have low similarity', () => {
  // Simulated embeddings for "cat" and "mathematics"
  const cat = new Float32Array([0.8, 0.5, 0.3, 0.1]);
  const math = new Float32Array([0.1, 0.2, 0.9, 0.8]);

  const similarity = cosineSimilarity(cat, math);

  // These should be less similar (<0.7)
  assert.ok(similarity < 0.7, `Expected low similarity, got ${similarity}`);
});
