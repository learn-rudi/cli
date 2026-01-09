/**
 * Unit tests for log streaming
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  LogStream,
  createLogStream,
  formatLogs,
  parseStructuredOutput,
  createProgressTracker
} from '../../stream.js';

// =============================================================================
// LOGSTREAM CLASS
// =============================================================================

test('LogStream: creates instance with empty logs', () => {
  const stream = new LogStream();

  assert.ok(stream instanceof LogStream);
  assert.deepStrictEqual(stream.getLogs(), []);
});

test('LogStream: write adds entry with type and timestamp', () => {
  const stream = new LogStream();

  stream.write('stdout', 'Hello');

  const logs = stream.getLogs();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].type, 'stdout');
  assert.strictEqual(logs[0].message, 'Hello');
  assert.ok(typeof logs[0].timestamp === 'number');
});

test('LogStream: stdout helper writes stdout type', () => {
  const stream = new LogStream();

  stream.stdout('Output text');

  const logs = stream.getLogs();
  assert.strictEqual(logs[0].type, 'stdout');
  assert.strictEqual(logs[0].message, 'Output text');
});

test('LogStream: stderr helper writes stderr type', () => {
  const stream = new LogStream();

  stream.stderr('Error text');

  const logs = stream.getLogs();
  assert.strictEqual(logs[0].type, 'stderr');
  assert.strictEqual(logs[0].message, 'Error text');
});

test('LogStream: info helper writes info type', () => {
  const stream = new LogStream();

  stream.info('Info message');

  const logs = stream.getLogs();
  assert.strictEqual(logs[0].type, 'info');
});

test('LogStream: error helper writes error type', () => {
  const stream = new LogStream();

  // Must attach error listener to prevent unhandled error exception
  stream.on('error', () => {});

  stream.error('Error message');

  const logs = stream.getLogs();
  assert.strictEqual(logs[0].type, 'error');
});

test('LogStream: emits log event on write', () => {
  const stream = new LogStream();
  let received = null;

  stream.on('log', (entry) => {
    received = entry;
  });

  stream.stdout('Test message');

  assert.ok(received);
  assert.strictEqual(received.message, 'Test message');
});

test('LogStream: emits type-specific events', () => {
  const stream = new LogStream();
  let stdoutReceived = null;
  let stderrReceived = null;

  stream.on('stdout', (msg) => { stdoutReceived = msg; });
  stream.on('stderr', (msg) => { stderrReceived = msg; });

  stream.stdout('stdout message');
  stream.stderr('stderr message');

  assert.strictEqual(stdoutReceived, 'stdout message');
  assert.strictEqual(stderrReceived, 'stderr message');
});

test('LogStream: toString returns all messages', () => {
  const stream = new LogStream();

  stream.stdout('Line 1\n');
  stream.stdout('Line 2\n');

  assert.strictEqual(stream.toString(), 'Line 1\nLine 2\n');
});

test('LogStream: toString filters by type', () => {
  const stream = new LogStream();

  stream.stdout('stdout\n');
  stream.stderr('stderr\n');
  stream.stdout('more stdout\n');

  assert.strictEqual(stream.toString('stdout'), 'stdout\nmore stdout\n');
  assert.strictEqual(stream.toString('stderr'), 'stderr\n');
});

test('LogStream: clear removes all logs', () => {
  const stream = new LogStream();

  stream.stdout('Message 1');
  stream.stdout('Message 2');
  assert.strictEqual(stream.getLogs().length, 2);

  stream.clear();
  assert.strictEqual(stream.getLogs().length, 0);
});

// =============================================================================
// CREATE LOG STREAM
// =============================================================================

test('createLogStream: returns LogStream instance', () => {
  const stream = createLogStream();

  assert.ok(stream instanceof LogStream);
});

test('createLogStream: attaches callbacks', () => {
  let stdoutCalled = false;
  let stderrCalled = false;
  let logCalled = false;

  const stream = createLogStream({
    onStdout: () => { stdoutCalled = true; },
    onStderr: () => { stderrCalled = true; },
    onLog: () => { logCalled = true; }
  });

  stream.stdout('test');

  assert.ok(stdoutCalled);
  assert.ok(logCalled);
  assert.ok(!stderrCalled);

  stream.stderr('error');
  assert.ok(stderrCalled);
});

// =============================================================================
// FORMAT LOGS
// =============================================================================

test('formatLogs: joins messages', () => {
  const logs = [
    { type: 'stdout', message: 'Line 1\n', timestamp: 0 },
    { type: 'stdout', message: 'Line 2\n', timestamp: 100 }
  ];

  const result = formatLogs(logs, { colorize: false });

  assert.ok(result.includes('Line 1'));
  assert.ok(result.includes('Line 2'));
});

test('formatLogs: adds timestamp when enabled', () => {
  const logs = [
    { type: 'stdout', message: 'Test\n', timestamp: 1500 }
  ];

  const result = formatLogs(logs, { showTimestamp: true, colorize: false });

  assert.ok(result.includes('[1.50s]'));
});

test('formatLogs: colorizes output when enabled', () => {
  const logs = [
    { type: 'stderr', message: 'Error\n', timestamp: 0 }
  ];

  const result = formatLogs(logs, { colorize: true });

  // Should contain ANSI color codes
  assert.ok(result.includes('\x1b[31m')); // Red for stderr
});

// =============================================================================
// PARSE STRUCTURED OUTPUT
// =============================================================================

test('parseStructuredOutput: extracts JSON markers', () => {
  const output = 'Some text __RUDI_OUTPUT__{"key":"value"}__END_RUDI_OUTPUT__ more text';

  const { text, structured } = parseStructuredOutput(output);

  assert.ok(!text.includes('__RUDI_OUTPUT__'));
  assert.strictEqual(structured.length, 1);
  assert.deepStrictEqual(structured[0], { key: 'value' });
});

test('parseStructuredOutput: handles multiple markers', () => {
  const output = '__RUDI_OUTPUT__{"a":1}__END_RUDI_OUTPUT__ text __RUDI_OUTPUT__{"b":2}__END_RUDI_OUTPUT__';

  const { structured } = parseStructuredOutput(output);

  assert.strictEqual(structured.length, 2);
  assert.deepStrictEqual(structured[0], { a: 1 });
  assert.deepStrictEqual(structured[1], { b: 2 });
});

test('parseStructuredOutput: returns plain text without markers', () => {
  const output = 'Just plain text without markers';

  const { text, structured } = parseStructuredOutput(output);

  assert.strictEqual(text, 'Just plain text without markers');
  assert.deepStrictEqual(structured, []);
});

test('parseStructuredOutput: skips invalid JSON', () => {
  const output = '__RUDI_OUTPUT__not json__END_RUDI_OUTPUT__';

  const { structured } = parseStructuredOutput(output);

  assert.deepStrictEqual(structured, []);
});

// =============================================================================
// PROGRESS TRACKER
// =============================================================================

test('progressTracker: initializes with defaults', () => {
  const tracker = createProgressTracker();

  assert.strictEqual(tracker.progress.current, 0);
  assert.strictEqual(tracker.progress.total, 100);
  assert.strictEqual(tracker.progress.percent, 0);
});

test('progressTracker: update sets current value', () => {
  const tracker = createProgressTracker({ total: 10 });

  tracker.update(5);

  assert.strictEqual(tracker.progress.current, 5);
  assert.strictEqual(tracker.progress.percent, 50);
});

test('progressTracker: update sets message', () => {
  const tracker = createProgressTracker();

  tracker.update(50, 'Processing...');

  assert.strictEqual(tracker.progress.message, 'Processing...');
});

test('progressTracker: increment adds to current', () => {
  const tracker = createProgressTracker({ total: 10 });

  tracker.update(3);
  tracker.increment(2);

  assert.strictEqual(tracker.progress.current, 5);
});

test('progressTracker: complete sets to total', () => {
  const tracker = createProgressTracker({ total: 100 });

  tracker.update(50);
  tracker.complete('Done!');

  assert.strictEqual(tracker.progress.current, 100);
  assert.strictEqual(tracker.progress.percent, 100);
  assert.strictEqual(tracker.progress.message, 'Done!');
});

test('progressTracker: calls onProgress callback', () => {
  let received = null;

  const tracker = createProgressTracker({
    total: 10,
    onProgress: (progress) => { received = progress; }
  });

  tracker.update(5, 'Halfway');

  assert.ok(received);
  assert.strictEqual(received.current, 5);
  assert.strictEqual(received.percent, 50);
  assert.strictEqual(received.message, 'Halfway');
});

