/**
 * SQLite vector store for embeddings
 *
 * Stores embeddings as BLOBs in the turn_embeddings table.
 * Uses brute-force cosine similarity for search (fast enough for <50K turns).
 */

import { getDb } from '@learnrudi/db';

/**
 * Ensure the turn_embeddings table exists
 */
export function ensureEmbeddingsSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS turn_embeddings (
      turn_id TEXT PRIMARY KEY,
      model TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      embedding BLOB NOT NULL,
      content_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'done',
      error TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_turn_embeddings_model_dims
      ON turn_embeddings(model, dimensions);

    CREATE INDEX IF NOT EXISTS idx_turn_embeddings_status
      ON turn_embeddings(status);

    CREATE INDEX IF NOT EXISTS idx_turn_embeddings_hash
      ON turn_embeddings(content_hash);
  `);
}

/**
 * Get turns that don't have embeddings yet
 * @param {Object} model - { name, dimensions }
 * @param {number} limit
 * @returns {Array<{id: string, session_id: string, content: string, ts: string}>}
 */
export function getMissingTurns(model, limit = 100) {
  const db = getDb();

  // Combine user_message and assistant_response into content
  // Only get turns that have actual content
  const stmt = db.prepare(`
    SELECT
      t.id,
      t.session_id,
      COALESCE(t.user_message, '') || ' ' || COALESCE(t.assistant_response, '') as content,
      t.ts
    FROM turns t
    LEFT JOIN turn_embeddings e
      ON e.turn_id = t.id AND e.model = ? AND e.dimensions = ?
    WHERE e.turn_id IS NULL
      AND (
        (t.user_message IS NOT NULL AND length(trim(t.user_message)) > 0)
        OR (t.assistant_response IS NOT NULL AND length(trim(t.assistant_response)) > 0)
      )
    ORDER BY t.ts ASC
    LIMIT ?
  `);

  return stmt.all(model.name, model.dimensions, limit);
}

/**
 * Get turns with errors for retry
 * @param {Object} model - { name, dimensions }
 * @param {number} limit
 * @returns {Array}
 */
export function getErrorTurns(model, limit = 100) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      t.id,
      t.session_id,
      COALESCE(t.user_message, '') || ' ' || COALESCE(t.assistant_response, '') as content,
      t.ts,
      e.error
    FROM turns t
    JOIN turn_embeddings e ON e.turn_id = t.id
    WHERE e.model = ? AND e.dimensions = ? AND e.status = 'error'
    ORDER BY t.ts ASC
    LIMIT ?
  `);

  return stmt.all(model.name, model.dimensions, limit);
}

/**
 * Upsert an embedding
 * @param {Object} row
 */
export function upsertEmbedding(row) {
  const db = getDb();

  const stmt = db.prepare(`
    INSERT INTO turn_embeddings
      (turn_id, model, dimensions, embedding, content_hash, status, error, created_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(turn_id) DO UPDATE SET
      model = excluded.model,
      dimensions = excluded.dimensions,
      embedding = excluded.embedding,
      content_hash = excluded.content_hash,
      status = excluded.status,
      error = excluded.error,
      created_at = excluded.created_at
  `);

  stmt.run(
    row.turn_id,
    row.model,
    row.dimensions,
    row.embedding,
    row.content_hash,
    row.status,
    row.error ?? null
  );
}

/**
 * Get a turn by ID
 * @param {string} turnId
 * @returns {Object|null}
 */
export function getTurnById(turnId) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT
      t.id,
      t.session_id,
      COALESCE(t.user_message, '') || ' ' || COALESCE(t.assistant_response, '') as content,
      t.user_message,
      t.assistant_response,
      t.ts,
      s.title as session_title
    FROM turns t
    JOIN sessions s ON t.session_id = s.id
    WHERE t.id = ?
    LIMIT 1
  `);

  return stmt.get(turnId) ?? null;
}

/**
 * Get turns by IDs
 * @param {string[]} turnIds
 * @returns {Array}
 */
export function getTurnsByIds(turnIds) {
  if (turnIds.length === 0) return [];

  const db = getDb();
  const placeholders = turnIds.map(() => '?').join(',');

  const stmt = db.prepare(`
    SELECT
      t.id,
      t.session_id,
      COALESCE(t.user_message, '') || ' ' || COALESCE(t.assistant_response, '') as content,
      t.user_message,
      t.assistant_response,
      t.ts,
      s.title as session_title,
      s.provider
    FROM turns t
    JOIN sessions s ON t.session_id = s.id
    WHERE t.id IN (${placeholders})
  `);

  return stmt.all(...turnIds);
}

/**
 * Iterate over all embeddings for a model
 * Generator function for memory efficiency
 * @param {Object} model - { name, dimensions }
 * @yields {{ turn_id: string, embedding: Buffer }}
 */
export function* iterEmbeddings(model) {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT turn_id, embedding
    FROM turn_embeddings
    WHERE model = ? AND dimensions = ? AND status = 'done'
  `);

  for (const row of stmt.iterate(model.name, model.dimensions)) {
    yield row;
  }
}

/**
 * Get embedding stats
 * @param {Object} model - { name, dimensions }
 * @returns {{ total: number, done: number, queued: number, error: number }}
 */
export function getEmbeddingStats(model) {
  const db = getDb();

  // Total turns with content
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM turns
    WHERE (user_message IS NOT NULL AND length(trim(user_message)) > 0)
       OR (assistant_response IS NOT NULL AND length(trim(assistant_response)) > 0)
  `);
  const total = totalStmt.get().count;

  // Embedding counts by status
  const statsStmt = db.prepare(`
    SELECT
      status,
      COUNT(*) as count
    FROM turn_embeddings
    WHERE model = ? AND dimensions = ?
    GROUP BY status
  `);

  const stats = { total, done: 0, queued: 0, error: 0 };
  for (const row of statsStmt.all(model.name, model.dimensions)) {
    stats[row.status] = row.count;
  }

  return stats;
}

/**
 * Get embedding stats for all models (model-agnostic)
 * @returns {{ total: number, done: number, queued: number, error: number, models: Object }}
 */
export function getAllEmbeddingStats() {
  const db = getDb();

  // Total turns with content
  const totalStmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM turns
    WHERE (user_message IS NOT NULL AND length(trim(user_message)) > 0)
       OR (assistant_response IS NOT NULL AND length(trim(assistant_response)) > 0)
  `);
  const total = totalStmt.get().count;

  // Embedding counts by status (all models)
  const statsStmt = db.prepare(`
    SELECT
      status,
      COUNT(*) as count
    FROM turn_embeddings
    GROUP BY status
  `);

  const stats = { total, done: 0, queued: 0, error: 0 };
  for (const row of statsStmt.all()) {
    stats[row.status] = row.count;
  }

  // Get breakdown by model
  const modelsStmt = db.prepare(`
    SELECT model, dimensions, COUNT(*) as count
    FROM turn_embeddings
    WHERE status = 'done'
    GROUP BY model, dimensions
  `);
  stats.models = {};
  for (const row of modelsStmt.all()) {
    stats.models[row.model] = { dimensions: row.dimensions, count: row.count };
  }

  return stats;
}

/**
 * Delete embeddings for a turn
 * @param {string} turnId
 */
export function deleteEmbedding(turnId) {
  const db = getDb();
  db.prepare('DELETE FROM turn_embeddings WHERE turn_id = ?').run(turnId);
}

/**
 * Clear all embeddings for a model
 * @param {Object} model - { name, dimensions }
 */
export function clearEmbeddings(model) {
  const db = getDb();
  db.prepare('DELETE FROM turn_embeddings WHERE model = ? AND dimensions = ?')
    .run(model.name, model.dimensions);
}
