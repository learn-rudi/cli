import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@learnrudi/env';

const LAUNCH_ID_PATTERN = /^launch_[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const OWNERSHIP_MARKER = '.rudi-agent-launch.json';
const EVENTS_FILE = 'events.jsonl';
const STDERR_FILE = 'stderr.log';
const MAX_EVENT_BYTES = 1024 * 1024;
const MAX_EVENT_PAGE_BYTES = 10 * 1024 * 1024;

export function assertLaunchId(launchId) {
  if (typeof launchId !== 'string' || !LAUNCH_ID_PATTERN.test(launchId)) {
    throw new Error('Invalid launch ID');
  }
  return launchId;
}

export function getAgentHostPaths({
  launchId = null,
  rudiHome = PATHS.home,
} = {}) {
  const home = path.resolve(rudiHome);
  const stateDirectory = path.join(home, 'state');
  const artifactsRoot = path.join(home, 'artifacts', 'agent-launches');
  const result = {
    artifactsRoot,
    stateDatabase: path.join(stateDirectory, 'agent-hosts.db'),
    stateDirectory,
  };

  if (launchId != null) {
    assertLaunchId(launchId);
    result.launchDirectory = path.join(artifactsRoot, launchId);
    result.workspaceDirectory = path.join(result.launchDirectory, 'workspace');
  }

  return result;
}

export function ensureLaunchArtifacts(options = {}) {
  const paths = getAgentHostPaths(options);
  if (!paths.launchDirectory) {
    throw new Error('launchId is required to create launch artifacts');
  }
  fs.mkdirSync(paths.launchDirectory, { recursive: true, mode: 0o700 });
  return paths;
}

export function getLaunchArtifactFiles(launchDirectory) {
  const directory = path.resolve(launchDirectory);
  return Object.freeze({
    events: path.join(directory, EVENTS_FILE),
    marker: path.join(directory, OWNERSHIP_MARKER),
    stderr: path.join(directory, STDERR_FILE),
  });
}

export function createLaunchOwnershipMarker({ launchDirectory, launchId }) {
  assertLaunchId(launchId);
  const directory = path.resolve(launchDirectory);
  const stat = fs.statSync(directory);
  if (!stat.isDirectory()) throw new Error(`Launch artifact path is not a directory: ${directory}`);
  const { marker } = getLaunchArtifactFiles(directory);
  const payload = `${JSON.stringify({ launchId, schemaVersion: 1 })}\n`;
  const handle = fs.openSync(marker, 'wx', 0o600);
  try {
    fs.writeFileSync(handle, payload, 'utf8');
  } finally {
    fs.closeSync(handle);
  }
  return marker;
}

export function assertOwnedLaunchDirectory({ launchDirectory, launchId }) {
  assertLaunchId(launchId);
  const directory = path.resolve(launchDirectory);
  const { marker } = getLaunchArtifactFiles(directory);
  let parsed;
  try {
    const stat = fs.lstatSync(marker);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('marker is not a regular file');
    parsed = JSON.parse(fs.readFileSync(marker, 'utf8'));
  } catch (error) {
    throw new Error(`Launch artifact ownership marker is invalid: ${error.message}`);
  }
  if (parsed?.schemaVersion !== 1 || parsed?.launchId !== launchId) {
    throw new Error(`Launch artifact ownership marker does not match ${launchId}`);
  }
  return directory;
}

export function appendLaunchEvent(eventFile, event) {
  const serialized = `${JSON.stringify(event)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > MAX_EVENT_BYTES) {
    throw new Error(`Agent event exceeds ${MAX_EVENT_BYTES} bytes`);
  }
  const file = path.resolve(eventFile);
  const handle = fs.openSync(file, 'a', 0o600);
  try {
    fs.writeFileSync(handle, serialized, 'utf8');
  } finally {
    fs.closeSync(handle);
  }
  fs.chmodSync(file, 0o600);
}

export function readLaunchEvents({ eventFile, limitBytes = 1024 * 1024, offset = 0 }) {
  const file = path.resolve(eventFile);
  const validOffset = Number(offset);
  const validLimit = Number(limitBytes);
  if (!Number.isSafeInteger(validOffset) || validOffset < 0) {
    throw new Error('event offset must be a non-negative integer');
  }
  if (!Number.isSafeInteger(validLimit) || validLimit < 1 || validLimit > MAX_EVENT_PAGE_BYTES) {
    throw new Error(`event limitBytes must be between 1 and ${MAX_EVENT_PAGE_BYTES}`);
  }

  let stat;
  try {
    stat = fs.statSync(file);
  } catch (error) {
    if (error.code === 'ENOENT') return { data: '', eof: true, nextOffset: validOffset };
    throw error;
  }
  if (!stat.isFile()) throw new Error(`Agent event path is not a file: ${file}`);
  if (validOffset > stat.size) throw new Error('event offset exceeds file size');
  if (validOffset === stat.size) return { data: '', eof: true, nextOffset: validOffset };

  const remaining = stat.size - validOffset;
  // Pages end on a JSONL boundary so offsets never bisect UTF-8 or JSON. When
  // one valid event is larger than the requested page, read through that one
  // event (appendLaunchEvent caps it at MAX_EVENT_BYTES).
  const bytesToRead = Math.min(remaining, validLimit + MAX_EVENT_BYTES);
  const buffer = Buffer.allocUnsafe(bytesToRead);
  const handle = fs.openSync(file, 'r');
  let bytesRead;
  try {
    bytesRead = fs.readSync(handle, buffer, 0, bytesToRead, validOffset);
  } finally {
    fs.closeSync(handle);
  }
  let pageBytes = bytesRead;
  if (remaining > validLimit) {
    const beforeLimit = buffer.lastIndexOf(0x0a, Math.min(validLimit - 1, bytesRead - 1));
    if (beforeLimit >= 0) {
      pageBytes = beforeLimit + 1;
    } else {
      const afterLimit = buffer.indexOf(0x0a, Math.min(validLimit, bytesRead));
      if (afterLimit < 0) throw new Error(`Agent event exceeds ${MAX_EVENT_BYTES} bytes`);
      pageBytes = afterLimit + 1;
    }
  }
  const page = buffer.subarray(0, pageBytes);
  return {
    data: page.toString('utf8'),
    eof: validOffset + pageBytes >= stat.size,
    nextOffset: validOffset + pageBytes,
  };
}
