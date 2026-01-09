/**
 * Project command - manage session projects
 *
 * Usage:
 *   rudi project list
 *   rudi project create "Project Name"
 *   rudi project rename <id> "New Name"
 *   rudi project delete <id>
 */

import { getDb, isDatabaseInitialized } from '@learnrudi/db';

export async function cmdProject(args, flags) {
  const subcommand = args[0];

  switch (subcommand) {
    case 'list':
    case 'ls':
      projectList(flags);
      break;

    case 'create':
    case 'add':
      projectCreate(args.slice(1), flags);
      break;

    case 'rename':
      projectRename(args.slice(1), flags);
      break;

    case 'delete':
    case 'rm':
      projectDelete(args.slice(1), flags);
      break;

    default:
      console.log(`
rudi project - Manage session projects

COMMANDS
  list                         List all projects
  create <name>                Create a new project
  rename <id> <new-name>       Rename a project
  delete <id>                  Delete a project (sessions become unassigned)

OPTIONS
  --provider <name>            Provider (claude, codex, gemini). Default: claude

EXAMPLES
  rudi project list
  rudi project create "RUDI CLI"
  rudi project rename proj-rudi "RUDI Tooling"
  rudi project delete proj-old
`);
  }
}

function projectList(flags) {
  if (!isDatabaseInitialized()) {
    console.log('Database not initialized. Run: rudi db init');
    return;
  }

  const db = getDb();
  const provider = flags.provider;

  let query = `
    SELECT
      p.id, p.provider, p.name, p.color, p.created_at,
      COUNT(s.id) as session_count,
      ROUND(SUM(s.total_cost), 2) as total_cost
    FROM projects p
    LEFT JOIN sessions s ON s.project_id = p.id
  `;

  if (provider) {
    query += ` WHERE p.provider = '${provider}'`;
  }

  query += ` GROUP BY p.id ORDER BY total_cost DESC`;

  const projects = db.prepare(query).all();

  if (projects.length === 0) {
    console.log('No projects found.');
    console.log('\nCreate one with: rudi project create "My Project"');
    return;
  }

  console.log(`\nProjects (${projects.length}):\n`);

  for (const p of projects) {
    console.log(`${p.name}`);
    console.log(`  ID: ${p.id}`);
    console.log(`  Provider: ${p.provider}`);
    console.log(`  Sessions: ${p.session_count || 0}`);
    console.log(`  Total cost: $${p.total_cost || 0}`);
    console.log('');
  }
}

function projectCreate(args, flags) {
  if (!isDatabaseInitialized()) {
    console.log('Database not initialized. Run: rudi db init');
    return;
  }

  const name = args.join(' ');
  if (!name) {
    console.log('Error: Project name required');
    console.log('Usage: rudi project create "Project Name"');
    return;
  }

  const provider = flags.provider || 'claude';
  const id = `proj-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;

  const db = getDb();

  try {
    db.prepare(`
      INSERT INTO projects (id, provider, name, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(id, provider, name);

    console.log(`\nProject created:`);
    console.log(`  ID: ${id}`);
    console.log(`  Name: ${name}`);
    console.log(`  Provider: ${provider}`);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      console.log(`Error: Project "${name}" already exists for ${provider}`);
    } else {
      console.log(`Error: ${err.message}`);
    }
  }
}

function projectRename(args, flags) {
  if (!isDatabaseInitialized()) {
    console.log('Database not initialized.');
    return;
  }

  const [id, ...nameParts] = args;
  const newName = nameParts.join(' ');

  if (!id || !newName) {
    console.log('Error: Project ID and new name required');
    console.log('Usage: rudi project rename <id> "New Name"');
    return;
  }

  const db = getDb();
  const result = db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(newName, id);

  if (result.changes === 0) {
    console.log(`Project not found: ${id}`);
    return;
  }

  console.log(`\nProject renamed to: ${newName}`);
}

function projectDelete(args, flags) {
  if (!isDatabaseInitialized()) {
    console.log('Database not initialized.');
    return;
  }

  const id = args[0];
  if (!id) {
    console.log('Error: Project ID required');
    console.log('Usage: rudi project delete <id>');
    return;
  }

  const db = getDb();

  // Check if project exists
  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(id);
  if (!project) {
    console.log(`Project not found: ${id}`);
    return;
  }

  // Unassign sessions
  const sessionsResult = db.prepare('UPDATE sessions SET project_id = NULL WHERE project_id = ?').run(id);

  // Delete project
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);

  console.log(`\nProject deleted: ${project.name}`);
  if (sessionsResult.changes > 0) {
    console.log(`Unassigned ${sessionsResult.changes} sessions`);
  }
}
