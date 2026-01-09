/**
 * Integration tests for database operations
 * Uses in-memory database to avoid touching real ~/.rudi/rudi.db
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

// =============================================================================
// TEST HELPERS
// =============================================================================

let testDb = null;
let testDbPath = null;

function createTestDb() {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-db-test-'));
  testDbPath = path.join(testDir, 'test.db');

  testDb = new Database(testDbPath);
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');

  return { testDb, testDbPath, testDir };
}

function cleanupTestDb(testDir) {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL,
      turn_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      turn_number INTEGER NOT NULL,
      user_message TEXT,
      assistant_response TEXT,
      ts TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS turns_fts USING fts5(
      user_message,
      assistant_response,
      content='turns',
      content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS turns_ai AFTER INSERT ON turns BEGIN
      INSERT INTO turns_fts(rowid, user_message, assistant_response)
      VALUES (NEW.rowid, NEW.user_message, NEW.assistant_response);
    END;
  `);
}

// =============================================================================
// SCHEMA TESTS
// =============================================================================

test('schema: creates tables correctly', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    // Verify tables exist
    const tables = testDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const tableNames = tables.map(t => t.name);
    assert.ok(tableNames.includes('sessions'), 'sessions table should exist');
    assert.ok(tableNames.includes('turns'), 'turns table should exist');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('schema: creates FTS virtual table', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    const fts = testDb.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='turns_fts'
    `).get();

    assert.ok(fts, 'turns_fts virtual table should exist');
  } finally {
    cleanupTestDb(testDir);
  }
});

// =============================================================================
// SESSION CRUD
// =============================================================================

test('session: insert and retrieve', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    const session = {
      id: 'test-session-1',
      provider: 'claude',
      title: 'Test Session',
      status: 'active',
      created_at: new Date().toISOString(),
      last_active_at: new Date().toISOString()
    };

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(session.id, session.provider, session.title, session.status, session.created_at, session.last_active_at);

    const retrieved = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(session.id);

    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, session.id);
    assert.strictEqual(retrieved.provider, session.provider);
    assert.strictEqual(retrieved.title, session.title);
  } finally {
    cleanupTestDb(testDir);
  }
});

test('session: update status', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    testDb.prepare(`UPDATE sessions SET status = 'archived' WHERE id = 's1'`).run();

    const session = testDb.prepare('SELECT status FROM sessions WHERE id = ?').get('s1');
    assert.strictEqual(session.status, 'archived');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('session: delete cascades to turns', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    // Insert session
    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    // Insert turns
    testDb.prepare(`
      INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES ('t1', 's1', 1, 'Hello', datetime('now'))
    `).run();

    // Verify turn exists
    let turn = testDb.prepare('SELECT * FROM turns WHERE id = ?').get('t1');
    assert.ok(turn, 'Turn should exist before delete');

    // Delete session
    testDb.prepare('DELETE FROM sessions WHERE id = ?').run('s1');

    // Turn should be cascaded
    turn = testDb.prepare('SELECT * FROM turns WHERE id = ?').get('t1');
    assert.ok(!turn, 'Turn should be deleted with session');
  } finally {
    cleanupTestDb(testDir);
  }
});

// =============================================================================
// TURN OPERATIONS
// =============================================================================

test('turn: insert with session FK', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    testDb.prepare(`
      INSERT INTO turns (id, session_id, turn_number, user_message, assistant_response, ts)
      VALUES ('t1', 's1', 1, 'What is 2+2?', '2+2=4', datetime('now'))
    `).run();

    const turn = testDb.prepare('SELECT * FROM turns WHERE id = ?').get('t1');
    assert.ok(turn);
    assert.strictEqual(turn.user_message, 'What is 2+2?');
    assert.strictEqual(turn.assistant_response, '2+2=4');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('turn: ordering by turn_number', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    // Insert out of order
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, ts) VALUES ('t3', 's1', 3, datetime('now'))`).run();
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, ts) VALUES ('t1', 's1', 1, datetime('now'))`).run();
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, ts) VALUES ('t2', 's1', 2, datetime('now'))`).run();

    const turns = testDb.prepare('SELECT id FROM turns WHERE session_id = ? ORDER BY turn_number').all('s1');

    assert.strictEqual(turns[0].id, 't1');
    assert.strictEqual(turns[1].id, 't2');
    assert.strictEqual(turns[2].id, 't3');
  } finally {
    cleanupTestDb(testDir);
  }
});

// =============================================================================
// FTS SEARCH
// =============================================================================

test('fts: indexes turn content', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    testDb.prepare(`
      INSERT INTO turns (id, session_id, turn_number, user_message, assistant_response, ts)
      VALUES ('t1', 's1', 1, 'How do I fix authentication bugs?', 'Check your login middleware', datetime('now'))
    `).run();

    // Search should find it
    const results = testDb.prepare(`
      SELECT * FROM turns_fts WHERE turns_fts MATCH 'authentication'
    `).all();

    assert.ok(results.length > 0, 'FTS should find "authentication"');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('fts: prefix search', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    testDb.prepare(`
      INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES ('t1', 's1', 1, 'authentication and authorization', datetime('now'))
    `).run();

    // Prefix search
    const results = testDb.prepare(`
      SELECT * FROM turns_fts WHERE turns_fts MATCH '"auth"*'
    `).all();

    assert.ok(results.length > 0, 'FTS should find prefix "auth"');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('fts: ranking multiple results', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    // Insert multiple turns with varying relevance
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES ('t1', 's1', 1, 'Python programming basics', datetime('now'))`).run();
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES ('t2', 's1', 2, 'Python Python Python everywhere', datetime('now'))`).run();
    testDb.prepare(`INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES ('t3', 's1', 3, 'JavaScript is also nice', datetime('now'))`).run();

    const results = testDb.prepare(`
      SELECT *, bm25(turns_fts) as rank FROM turns_fts
      WHERE turns_fts MATCH 'Python'
      ORDER BY rank
    `).all();

    assert.strictEqual(results.length, 2, 'Should find 2 Python results');
  } finally {
    cleanupTestDb(testDir);
  }
});

// =============================================================================
// PERFORMANCE / STRESS TESTS
// =============================================================================

test('perf: handles many turns', () => {
  const { testDir } = createTestDb();

  try {
    initSchema(testDb);

    testDb.prepare(`
      INSERT INTO sessions (id, provider, title, status, created_at, last_active_at)
      VALUES ('s1', 'claude', 'Test', 'active', datetime('now'), datetime('now'))
    `).run();

    // Insert 100 turns
    const insert = testDb.prepare(`
      INSERT INTO turns (id, session_id, turn_number, user_message, ts)
      VALUES (?, 's1', ?, ?, datetime('now'))
    `);

    const startTime = Date.now();

    testDb.transaction(() => {
      for (let i = 0; i < 100; i++) {
        insert.run(`t${i}`, i, `Turn ${i} message about various topics`);
      }
    })();

    const insertTime = Date.now() - startTime;

    // Count turns
    const count = testDb.prepare('SELECT COUNT(*) as count FROM turns').get();
    assert.strictEqual(count.count, 100);

    console.log(`Inserted 100 turns in ${insertTime}ms`);
    assert.ok(insertTime < 1000, 'Insert should complete within 1 second');

    // Search performance
    const searchStart = Date.now();
    const results = testDb.prepare(`SELECT * FROM turns_fts WHERE turns_fts MATCH 'Turn'`).all();
    const searchTime = Date.now() - searchStart;

    console.log(`FTS search returned ${results.length} results in ${searchTime}ms`);
    assert.ok(searchTime < 100, 'Search should complete within 100ms');
  } finally {
    cleanupTestDb(testDir);
  }
});

// =============================================================================
// WAL MODE
// =============================================================================

test('wal: journal mode is WAL', () => {
  const { testDir } = createTestDb();

  try {
    const mode = testDb.pragma('journal_mode', { simple: true });
    assert.strictEqual(mode, 'wal');
  } finally {
    cleanupTestDb(testDir);
  }
});

test('wal: foreign keys enabled', () => {
  const { testDir } = createTestDb();

  try {
    const fk = testDb.pragma('foreign_keys', { simple: true });
    assert.strictEqual(fk, 1);
  } finally {
    cleanupTestDb(testDir);
  }
});
