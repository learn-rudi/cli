/**
 * Unit tests for hash utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { sha256 } from '../../utils/hash.js';

// =============================================================================
// SHA256 HASHING
// =============================================================================

test('sha256: produces consistent hash', () => {
  const input = 'Hello, World!';
  const hash1 = sha256(input);
  const hash2 = sha256(input);

  assert.strictEqual(hash1, hash2);
});

test('sha256: produces 64-char hex string', () => {
  const hash = sha256('test');

  assert.strictEqual(hash.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(hash), 'Should be lowercase hex');
});

test('sha256: different inputs produce different hashes', () => {
  const hash1 = sha256('input1');
  const hash2 = sha256('input2');

  assert.notStrictEqual(hash1, hash2);
});

test('sha256: handles empty string', () => {
  const hash = sha256('');

  // Known SHA256 hash of empty string
  assert.strictEqual(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

test('sha256: handles unicode', () => {
  const hash = sha256('Hello 世界 🌍');

  assert.strictEqual(hash.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(hash));
});

test('sha256: handles long strings', () => {
  const longString = 'a'.repeat(10000);
  const hash = sha256(longString);

  assert.strictEqual(hash.length, 64);
});

test('sha256: matches known test vector', () => {
  // SHA256("abc") is well-known
  const hash = sha256('abc');
  assert.strictEqual(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
