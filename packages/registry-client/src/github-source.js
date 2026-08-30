import fs from 'node:fs';
import path from 'node:path';

const GITHUB_HOST = 'github.com';
const GITHUB_API_HOST = 'api.github.com';
const GITHUB_RAW_HOST = 'raw.githubusercontent.com';
const FULL_COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const REPOSITORY_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]+$/;

function decodePathSegment(segment) {
  let decoded;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new Error('Invalid GitHub tree URL encoding');
  }
  if (
    !decoded ||
    decoded === '.' ||
    decoded === '..' ||
    decoded.includes('/') ||
    decoded.includes('\\') ||
    decoded.includes('\0')
  ) {
    throw new Error('Invalid GitHub tree URL path');
  }
  return decoded;
}

function encodeRepositoryPath(value) {
  return value.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function normalizeRepositoryPath(value, label = 'GitHub repository path') {
  if (typeof value !== 'string' || !value) {
    throw new Error(`${label} is required`);
  }
  const normalized = value.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (
    normalized.startsWith('/') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\0'))
  ) {
    throw new Error(`Invalid ${label}`);
  }
  return segments.join('/');
}

function assertRawUrlPath(value) {
  const authorityEnd = value.indexOf('/', 'https://'.length);
  const rawPath = authorityEnd === -1
    ? ''
    : value.slice(authorityEnd).split(/[?#]/, 1)[0];
  for (const segment of rawPath.split('/')) {
    if (!segment) continue;
    decodePathSegment(segment);
  }
}

export function parseGitHubTreeUrl(value) {
  const rawValue = String(value || '');
  assertRawUrlPath(rawValue);
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error('Invalid GitHub tree URL');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== GITHUB_HOST ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('GitHub tree URL must use exact public HTTPS github.com form');
  }

  const segments = url.pathname.split('/').filter(Boolean).map(decodePathSegment);
  if (
    segments.length < 5 ||
    segments[2] !== 'tree' ||
    !REPOSITORY_SEGMENT_PATTERN.test(segments[0]) ||
    !REPOSITORY_SEGMENT_PATTERN.test(segments[1])
  ) {
    throw new Error('Expected https://github.com/<owner>/<repo>/tree/<ref>/<stack-path>');
  }

  return {
    requestedUrl: `https://${GITHUB_HOST}/${segments.map(encodeURIComponent).join('/')}`,
    owner: segments[0],
    repo: segments[1],
    refAndPath: segments.slice(3),
  };
}

function githubHeaders() {
  return {
    'User-Agent': 'rudi-cli/2.0',
    Accept: 'application/vnd.github+json',
  };
}

function assertPinnedGitHubSource(source) {
  if (
    !source ||
    source.type !== 'github' ||
    !REPOSITORY_SEGMENT_PATTERN.test(source.owner || '') ||
    !REPOSITORY_SEGMENT_PATTERN.test(source.repo || '') ||
    source.repository !== `${source.owner}/${source.repo}` ||
    !FULL_COMMIT_PATTERN.test(source.resolvedCommit || '')
  ) {
    throw new Error('Invalid pinned GitHub source');
  }
  return {
    ...source,
    resolvedCommit: source.resolvedCommit.toLowerCase(),
    path: normalizeRepositoryPath(source.path),
  };
}

function createContentsUrl(source, repositoryPath) {
  return `https://${GITHUB_API_HOST}/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/contents/${encodeRepositoryPath(repositoryPath)}?ref=${source.resolvedCommit}`;
}

function createTreeUrl(source) {
  return `https://${GITHUB_API_HOST}/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/git/trees/${source.resolvedCommit}?recursive=1`;
}

async function loadGitHubFileModes(source, repositoryPath, state) {
  const response = await state.fetch(createTreeUrl(source), { headers: githubHeaders() });
  if (!response.ok) {
    throw new Error(`Failed to read pinned GitHub tree metadata: HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!Array.isArray(body?.tree) || body.truncated) {
    throw new Error('Pinned GitHub tree metadata is missing or truncated');
  }

  const prefix = `${repositoryPath}/`;
  const modes = new Map();
  for (const item of body.tree) {
    if (typeof item?.path !== 'string') continue;
    const itemPath = normalizeRepositoryPath(item.path, 'GitHub tree entry path');
    if (!itemPath.startsWith(prefix)) continue;
    if (item.type === 'tree' && item.mode === '040000') continue;
    if (item.type !== 'blob' || !['100644', '100755'].includes(item.mode)) {
      throw new Error(`Unsupported GitHub package entry mode at ${itemPath}: ${item.mode || item.type || 'unknown'}`);
    }
    modes.set(itemPath, item.mode);
  }
  return modes;
}

function assertGitHubEntryName(name) {
  if (
    typeof name !== 'string' ||
    !name ||
    name === '.' ||
    name === '..' ||
    path.basename(name) !== name ||
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('\0')
  ) {
    throw new Error('Invalid GitHub package entry name');
  }
  return name;
}

function assertRawDownloadUrl(value, source, repositoryPath) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`GitHub file is missing a valid download URL: ${repositoryPath}`);
  }
  const expectedPath = `/${source.owner}/${source.repo}/${source.resolvedCommit}/${repositoryPath}`;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new Error(`GitHub file has an invalid download URL: ${repositoryPath}`);
  }
  if (
    url.protocol !== 'https:' ||
    url.hostname !== GITHUB_RAW_HOST ||
    decodedPath !== expectedPath ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash
  ) {
    throw new Error(`GitHub file URL does not match the pinned source: ${repositoryPath}`);
  }
  return url.toString();
}

function createRawFileUrl(source, repositoryPath) {
  return `https://${GITHUB_RAW_HOST}/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${source.resolvedCommit}/${encodeRepositoryPath(repositoryPath)}`;
}

export async function readGitHubTextFile(sourceValue, repositoryPathValue, options = {}) {
  const source = assertPinnedGitHubSource(sourceValue);
  const repositoryPath = normalizeRepositoryPath(repositoryPathValue);
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('GitHub file read requires fetch');
  }
  const response = await fetchImpl(createRawFileUrl(source, repositoryPath), {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    throw new Error(`GitHub package file not found: ${repositoryPath} (HTTP ${response.status})`);
  }
  const content = await response.text();
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  if (Buffer.byteLength(content) > maxBytes) {
    throw new Error(`GitHub package file exceeds maximum size of ${maxBytes} bytes`);
  }
  return content;
}

export async function readGitHubJsonFile(source, repositoryPath, options = {}) {
  const content = await readGitHubTextFile(source, repositoryPath, options);
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid GitHub package JSON ${repositoryPath}: ${error.message}`);
  }
}

export async function assertGitHubDirectoryFile(sourceValue, repositoryPathValue, fileNameValue, options = {}) {
  const source = assertPinnedGitHubSource(sourceValue);
  const repositoryPath = normalizeRepositoryPath(repositoryPathValue);
  const fileName = assertGitHubEntryName(fileNameValue);
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('GitHub directory validation requires fetch');
  }
  const response = await fetchImpl(createContentsUrl(source, repositoryPath), {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    throw new Error(`GitHub package directory not found: ${repositoryPath} (HTTP ${response.status})`);
  }
  const contents = await response.json();
  if (!Array.isArray(contents)) {
    throw new Error(`GitHub package path is not a directory: ${repositoryPath}`);
  }
  const item = contents.find((entry) => entry?.name === fileName);
  const expectedPath = `${repositoryPath}/${fileName}`;
  if (!item || item.type !== 'file' || item.path !== expectedPath) {
    throw new Error(`GitHub package directory is missing ${fileName}: ${repositoryPath}`);
  }
  assertRawDownloadUrl(item.download_url, source, expectedPath);
  return true;
}

async function downloadDirectoryRecursive(source, repositoryPath, destination, state, depth = 0) {
  if (depth > state.maxDepth) {
    throw new Error(`GitHub package exceeds maximum directory depth of ${state.maxDepth}`);
  }
  const response = await state.fetch(createContentsUrl(source, repositoryPath), {
    headers: githubHeaders(),
  });
  if (!response.ok) {
    throw new Error(`GitHub package directory not found: ${repositoryPath} (HTTP ${response.status})`);
  }
  const contents = await response.json();
  if (!Array.isArray(contents)) {
    throw new Error(`GitHub package path is not a directory: ${repositoryPath}`);
  }

  fs.mkdirSync(destination, { recursive: true });
  for (const item of contents) {
    const name = assertGitHubEntryName(item?.name);
    const itemPath = `${repositoryPath}/${name}`;
    if (item.path !== itemPath) {
      throw new Error(`GitHub package entry path mismatch: ${itemPath}`);
    }
    const itemDestination = path.join(destination, name);

    if (item.type === 'dir') {
      await downloadDirectoryRecursive(source, itemPath, itemDestination, state, depth + 1);
      continue;
    }
    if (item.type !== 'file') {
      throw new Error(`Unsupported GitHub package entry type: ${item.type || 'unknown'}`);
    }

    state.files += 1;
    if (state.files > state.maxFiles) {
      throw new Error(`GitHub package exceeds maximum file count of ${state.maxFiles}`);
    }
    const declaredSize = Number(item.size);
    if (!Number.isSafeInteger(declaredSize) || declaredSize < 0) {
      throw new Error(`GitHub package file has invalid size: ${itemPath}`);
    }
    if (state.bytes + declaredSize > state.maxBytes) {
      throw new Error(`GitHub package exceeds maximum size of ${state.maxBytes} bytes`);
    }

    const downloadUrl = assertRawDownloadUrl(item.download_url, source, itemPath);
    const fileResponse = await state.fetch(downloadUrl, { headers: githubHeaders() });
    if (!fileResponse.ok) {
      throw new Error(`Failed to download GitHub package file: ${itemPath} (HTTP ${fileResponse.status})`);
    }
    const content = Buffer.from(await fileResponse.arrayBuffer());
    if (state.bytes + content.length > state.maxBytes) {
      throw new Error(`GitHub package exceeds maximum size of ${state.maxBytes} bytes`);
    }
    state.bytes += content.length;
    const mode = state.fileModes.get(itemPath);
    if (!mode) {
      throw new Error(`Pinned GitHub tree metadata is missing file mode for ${itemPath}`);
    }
    const installedMode = mode === '100755' ? 0o755 : 0o644;
    fs.writeFileSync(itemDestination, content, {
      flag: 'wx',
      mode: installedMode,
    });
    fs.chmodSync(itemDestination, installedMode);
    state.fileModes.delete(itemPath);
    state.onProgress?.({ phase: 'downloading', file: itemPath });
  }
}

export async function downloadGitHubDirectory(sourceValue, repositoryPathValue, destination, options = {}) {
  const source = assertPinnedGitHubSource(sourceValue);
  const repositoryPath = normalizeRepositoryPath(repositoryPathValue);
  if (typeof destination !== 'string' || !path.isAbsolute(destination)) {
    throw new Error('GitHub package destination must be an absolute path');
  }
  if (fs.existsSync(destination)) {
    throw new Error(`GitHub package destination already exists: ${destination}`);
  }
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('GitHub package download requires fetch');
  }
  const state = {
    fetch: fetchImpl,
    onProgress: options.onProgress,
    files: 0,
    bytes: 0,
    maxDepth: options.maxDepth ?? 20,
    maxFiles: options.maxFiles ?? 2000,
    maxBytes: options.maxBytes ?? 100 * 1024 * 1024,
  };
  try {
    state.fileModes = await loadGitHubFileModes(source, repositoryPath, state);
    await downloadDirectoryRecursive(source, repositoryPath, destination, state);
    if (state.fileModes.size > 0) {
      const [missingPath] = state.fileModes.keys();
      throw new Error(`GitHub Contents response omitted pinned tree file: ${missingPath}`);
    }
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true });
    throw error;
  }
  return { path: destination, files: state.files, bytes: state.bytes };
}

async function resolveCommitCandidates(parsed, fetchImpl) {
  const candidates = [];
  for (let split = 1; split < parsed.refAndPath.length; split += 1) {
    const requestedRef = parsed.refAndPath.slice(0, split).join('/');
    const stackPath = parsed.refAndPath.slice(split).join('/');
    const commitUrl = `https://${GITHUB_API_HOST}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits/${encodeURIComponent(requestedRef)}`;
    const response = await fetchImpl(commitUrl, { headers: githubHeaders() });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`Unable to resolve public GitHub ref: HTTP ${response.status}`);
    }
    const body = await response.json();
    if (!FULL_COMMIT_PATTERN.test(body?.sha || '')) {
      throw new Error('GitHub commit response did not contain a full commit SHA');
    }
    candidates.push({ requestedRef, stackPath, resolvedCommit: body.sha.toLowerCase() });
  }
  if (candidates.length === 0) {
    throw new Error('Public GitHub ref not found');
  }
  return candidates;
}

function assertManifestEntry(contents, source) {
  if (!Array.isArray(contents)) {
    throw new Error(`GitHub stack path is not a directory: ${source.path}`);
  }
  const manifest = contents.find((item) => item?.name === 'manifest.json');
  if (!manifest || manifest.type !== 'file') {
    throw new Error(`GitHub stack path is missing manifest.json: ${source.path}`);
  }

  let downloadUrl;
  try {
    downloadUrl = new URL(manifest.download_url);
  } catch {
    throw new Error('GitHub manifest is missing a valid download URL');
  }
  const expectedPath = `/${source.owner}/${source.repo}/${source.resolvedCommit}/${source.path}/manifest.json`;
  if (
    downloadUrl.protocol !== 'https:' ||
    downloadUrl.hostname !== GITHUB_RAW_HOST ||
    decodeURIComponent(downloadUrl.pathname) !== expectedPath ||
    downloadUrl.search ||
    downloadUrl.hash
  ) {
    throw new Error('GitHub manifest download URL does not match the resolved source');
  }
}

export function isGitHubTreeUrl(value) {
  try {
    parseGitHubTreeUrl(value);
    return true;
  } catch {
    return false;
  }
}

export async function resolveGitHubTreeSource(value, options = {}) {
  const parsed = parseGitHubTreeUrl(value);
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('GitHub source resolution requires fetch');
  }

  const candidates = await resolveCommitCandidates(parsed, fetchImpl);
  const validSources = [];

  for (const resolved of candidates) {
    const source = {
      type: 'github',
      requestedUrl: parsed.requestedUrl,
      repository: `${parsed.owner}/${parsed.repo}`,
      owner: parsed.owner,
      repo: parsed.repo,
      requestedRef: resolved.requestedRef,
      resolvedCommit: resolved.resolvedCommit,
      path: resolved.stackPath,
    };
    const response = await fetchImpl(createContentsUrl(source, source.path), {
      headers: githubHeaders(),
    });
    if (response.status === 404) continue;
    if (!response.ok) {
      throw new Error(`GitHub stack path validation failed: HTTP ${response.status}`);
    }
    const contents = await response.json();
    if (
      !Array.isArray(contents) ||
      !contents.some((item) => item?.name === 'manifest.json' && item.type === 'file')
    ) {
      continue;
    }
    assertManifestEntry(contents, source);
    validSources.push(source);
  }

  if (validSources.length === 0) {
    throw new Error('GitHub tree URL did not resolve to a RUDI stack directory with manifest.json');
  }
  if (validSources.length > 1) {
    throw new Error(
      'Ambiguous GitHub tree URL: multiple ref/path interpretations contain RUDI stacks; use a full commit SHA in the URL'
    );
  }
  return validSources[0];
}
