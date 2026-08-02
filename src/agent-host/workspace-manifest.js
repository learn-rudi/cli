import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const WORKSPACE_BASELINE_FILE = 'workspace-base.json';

function shouldSkip(relativePath) {
  const first = relativePath.split(path.sep)[0];
  return first === '.git' || first === '.rudi';
}

function portablePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function createWorkspaceManifest(rootDirectory) {
  const root = fs.realpathSync(path.resolve(rootDirectory));
  const entries = {};

  function visit(directory, prefix = '') {
    const children = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const relative = prefix ? path.join(prefix, child.name) : child.name;
      if (shouldSkip(relative)) continue;
      const absolute = path.join(directory, child.name);
      const stat = fs.lstatSync(absolute);
      const key = portablePath(relative);
      if (stat.isDirectory()) {
        entries[key] = { mode: stat.mode & 0o777, type: 'directory' };
        visit(absolute, relative);
      } else if (stat.isFile()) {
        entries[key] = {
          hash: hashFile(absolute),
          mode: stat.mode & 0o777,
          size: stat.size,
          type: 'file',
        };
      } else if (stat.isSymbolicLink()) {
        entries[key] = {
          mode: stat.mode & 0o777,
          target: fs.readlinkSync(absolute),
          type: 'symlink',
        };
      } else {
        throw new Error(`Unsupported workspace entry type: ${absolute}`);
      }
    }
  }

  visit(root);
  return { entries, schemaVersion: 1 };
}

export function writeWorkspaceBaseline({ launchDirectory, workspace }) {
  const destination = path.join(path.resolve(launchDirectory), WORKSPACE_BASELINE_FILE);
  const manifest = createWorkspaceManifest(workspace);
  const handle = fs.openSync(destination, 'wx', 0o600);
  try {
    fs.writeFileSync(handle, `${JSON.stringify(manifest)}\n`, 'utf8');
  } finally {
    fs.closeSync(handle);
  }
  return destination;
}

export function readWorkspaceBaseline(launchDirectory) {
  const file = path.join(path.resolve(launchDirectory), WORKSPACE_BASELINE_FILE);
  let parsed;
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('baseline is not a regular file');
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Isolated workspace baseline is unavailable: ${error.message}`);
  }
  if (parsed?.schemaVersion !== 1 || !parsed.entries || typeof parsed.entries !== 'object') {
    throw new Error('Isolated workspace baseline has an unsupported schema');
  }
  return parsed;
}

function sameEntry(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

export function compareWorkspaceManifests(baseline, current) {
  const paths = new Set([
    ...Object.keys(baseline?.entries || {}),
    ...Object.keys(current?.entries || {}),
  ]);
  const changes = [];
  for (const relativePath of [...paths].sort()) {
    const before = baseline.entries[relativePath];
    const after = current.entries[relativePath];
    if (sameEntry(before, after)) continue;
    changes.push({
      after: after || null,
      before: before || null,
      path: relativePath,
      status: before == null ? 'added' : after == null ? 'deleted' : 'modified',
    });
  }
  return changes;
}

export function workspaceManifestsEqual(left, right) {
  return compareWorkspaceManifests(left, right).length === 0;
}
