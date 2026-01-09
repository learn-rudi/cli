/**
 * Unit tests for search module
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { prepareFtsQuery } from '../../search.js';

// =============================================================================
// FTS QUERY PREPARATION
// =============================================================================

test('prepareFtsQuery: single word returns prefix search', () => {
  const result = prepareFtsQuery('test');
  assert.strictEqual(result, '"test"*');
});

test('prepareFtsQuery: multiple words return multiple prefix searches', () => {
  const result = prepareFtsQuery('hello world');
  assert.strictEqual(result, '"hello"* "world"*');
});

test('prepareFtsQuery: removes quotes', () => {
  const result = prepareFtsQuery('"quoted" \'single\'');
  assert.strictEqual(result, '"quoted"* "single"*');
});

test('prepareFtsQuery: removes parentheses', () => {
  const result = prepareFtsQuery('(grouped) text');
  assert.strictEqual(result, '"grouped"* "text"*');
});

test('prepareFtsQuery: handles hyphens', () => {
  const result = prepareFtsQuery('e-commerce');
  assert.strictEqual(result, '"e"* "commerce"*');
});

test('prepareFtsQuery: removes asterisks', () => {
  const result = prepareFtsQuery('test*');
  assert.strictEqual(result, '"test"*');
});

test('prepareFtsQuery: handles empty string', () => {
  const result = prepareFtsQuery('');
  assert.strictEqual(result, '""');
});

test('prepareFtsQuery: handles whitespace only', () => {
  const result = prepareFtsQuery('   ');
  assert.strictEqual(result, '""');
});

test('prepareFtsQuery: trims whitespace', () => {
  const result = prepareFtsQuery('  hello  world  ');
  assert.strictEqual(result, '"hello"* "world"*');
});

test('prepareFtsQuery: handles special characters', () => {
  const result = prepareFtsQuery('test@user.com');
  assert.ok(result.includes('test'));
  // Should not throw
});

// =============================================================================
// SEARCH QUERY EDGE CASES
// =============================================================================

test('prepareFtsQuery: handles code-like queries', () => {
  const result = prepareFtsQuery('function test()');
  // Should handle parentheses
  assert.ok(result.includes('function'));
  assert.ok(result.includes('test'));
});

test('prepareFtsQuery: handles file paths', () => {
  const result = prepareFtsQuery('/src/index.js');
  assert.ok(result.length > 0);
});

test('prepareFtsQuery: handles error messages', () => {
  const result = prepareFtsQuery('Error: cannot read property');
  assert.ok(result.includes('Error'));
  assert.ok(result.includes('cannot'));
});
