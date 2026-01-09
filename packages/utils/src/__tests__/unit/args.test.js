/**
 * Unit tests for argument parsing utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { parseArgs, formatValue, formatBytes, formatDuration } from '../../args.js';

// =============================================================================
// PARSE ARGS - COMMANDS
// =============================================================================

test('parseArgs: extracts command as first non-flag argument', () => {
  const result = parseArgs(['install', 'my-package']);

  assert.strictEqual(result.command, 'install');
});

test('parseArgs: returns null command for empty args', () => {
  const result = parseArgs([]);

  assert.strictEqual(result.command, null);
});

test('parseArgs: command before flags', () => {
  const result = parseArgs(['search', '--all']);

  assert.strictEqual(result.command, 'search');
});

// =============================================================================
// PARSE ARGS - POSITIONAL ARGUMENTS
// =============================================================================

test('parseArgs: collects args after command', () => {
  const result = parseArgs(['install', 'pkg1', 'pkg2']);

  assert.deepStrictEqual(result.args, ['pkg1', 'pkg2']);
});

test('parseArgs: args array is empty without positionals', () => {
  const result = parseArgs(['list']);

  assert.deepStrictEqual(result.args, []);
});

// =============================================================================
// PARSE ARGS - LONG FLAGS
// =============================================================================

test('parseArgs: parses --flag=value format', () => {
  const result = parseArgs(['command', '--output=json']);

  assert.strictEqual(result.flags.output, 'json');
});

test('parseArgs: parses --flag value format', () => {
  const result = parseArgs(['command', '--output', 'json']);

  assert.strictEqual(result.flags.output, 'json');
});

test('parseArgs: boolean flag without value', () => {
  const result = parseArgs(['command', '--verbose']);

  assert.strictEqual(result.flags.verbose, true);
});

test('parseArgs: boolean flag when next arg is another flag', () => {
  const result = parseArgs(['command', '--verbose', '--json']);

  assert.strictEqual(result.flags.verbose, true);
  assert.strictEqual(result.flags.json, true);
});

// =============================================================================
// PARSE ARGS - SHORT FLAGS
// =============================================================================

test('parseArgs: single short flag', () => {
  const result = parseArgs(['command', '-v']);

  assert.strictEqual(result.flags.v, true);
});

test('parseArgs: combined short flags', () => {
  const result = parseArgs(['command', '-vf']);

  assert.strictEqual(result.flags.v, true);
  assert.strictEqual(result.flags.f, true);
});

test('parseArgs: multiple separate short flags', () => {
  const result = parseArgs(['command', '-v', '-f']);

  assert.strictEqual(result.flags.v, true);
  assert.strictEqual(result.flags.f, true);
});

// =============================================================================
// PARSE ARGS - MIXED
// =============================================================================

test('parseArgs: mixed flags and args', () => {
  const result = parseArgs(['install', 'my-package', '--force', '-v', '--format=json']);

  assert.strictEqual(result.command, 'install');
  assert.deepStrictEqual(result.args, ['my-package']);
  assert.strictEqual(result.flags.force, true);
  assert.strictEqual(result.flags.v, true);
  assert.strictEqual(result.flags.format, 'json');
});

test('parseArgs: complex real-world example', () => {
  const result = parseArgs(['db', 'search', 'authentication', '--limit', '10', '-v', '--json']);

  assert.strictEqual(result.command, 'db');
  assert.deepStrictEqual(result.args, ['search', 'authentication']);
  assert.strictEqual(result.flags.limit, '10');
  assert.strictEqual(result.flags.v, true);
  assert.strictEqual(result.flags.json, true);
});

// =============================================================================
// FORMAT VALUE
// =============================================================================

test('formatValue: null returns dash', () => {
  assert.strictEqual(formatValue(null), '-');
});

test('formatValue: undefined returns dash', () => {
  assert.strictEqual(formatValue(undefined), '-');
});

test('formatValue: true returns yes', () => {
  assert.strictEqual(formatValue(true), 'yes');
});

test('formatValue: false returns no', () => {
  assert.strictEqual(formatValue(false), 'no');
});

test('formatValue: string returns as-is', () => {
  assert.strictEqual(formatValue('hello'), 'hello');
});

test('formatValue: number returns stringified', () => {
  assert.strictEqual(formatValue(42), '42');
});

// =============================================================================
// FORMAT BYTES
// =============================================================================

test('formatBytes: 0 bytes', () => {
  assert.strictEqual(formatBytes(0), '0 B');
});

test('formatBytes: bytes', () => {
  assert.strictEqual(formatBytes(500), '500.0 B');
});

test('formatBytes: kilobytes', () => {
  const result = formatBytes(1024);
  assert.ok(result.includes('KB'));
});

test('formatBytes: megabytes', () => {
  const result = formatBytes(1024 * 1024);
  assert.ok(result.includes('MB'));
});

test('formatBytes: gigabytes', () => {
  const result = formatBytes(1024 * 1024 * 1024);
  assert.ok(result.includes('GB'));
});

test('formatBytes: fractional values', () => {
  const result = formatBytes(1536);
  assert.strictEqual(result, '1.5 KB');
});

// =============================================================================
// FORMAT DURATION
// =============================================================================

test('formatDuration: milliseconds', () => {
  assert.strictEqual(formatDuration(500), '500ms');
});

test('formatDuration: seconds', () => {
  const result = formatDuration(2500);
  assert.strictEqual(result, '2.5s');
});

test('formatDuration: minutes', () => {
  const result = formatDuration(90000);
  assert.strictEqual(result, '1m 30s');
});

test('formatDuration: boundary at 1 second', () => {
  assert.strictEqual(formatDuration(999), '999ms');
  assert.strictEqual(formatDuration(1000), '1.0s');
});

test('formatDuration: boundary at 1 minute', () => {
  const result = formatDuration(60000);
  assert.strictEqual(result, '1m 0s');
});

