#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/@learnrudi+env@1.0.0/node_modules/@learnrudi/env/src/index.js
function getPlatformArch() {
  const platform = import_os.default.platform();
  const arch = import_os.default.arch();
  const normalizedArch = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : arch;
  return `${platform}-${normalizedArch}`;
}
function getPlatform() {
  return import_os.default.platform();
}
function ensureDirectories() {
  const dirs = [
    PATHS.stacks,
    // MCP servers (google-ai, notion-workspace, etc.)
    PATHS.prompts,
    // Reusable prompts
    PATHS.runtimes,
    // Language runtimes (node, python, bun, deno)
    PATHS.binaries,
    // Utility binaries (ffmpeg, git, jq, etc.)
    PATHS.agents,
    // AI CLI agents (claude, codex, gemini, copilot)
    PATHS.bins,
    // Shims directory (Studio only)
    PATHS.locks,
    // Lock files
    PATHS.db,
    // Database directory
    PATHS.cache
    // Registry cache
  ];
  for (const dir of dirs) {
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
  }
}
function parsePackageId(id) {
  const match = id.match(/^(stack|prompt|runtime|binary|agent|npm):(.+)$/);
  if (!match) {
    throw new Error(`Invalid package ID: ${id} (expected format: kind:name, where kind is one of: ${PACKAGE_KINDS.join(", ")}, npm)`);
  }
  return [match[1], match[2]];
}
function createPackageId(kind, name) {
  return `${kind}:${name}`;
}
function getPackagePath(id) {
  const [kind, name] = parsePackageId(id);
  switch (kind) {
    case "stack":
      return import_path.default.join(PATHS.stacks, name);
    case "prompt":
      return import_path.default.join(PATHS.prompts, `${name}.md`);
    case "runtime":
      return import_path.default.join(PATHS.runtimes, name);
    case "binary":
      return import_path.default.join(PATHS.binaries, name);
    case "agent":
      return import_path.default.join(PATHS.agents, name);
    case "npm":
      const sanitized = name.replace(/\//g, "__").replace(/^@/, "");
      return import_path.default.join(PATHS.binaries, "npm", sanitized);
    default:
      throw new Error(`Unknown package kind: ${kind}`);
  }
}
function getLockfilePath(id) {
  const [kind, name] = parsePackageId(id);
  let lockName = name;
  if (kind === "npm") {
    lockName = name.replace(/\//g, "__").replace(/^@/, "");
  }
  const lockDir = kind === "binary" ? "binaries" : kind === "npm" ? "npms" : kind + "s";
  return import_path.default.join(PATHS.locks, lockDir, `${lockName}.lock.yaml`);
}
function isPackageInstalled(id) {
  const packagePath = getPackagePath(id);
  const [kind, name] = parsePackageId(id);
  if (kind === "prompt") {
    return import_fs.default.existsSync(packagePath) && import_fs.default.statSync(packagePath).isFile();
  }
  if (!import_fs.default.existsSync(packagePath)) {
    return false;
  }
  if (kind === "agent") {
    const binPath = import_path.default.join(packagePath, "node_modules", ".bin", name);
    return import_fs.default.existsSync(binPath);
  }
  try {
    const contents = import_fs.default.readdirSync(packagePath);
    return contents.length > 0;
  } catch {
    return false;
  }
}
function getInstalledPackages(kind) {
  const dir = {
    stack: PATHS.stacks,
    prompt: PATHS.prompts,
    runtime: PATHS.runtimes,
    binary: PATHS.binaries,
    agent: PATHS.agents
  }[kind];
  if (!dir || !import_fs.default.existsSync(dir)) {
    return [];
  }
  if (kind === "prompt") {
    return import_fs.default.readdirSync(dir).filter((name) => {
      if (!name.endsWith(".md") || name.startsWith(".")) return false;
      const stat = import_fs.default.statSync(import_path.default.join(dir, name));
      return stat.isFile();
    }).map((name) => name.replace(/\.md$/, ""));
  }
  return import_fs.default.readdirSync(dir).filter((name) => {
    const stat = import_fs.default.statSync(import_path.default.join(dir, name));
    return stat.isDirectory() && !name.startsWith(".");
  });
}
var import_path, import_os, import_fs, RUDI_HOME, PATHS, PACKAGE_KINDS;
var init_src = __esm({
  "node_modules/.pnpm/@learnrudi+env@1.0.0/node_modules/@learnrudi/env/src/index.js"() {
    import_path = __toESM(require("path"), 1);
    import_os = __toESM(require("os"), 1);
    import_fs = __toESM(require("fs"), 1);
    RUDI_HOME = import_path.default.join(import_os.default.homedir(), ".rudi");
    PATHS = {
      // Root
      home: RUDI_HOME,
      // Installed packages - shared with Studio for unified discovery
      packages: import_path.default.join(RUDI_HOME, "packages"),
      stacks: import_path.default.join(RUDI_HOME, "stacks"),
      // Shared with Studio
      prompts: import_path.default.join(RUDI_HOME, "prompts"),
      // Shared with Studio
      // Runtimes (interpreters: node, python, deno, bun)
      runtimes: import_path.default.join(RUDI_HOME, "runtimes"),
      // Binaries (utility CLIs: ffmpeg, imagemagick, ripgrep, etc.)
      binaries: import_path.default.join(RUDI_HOME, "binaries"),
      // Agents (AI CLI tools: claude, codex, gemini, copilot, ollama)
      agents: import_path.default.join(RUDI_HOME, "agents"),
      // Runtime binaries (content-addressed)
      store: import_path.default.join(RUDI_HOME, "store"),
      // Shims (symlinks to store/)
      bins: import_path.default.join(RUDI_HOME, "bins"),
      // Lockfiles
      locks: import_path.default.join(RUDI_HOME, "locks"),
      // Secrets (OS Keychain preferred, encrypted file fallback)
      vault: import_path.default.join(RUDI_HOME, "vault"),
      // Database (shared with Studio)
      db: RUDI_HOME,
      dbFile: import_path.default.join(RUDI_HOME, "rudi.db"),
      // Cache
      cache: import_path.default.join(RUDI_HOME, "cache"),
      registryCache: import_path.default.join(RUDI_HOME, "cache", "registry.json"),
      // Config
      config: import_path.default.join(RUDI_HOME, "config.json"),
      // Logs
      logs: import_path.default.join(RUDI_HOME, "logs")
    };
    PACKAGE_KINDS = ["stack", "prompt", "runtime", "binary", "agent"];
  }
});

// node_modules/.pnpm/@learnrudi+registry-client@1.0.1/node_modules/@learnrudi/registry-client/src/index.js
function getLocalRegistryPaths() {
  if (process.env.USE_LOCAL_REGISTRY !== "true") {
    return [];
  }
  return [
    import_path2.default.join(process.cwd(), "registry", "index.json"),
    import_path2.default.join(process.cwd(), "..", "registry", "index.json"),
    "/Users/hoff/dev/RUDI/registry/index.json"
  ];
}
async function fetchIndex(options = {}) {
  const { url = DEFAULT_REGISTRY_URL, force = false } = options;
  const localResult = getLocalIndex();
  if (localResult) {
    const { index: localIndex, mtime: localMtime } = localResult;
    const cacheMtime = getCacheMtime();
    if (force || !cacheMtime || localMtime > cacheMtime) {
      cacheIndex(localIndex);
      return localIndex;
    }
  }
  if (!force) {
    const cached = getCachedIndex();
    if (cached) {
      return cached;
    }
  }
  if (localResult) {
    return localResult.index;
  }
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "rudi-cli/2.0"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const index = await response.json();
    cacheIndex(index);
    return index;
  } catch (error) {
    const fallback = getLocalIndex();
    if (fallback) {
      return fallback.index;
    }
    throw new Error(`Failed to fetch registry: ${error.message}`);
  }
}
function getCachedIndex() {
  const cachePath = PATHS.registryCache;
  if (!import_fs2.default.existsSync(cachePath)) {
    return null;
  }
  try {
    const stat = import_fs2.default.statSync(cachePath);
    const age = Date.now() - stat.mtimeMs;
    if (age > CACHE_TTL) {
      return null;
    }
    return JSON.parse(import_fs2.default.readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}
function cacheIndex(index) {
  const cachePath = PATHS.registryCache;
  const cacheDir = import_path2.default.dirname(cachePath);
  if (!import_fs2.default.existsSync(cacheDir)) {
    import_fs2.default.mkdirSync(cacheDir, { recursive: true });
  }
  import_fs2.default.writeFileSync(cachePath, JSON.stringify(index, null, 2));
}
function getCacheMtime() {
  const cachePath = PATHS.registryCache;
  if (!import_fs2.default.existsSync(cachePath)) {
    return null;
  }
  try {
    return import_fs2.default.statSync(cachePath).mtimeMs;
  } catch {
    return null;
  }
}
function getLocalIndex() {
  for (const localPath of getLocalRegistryPaths()) {
    if (import_fs2.default.existsSync(localPath)) {
      try {
        const index = JSON.parse(import_fs2.default.readFileSync(localPath, "utf-8"));
        const mtime = import_fs2.default.statSync(localPath).mtimeMs;
        return { index, mtime };
      } catch {
        continue;
      }
    }
  }
  return null;
}
function clearCache() {
  if (import_fs2.default.existsSync(PATHS.registryCache)) {
    import_fs2.default.unlinkSync(PATHS.registryCache);
  }
}
function getKindSection(kind) {
  return KIND_PLURALS[kind] || `${kind}s`;
}
async function searchPackages(query, options = {}) {
  const { kind } = options;
  const index = await fetchIndex();
  const results = [];
  const queryLower = query.toLowerCase();
  const kinds = kind ? [kind] : PACKAGE_KINDS2;
  for (const k of kinds) {
    const section = index.packages?.[getKindSection(k)];
    if (!section) continue;
    const packages = [...section.official || [], ...section.community || []];
    for (const pkg of packages) {
      if (matchesQuery(pkg, queryLower)) {
        results.push({ ...pkg, kind: k });
      }
    }
  }
  return results;
}
function matchesQuery(pkg, query) {
  const searchable = [
    pkg.id || "",
    pkg.name || "",
    pkg.description || "",
    ...pkg.tags || []
  ].join(" ").toLowerCase();
  return searchable.includes(query);
}
async function getPackage(id) {
  const index = await fetchIndex();
  const [kind, name] = id.includes(":") ? id.split(":") : [null, id];
  const kinds = kind ? [kind] : PACKAGE_KINDS2;
  for (const k of kinds) {
    const section = index.packages?.[getKindSection(k)];
    if (!section) continue;
    const packages = [...section.official || [], ...section.community || []];
    for (const pkg of packages) {
      const kindPrefixPattern = new RegExp(`^(${PACKAGE_KINDS2.join("|")}):`);
      const pkgShortId = pkg.id?.replace(kindPrefixPattern, "") || "";
      if (pkgShortId === name || pkg.id === id) {
        return { ...pkg, kind: k };
      }
    }
  }
  return null;
}
async function getManifest(pkg) {
  if (!pkg || !pkg.path) {
    return null;
  }
  const manifestPath = pkg.path;
  if (process.env.USE_LOCAL_REGISTRY === "true") {
    const localPaths = [
      import_path2.default.join(process.cwd(), "registry", manifestPath),
      import_path2.default.join(process.cwd(), "..", "registry", manifestPath),
      `/Users/hoff/dev/RUDI/registry/${manifestPath}`
    ];
    for (const localPath of localPaths) {
      if (import_fs2.default.existsSync(localPath)) {
        try {
          const content = import_fs2.default.readFileSync(localPath, "utf-8");
          return JSON.parse(content);
        } catch (err) {
        }
      }
    }
  }
  try {
    const url = `${GITHUB_RAW_BASE}/${manifestPath}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "rudi-cli/2.0"
      }
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (err) {
    return null;
  }
}
async function listPackages(kind) {
  const index = await fetchIndex();
  const section = index.packages?.[getKindSection(kind)];
  if (!section) return [];
  return [...section.official || [], ...section.community || []];
}
async function downloadPackage(pkg, destPath, options = {}) {
  const { onProgress } = options;
  const registryPath = pkg.path;
  if (!import_fs2.default.existsSync(destPath)) {
    import_fs2.default.mkdirSync(destPath, { recursive: true });
  }
  onProgress?.({ phase: "downloading", package: pkg.name || pkg.id });
  if (pkg.kind === "stack" || registryPath.includes("/stacks/")) {
    await downloadStackFromGitHub(registryPath, destPath, onProgress);
    return { success: true, path: destPath };
  }
  if (registryPath.endsWith(".md")) {
    const url = `${GITHUB_RAW_BASE}/${registryPath}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (!response.ok) {
      throw new Error(`Failed to download ${registryPath}: HTTP ${response.status}`);
    }
    const content = await response.text();
    const destDir = import_path2.default.dirname(destPath);
    if (!import_fs2.default.existsSync(destDir)) {
      import_fs2.default.mkdirSync(destDir, { recursive: true });
    }
    import_fs2.default.writeFileSync(destPath, content);
    return { success: true, path: destPath };
  }
  throw new Error(`Unsupported package type: ${registryPath}`);
}
async function downloadStackFromGitHub(registryPath, destPath, onProgress) {
  const baseUrl = `${GITHUB_RAW_BASE}/${registryPath}`;
  const apiUrl = `https://api.github.com/repos/learn-rudi/registry/contents/${registryPath}`;
  const listResponse = await fetch(apiUrl, {
    headers: {
      "User-Agent": "rudi-cli/2.0",
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (!listResponse.ok) {
    throw new Error(`Stack not found: ${registryPath}`);
  }
  const contents = await listResponse.json();
  if (!Array.isArray(contents)) {
    throw new Error(`Invalid stack directory: ${registryPath}`);
  }
  const existingItems = /* @__PURE__ */ new Map();
  for (const item of contents) {
    existingItems.set(item.name, item);
  }
  const manifestItem = existingItems.get("manifest.json");
  if (!manifestItem) {
    throw new Error(`Stack missing manifest.json: ${registryPath}`);
  }
  const manifestResponse = await fetch(manifestItem.download_url, {
    headers: { "User-Agent": "rudi-cli/2.0" }
  });
  const manifest = await manifestResponse.json();
  import_fs2.default.writeFileSync(import_path2.default.join(destPath, "manifest.json"), JSON.stringify(manifest, null, 2));
  onProgress?.({ phase: "downloading", file: "manifest.json" });
  const pkgJsonItem = existingItems.get("package.json");
  if (pkgJsonItem) {
    const pkgJsonResponse = await fetch(pkgJsonItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (pkgJsonResponse.ok) {
      const pkgJson = await pkgJsonResponse.text();
      import_fs2.default.writeFileSync(import_path2.default.join(destPath, "package.json"), pkgJson);
      onProgress?.({ phase: "downloading", file: "package.json" });
    }
  }
  const envExampleItem = existingItems.get(".env.example");
  if (envExampleItem) {
    const envResponse = await fetch(envExampleItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (envResponse.ok) {
      const envContent = await envResponse.text();
      import_fs2.default.writeFileSync(import_path2.default.join(destPath, ".env.example"), envContent);
    }
  }
  const tsconfigItem = existingItems.get("tsconfig.json");
  if (tsconfigItem) {
    const tsconfigResponse = await fetch(tsconfigItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (tsconfigResponse.ok) {
      const tsconfig = await tsconfigResponse.text();
      import_fs2.default.writeFileSync(import_path2.default.join(destPath, "tsconfig.json"), tsconfig);
    }
  }
  const requirementsItem = existingItems.get("requirements.txt");
  if (requirementsItem) {
    const reqResponse = await fetch(requirementsItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (reqResponse.ok) {
      const requirements = await reqResponse.text();
      import_fs2.default.writeFileSync(import_path2.default.join(destPath, "requirements.txt"), requirements);
    }
  }
  const sourceDirs = ["src", "dist", "node", "python", "lib"];
  for (const dirName of sourceDirs) {
    const dirItem = existingItems.get(dirName);
    if (dirItem && dirItem.type === "dir") {
      onProgress?.({ phase: "downloading", directory: dirName });
      await downloadDirectoryFromGitHub(
        `${baseUrl}/${dirName}`,
        import_path2.default.join(destPath, dirName),
        onProgress
      );
    }
  }
}
async function downloadDirectoryFromGitHub(dirUrl, destDir, onProgress) {
  const apiUrl = dirUrl.replace("https://raw.githubusercontent.com/", "https://api.github.com/repos/").replace("/main/", "/contents/");
  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!response.ok) {
      return;
    }
    const contents = await response.json();
    if (!Array.isArray(contents)) {
      return;
    }
    if (!import_fs2.default.existsSync(destDir)) {
      import_fs2.default.mkdirSync(destDir, { recursive: true });
    }
    for (const item of contents) {
      if (item.type === "file") {
        const fileResponse = await fetch(item.download_url, {
          headers: { "User-Agent": "rudi-cli/2.0" }
        });
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          import_fs2.default.writeFileSync(import_path2.default.join(destDir, item.name), content);
          onProgress?.({ phase: "downloading", file: item.name });
        }
      } else if (item.type === "dir") {
        await downloadDirectoryFromGitHub(
          item.url.replace("https://api.github.com/repos/", "https://raw.githubusercontent.com/").replace("/contents/", "/main/"),
          import_path2.default.join(destDir, item.name),
          onProgress
        );
      }
    }
  } catch (error) {
    console.error(`Warning: Could not download ${dirUrl}: ${error.message}`);
  }
}
async function downloadRuntime(runtime, version, destPath, options = {}) {
  const { onProgress } = options;
  const platformArch = getPlatformArch();
  const shortVersion = version.replace(/\.x$/, "").replace(/\.0$/, "");
  const filename = `${runtime}-${shortVersion}-${platformArch}.tar.gz`;
  const url = `${RUNTIMES_DOWNLOAD_BASE}/${RUNTIMES_RELEASE_VERSION}/${filename}`;
  onProgress?.({ phase: "downloading", runtime, version, url });
  const tempDir = import_path2.default.join(PATHS.cache, "downloads");
  if (!import_fs2.default.existsSync(tempDir)) {
    import_fs2.default.mkdirSync(tempDir, { recursive: true });
  }
  const tempFile = import_path2.default.join(tempDir, filename);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/octet-stream"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to download ${runtime}: HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    import_fs2.default.writeFileSync(tempFile, Buffer.from(buffer));
    onProgress?.({ phase: "extracting", runtime, version });
    if (import_fs2.default.existsSync(destPath)) {
      import_fs2.default.rmSync(destPath, { recursive: true });
    }
    import_fs2.default.mkdirSync(destPath, { recursive: true });
    const { execSync: execSync10 } = await import("child_process");
    execSync10(`tar -xzf "${tempFile}" -C "${destPath}" --strip-components=1`, {
      stdio: "pipe"
    });
    import_fs2.default.unlinkSync(tempFile);
    import_fs2.default.writeFileSync(
      import_path2.default.join(destPath, "runtime.json"),
      JSON.stringify({
        runtime,
        version,
        platformArch,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: url
      }, null, 2)
    );
    onProgress?.({ phase: "complete", runtime, version, path: destPath });
    return { success: true, path: destPath };
  } catch (error) {
    if (import_fs2.default.existsSync(tempFile)) {
      import_fs2.default.unlinkSync(tempFile);
    }
    throw new Error(`Failed to install ${runtime} ${version}: ${error.message}`);
  }
}
async function downloadTool(toolName, destPath, options = {}) {
  const { onProgress } = options;
  const platformArch = getPlatformArch();
  const toolManifest = await loadToolManifest(toolName);
  if (!toolManifest) {
    throw new Error(`Binary manifest not found for: ${toolName}`);
  }
  const tempDir = import_path2.default.join(PATHS.cache, "downloads");
  if (!import_fs2.default.existsSync(tempDir)) {
    import_fs2.default.mkdirSync(tempDir, { recursive: true });
  }
  if (import_fs2.default.existsSync(destPath)) {
    import_fs2.default.rmSync(destPath, { recursive: true });
  }
  import_fs2.default.mkdirSync(destPath, { recursive: true });
  const { execSync: execSync10 } = await import("child_process");
  const downloads = toolManifest.downloads?.[platformArch];
  if (downloads && Array.isArray(downloads)) {
    const downloadedUrls = /* @__PURE__ */ new Set();
    for (const download of downloads) {
      const { url, type, binary } = download;
      if (downloadedUrls.has(url)) {
        await extractBinaryFromPath(destPath, binary, destPath);
        continue;
      }
      onProgress?.({ phase: "downloading", tool: toolName, binary: import_path2.default.basename(binary), url });
      const urlFilename = import_path2.default.basename(new URL(url).pathname);
      const tempFile = import_path2.default.join(tempDir, urlFilename);
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "rudi-cli/2.0",
            "Accept": "application/octet-stream"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to download ${binary}: HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        import_fs2.default.writeFileSync(tempFile, Buffer.from(buffer));
        downloadedUrls.add(url);
        onProgress?.({ phase: "extracting", tool: toolName, binary: import_path2.default.basename(binary) });
        const archiveType = type || guessArchiveType(urlFilename);
        if (archiveType === "zip") {
          execSync10(`unzip -o "${tempFile}" -d "${destPath}"`, { stdio: "pipe" });
        } else if (archiveType === "tar.xz") {
          execSync10(`tar -xJf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
        } else if (archiveType === "tar.gz" || archiveType === "tgz") {
          execSync10(`tar -xzf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
        } else {
          throw new Error(`Unsupported archive type: ${archiveType}`);
        }
        await extractBinaryFromPath(destPath, binary, destPath);
        import_fs2.default.unlinkSync(tempFile);
      } catch (error) {
        if (import_fs2.default.existsSync(tempFile)) {
          import_fs2.default.unlinkSync(tempFile);
        }
        throw error;
      }
    }
    const binaries = toolManifest.binaries || [toolName];
    for (const bin of binaries) {
      const binPath = import_path2.default.join(destPath, bin);
      if (import_fs2.default.existsSync(binPath)) {
        import_fs2.default.chmodSync(binPath, 493);
      }
    }
  } else {
    const upstreamUrl = toolManifest.upstream?.[platformArch];
    if (!upstreamUrl) {
      throw new Error(`No upstream URL for ${toolName} on ${platformArch}`);
    }
    const extractConfig = toolManifest.extract?.[platformArch] || toolManifest.extract?.default;
    if (!extractConfig) {
      throw new Error(`No extract config for ${toolName} on ${platformArch}`);
    }
    onProgress?.({ phase: "downloading", tool: toolName, url: upstreamUrl });
    const urlFilename = import_path2.default.basename(new URL(upstreamUrl).pathname);
    const tempFile = import_path2.default.join(tempDir, urlFilename);
    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "rudi-cli/2.0",
          "Accept": "application/octet-stream"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to download ${toolName}: HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      import_fs2.default.writeFileSync(tempFile, Buffer.from(buffer));
      onProgress?.({ phase: "extracting", tool: toolName });
      const archiveType = extractConfig.type || guessArchiveType(urlFilename);
      const stripComponents = extractConfig.strip || 0;
      const stripFlag = stripComponents > 0 ? ` --strip-components=${stripComponents}` : "";
      if (archiveType === "zip") {
        execSync10(`unzip -o "${tempFile}" -d "${destPath}"`, { stdio: "pipe" });
      } else if (archiveType === "tar.xz") {
        execSync10(`tar -xJf "${tempFile}" -C "${destPath}"${stripFlag}`, { stdio: "pipe" });
      } else if (archiveType === "tar.gz" || archiveType === "tgz") {
        execSync10(`tar -xzf "${tempFile}" -C "${destPath}"${stripFlag}`, { stdio: "pipe" });
      } else {
        throw new Error(`Unsupported archive type: ${archiveType}`);
      }
      await extractBinaryFromPath(destPath, extractConfig.binary || toolName, destPath);
      const binaries = [toolName, ...toolManifest.additionalBinaries || []];
      for (const bin of binaries) {
        const binPath = import_path2.default.join(destPath, bin);
        if (import_fs2.default.existsSync(binPath)) {
          import_fs2.default.chmodSync(binPath, 493);
        }
      }
      import_fs2.default.unlinkSync(tempFile);
    } catch (error) {
      if (import_fs2.default.existsSync(tempFile)) {
        import_fs2.default.unlinkSync(tempFile);
      }
      throw new Error(`Failed to install ${toolName}: ${error.message}`);
    }
  }
  import_fs2.default.writeFileSync(
    import_path2.default.join(destPath, "manifest.json"),
    JSON.stringify({
      id: `binary:${toolName}`,
      kind: "binary",
      name: toolManifest.name || toolName,
      version: toolManifest.version,
      binaries: toolManifest.bins || toolManifest.binaries || [toolName],
      platformArch,
      installedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2)
  );
  onProgress?.({ phase: "complete", tool: toolName, path: destPath });
  return { success: true, path: destPath };
}
async function extractBinaryFromPath(extractedPath, binaryPattern, destPath) {
  const directPath = import_path2.default.join(destPath, import_path2.default.basename(binaryPattern));
  if (!binaryPattern.includes("/") && !binaryPattern.includes("*")) {
    if (import_fs2.default.existsSync(directPath)) {
      return;
    }
  }
  if (binaryPattern.includes("*") || binaryPattern.includes("/")) {
    const parts = binaryPattern.split("/");
    let currentPath = extractedPath;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes("*")) {
        if (!import_fs2.default.existsSync(currentPath)) break;
        const entries = import_fs2.default.readdirSync(currentPath);
        const pattern = new RegExp("^" + part.replace(/\*/g, ".*") + "$");
        const match = entries.find((e) => pattern.test(e));
        if (match) {
          currentPath = import_path2.default.join(currentPath, match);
        } else {
          break;
        }
      } else {
        currentPath = import_path2.default.join(currentPath, part);
      }
    }
    if (import_fs2.default.existsSync(currentPath) && currentPath !== destPath) {
      const finalPath = import_path2.default.join(destPath, import_path2.default.basename(currentPath));
      if (currentPath !== finalPath && !import_fs2.default.existsSync(finalPath)) {
        import_fs2.default.renameSync(currentPath, finalPath);
      }
    }
  }
}
async function loadToolManifest(toolName) {
  for (const basePath of getLocalRegistryPaths()) {
    const registryDir = import_path2.default.dirname(basePath);
    const manifestPath = import_path2.default.join(registryDir, "catalog", "binaries", `${toolName}.json`);
    if (import_fs2.default.existsSync(manifestPath)) {
      try {
        return JSON.parse(import_fs2.default.readFileSync(manifestPath, "utf-8"));
      } catch {
        continue;
      }
    }
  }
  try {
    const url = `https://raw.githubusercontent.com/learn-rudi/registry/main/catalog/binaries/${toolName}.json`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/json"
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
  }
  return null;
}
function guessArchiveType(filename) {
  if (filename.endsWith(".tar.gz") || filename.endsWith(".tgz")) return "tar.gz";
  if (filename.endsWith(".tar.xz")) return "tar.xz";
  if (filename.endsWith(".zip")) return "zip";
  return "tar.gz";
}
var import_fs2, import_path2, DEFAULT_REGISTRY_URL, RUNTIMES_DOWNLOAD_BASE, CACHE_TTL, PACKAGE_KINDS2, KIND_PLURALS, GITHUB_RAW_BASE, RUNTIMES_RELEASE_VERSION;
var init_src2 = __esm({
  "node_modules/.pnpm/@learnrudi+registry-client@1.0.1/node_modules/@learnrudi/registry-client/src/index.js"() {
    import_fs2 = __toESM(require("fs"), 1);
    import_path2 = __toESM(require("path"), 1);
    init_src();
    DEFAULT_REGISTRY_URL = "https://raw.githubusercontent.com/learn-rudi/registry/main/index.json";
    RUNTIMES_DOWNLOAD_BASE = "https://github.com/learn-rudi/registry/releases/download";
    CACHE_TTL = 24 * 60 * 60 * 1e3;
    PACKAGE_KINDS2 = ["stack", "prompt", "runtime", "binary", "agent"];
    KIND_PLURALS = {
      binary: "binaries"
    };
    GITHUB_RAW_BASE = "https://raw.githubusercontent.com/learn-rudi/registry/main";
    RUNTIMES_RELEASE_VERSION = "v1.0.0";
  }
});

// packages/core/src/resolver.js
async function resolvePackage(id) {
  if (id.startsWith("npm:")) {
    return resolveDynamicNpm(id);
  }
  const normalizedId = id.includes(":") ? id : `stack:${id}`;
  const pkg = await getPackage(normalizedId);
  if (!pkg) {
    throw new Error(`Package not found: ${id}`);
  }
  let manifest = null;
  if (pkg.path) {
    manifest = await getManifest(pkg);
  }
  const mergedPkg = manifest ? { ...pkg, ...manifest } : pkg;
  const fullId = mergedPkg.id?.includes(":") ? mergedPkg.id : `${mergedPkg.kind}:${mergedPkg.id || id.split(":").pop()}`;
  const installed = isPackageInstalled(fullId);
  const dependencies = await resolveDependencies(mergedPkg);
  return {
    id: fullId,
    kind: mergedPkg.kind,
    name: mergedPkg.name,
    version: mergedPkg.version,
    path: mergedPkg.path,
    description: mergedPkg.description,
    runtime: mergedPkg.runtime,
    entry: mergedPkg.entry,
    installed,
    dependencies,
    requires: mergedPkg.requires,
    // Install-related properties (from canonical manifest)
    npmPackage: mergedPkg.npmPackage,
    pipPackage: mergedPkg.pipPackage,
    postInstall: mergedPkg.postInstall,
    binary: mergedPkg.binary,
    bins: mergedPkg.bins,
    binaries: mergedPkg.binaries,
    // backward compat
    installDir: mergedPkg.installDir,
    installType: mergedPkg.installType
  };
}
async function resolveDynamicNpm(id) {
  const spec = id.replace("npm:", "");
  let name, version;
  if (spec.startsWith("@")) {
    const parts = spec.split("@");
    if (parts.length >= 3) {
      name = `@${parts[1]}`;
      version = parts[2];
    } else {
      name = `@${parts[1]}`;
      version = "latest";
    }
  } else {
    const lastAt = spec.lastIndexOf("@");
    if (lastAt > 0) {
      name = spec.substring(0, lastAt);
      version = spec.substring(lastAt + 1);
    } else {
      name = spec;
      version = "latest";
    }
  }
  const sanitizedName = name.replace(/\//g, "__").replace(/^@/, "");
  const installDir = `npm/${sanitizedName}`;
  const fullId = id;
  const installed = isPackageInstalled(fullId);
  return {
    id: fullId,
    kind: "binary",
    name,
    version,
    description: `Dynamic npm package: ${name}`,
    installType: "npm",
    npmPackage: name,
    installDir,
    installed,
    dependencies: [],
    source: {
      type: "npm",
      spec
    },
    // bins will be discovered after install by installer
    bins: null
  };
}
async function resolveDependencies(pkg) {
  const dependencies = [];
  const runtimes = pkg.requires?.runtimes || (pkg.runtime ? [pkg.runtime] : []);
  for (const runtime of runtimes) {
    const runtimeId = runtime.startsWith("runtime:") ? runtime : `runtime:${runtime}`;
    const runtimePkg = await getPackage(runtimeId);
    if (runtimePkg) {
      dependencies.push({
        id: runtimeId,
        kind: "runtime",
        name: runtimePkg.name,
        version: runtimePkg.version,
        installed: isPackageInstalled(runtimeId),
        dependencies: []
      });
    }
  }
  const binaries = pkg.requires?.binaries || pkg.requires?.tools || [];
  for (const binary of binaries) {
    const binaryId = binary.startsWith("binary:") ? binary : binary.startsWith("tool:") ? binary.replace(/^tool:/, "binary:") : `binary:${binary}`;
    const binaryPkg = await getPackage(binaryId);
    if (binaryPkg) {
      dependencies.push({
        id: binaryId,
        kind: "binary",
        name: binaryPkg.name,
        version: binaryPkg.version,
        installed: isPackageInstalled(binaryId),
        dependencies: []
      });
    }
  }
  const agents = pkg.requires?.agents || [];
  for (const agent of agents) {
    const agentId = agent.startsWith("agent:") ? agent : `agent:${agent}`;
    const agentPkg = await getPackage(agentId);
    if (agentPkg) {
      dependencies.push({
        id: agentId,
        kind: "agent",
        name: agentPkg.name,
        version: agentPkg.version,
        installed: isPackageInstalled(agentId),
        dependencies: []
      });
    }
  }
  return dependencies;
}
function checkDependencies(resolved) {
  const missing = [];
  function check(pkg) {
    for (const dep of pkg.dependencies || []) {
      if (!dep.installed) {
        missing.push(dep);
      }
      check(dep);
    }
  }
  check(resolved);
  return {
    satisfied: missing.length === 0,
    missing
  };
}
function getInstallOrder(resolved) {
  const order = [];
  const visited = /* @__PURE__ */ new Set();
  function visit(pkg) {
    if (visited.has(pkg.id)) return;
    visited.add(pkg.id);
    for (const dep of pkg.dependencies || []) {
      visit(dep);
    }
    if (!pkg.installed) {
      order.push(pkg);
    }
  }
  visit(resolved);
  return order;
}
async function resolvePackages(ids) {
  return Promise.all(ids.map((id) => resolvePackage(id)));
}
function satisfiesVersion(version, constraint) {
  if (!constraint) return true;
  const [major, minor = 0, patch = 0] = version.split(".").map(Number);
  const match = constraint.match(/^(>=|<=|>|<|=)?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) return true;
  const [, op = "=", cMajor, cMinor = "0", cPatch = "0"] = match;
  const constraintVersion = [Number(cMajor), Number(cMinor), Number(cPatch)];
  const actualVersion = [major, minor, patch];
  const cmp = compareVersions(actualVersion, constraintVersion);
  switch (op) {
    case ">=":
      return cmp >= 0;
    case "<=":
      return cmp <= 0;
    case ">":
      return cmp > 0;
    case "<":
      return cmp < 0;
    case "=":
      return cmp === 0;
    default:
      return cmp === 0;
  }
}
function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}
var init_resolver = __esm({
  "packages/core/src/resolver.js"() {
    init_src2();
    init_src();
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/identity.js"(exports2) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports2.ALIAS = ALIAS;
    exports2.DOC = DOC;
    exports2.MAP = MAP;
    exports2.NODE_TYPE = NODE_TYPE;
    exports2.PAIR = PAIR;
    exports2.SCALAR = SCALAR;
    exports2.SEQ = SEQ;
    exports2.hasAnchor = hasAnchor;
    exports2.isAlias = isAlias;
    exports2.isCollection = isCollection;
    exports2.isDocument = isDocument;
    exports2.isMap = isMap;
    exports2.isNode = isNode;
    exports2.isPair = isPair;
    exports2.isScalar = isScalar;
    exports2.isSeq = isSeq;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/visit.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path35) {
      const ctrl = callVisitor(key, node, visitor, path35);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path35, ctrl);
        return visit_(key, ctrl, visitor, path35);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path35 = Object.freeze(path35.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path35);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path35 = Object.freeze(path35.concat(node));
          const ck = visit_("key", node.key, visitor, path35);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path35);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path35) {
      const ctrl = await callVisitor(key, node, visitor, path35);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path35, ctrl);
        return visitAsync_(key, ctrl, visitor, path35);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path35 = Object.freeze(path35.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path35);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path35 = Object.freeze(path35.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path35);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path35);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path35) {
      if (typeof visitor === "function")
        return visitor(key, node, path35);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path35);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path35);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path35);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path35);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path35);
      return void 0;
    }
    function replaceNode(key, path35, node) {
      const parent = path35[path35.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports2.visit = visit;
    exports2.visitAsync = visitAsync;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/directives.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports2.Directives = Directives;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/anchors.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports2.anchorIsValid = anchorIsValid;
    exports2.anchorNames = anchorNames;
    exports2.createNodeAnchors = createNodeAnchors;
    exports2.findNewAnchor = findNewAnchor;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/applyReviver.js"(exports2) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports2.applyReviver = applyReviver;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/toJS.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports2.toJS = toJS;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Node.js"(exports2) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports2.NodeBase = NodeBase;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Alias.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports2.Alias = Alias;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports2.Scalar = Scalar;
    exports2.isScalarValue = isScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/createNode.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports2.createNode = createNode;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Collection.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path35, value) {
      let v = value;
      for (let i = path35.length - 1; i >= 0; --i) {
        const k = path35[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path35) => path35 == null || typeof path35 === "object" && !!path35[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path35, value) {
        if (isEmptyPath(path35))
          this.add(value);
        else {
          const [key, ...rest] = path35;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path35) {
        const [key, ...rest] = path35;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path35, keepScalar) {
        const [key, ...rest] = path35;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path35) {
        const [key, ...rest] = path35;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path35, value) {
        const [key, ...rest] = path35;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports2.Collection = Collection;
    exports2.collectionFromPath = collectionFromPath;
    exports2.isEmptyPath = isEmptyPath;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyComment.js"(exports2) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports2.indentComment = indentComment;
    exports2.lineComment = lineComment;
    exports2.stringifyComment = stringifyComment;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/foldFlowLines.js"(exports2) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports2.FOLD_BLOCK = FOLD_BLOCK;
    exports2.FOLD_FLOW = FOLD_FLOW;
    exports2.FOLD_QUOTED = FOLD_QUOTED;
    exports2.foldFlowLines = foldFlowLines;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyString.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports2.stringifyString = stringifyString;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringify.js"(exports2) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports2.createStringifyContext = createStringifyContext;
    exports2.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyPair.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports2.stringifyPair = stringifyPair;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/log.js"(exports2) {
    "use strict";
    var node_process = require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports2.debug = debug;
    exports2.warn = warn;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      value = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (identity.isSeq(value))
        for (const it of value.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(value))
        for (const it of value)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, value);
    }
    function mergeValue(ctx, map, value) {
      const source = ctx && identity.isAlias(value) ? value.resolve(ctx.doc) : value;
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    exports2.addMergeToJSMap = addMergeToJSMap;
    exports2.isMergeKey = isMergeKey;
    exports2.merge = merge;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports2) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports2.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/Pair.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports2.Pair = Pair;
    exports2.createPair = createPair;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyCollection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        if (i < items.length - 1)
          str += ",";
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        if (!reqNewline && (lines.length > linesAtValue || str.includes("\n")))
          reqNewline = true;
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports2.stringifyCollection = stringifyCollection;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/YAMLMap.js"(exports2) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports2.YAMLMap = YAMLMap;
    exports2.findPair = findPair;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/map.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports2.map = map;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/nodes/YAMLSeq.js"(exports2) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports2.YAMLSeq = YAMLSeq;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/seq.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports2.seq = seq;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/string.js"(exports2) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports2.string = string;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/common/null.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports2.nullTag = nullTag;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports2.boolTag = boolTag;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyNumber.js"(exports2) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^\d/.test(n)) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports2.stringifyNumber = stringifyNumber;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/core/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports2.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/json/schema.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports2.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports2) {
    "use strict";
    var node_buffer = require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports2.binary = binary;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports2.createPairs = createPairs;
    exports2.pairs = pairs;
    exports2.resolvePairs = resolvePairs;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports2.YAMLOMap = YAMLOMap;
    exports2.omap = omap;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports2.falseTag = falseTag;
    exports2.trueTag = trueTag;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports2.float = float;
    exports2.floatExp = floatExp;
    exports2.floatNaN = floatNaN;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports2.int = int;
    exports2.intBin = intBin;
    exports2.intHex = intHex;
    exports2.intOct = intOct;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports2.YAMLSet = YAMLSet;
    exports2.set = set;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports2) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports2.floatTime = floatTime;
    exports2.intTime = intTime;
    exports2.timestamp = timestamp;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports2.schema = schema;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/tags.js"(exports2) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports2.coreKnownTags = coreKnownTags;
    exports2.getTags = getTags;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/schema/Schema.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports2.Schema = Schema;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/stringify/stringifyDocument.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports2.stringifyDocument = stringifyDocument;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/doc/Document.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path35, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path35, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path35) {
        if (Collection.isEmptyPath(path35)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path35) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path35, keepScalar) {
        if (Collection.isEmptyPath(path35))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path35, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path35) {
        if (Collection.isEmptyPath(path35))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path35) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path35, value) {
        if (Collection.isEmptyPath(path35)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path35), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path35, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports2.Document = Document;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/errors.js"(exports2) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports2.YAMLError = YAMLError;
    exports2.YAMLParseError = YAMLParseError;
    exports2.YAMLWarning = YAMLWarning;
    exports2.prettifyError = prettifyError;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-props.js"(exports2) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports2.resolveProps = resolveProps;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-contains-newline.js"(exports2) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports2.containsNewline = containsNewline;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports2) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports2.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-map-includes.js"(exports2) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search2) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search2));
    }
    exports2.mapIncludes = mapIncludes;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-map.js"(exports2) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports2.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-seq.js"(exports2) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports2.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-end.js"(exports2) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports2.resolveEnd = resolveEnd;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports2.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-collection.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports2.composeCollection = composeCollection;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports2.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports2) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + match[1];
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = { x: 2, u: 4, U: 8 }[next];
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      if (isNaN(code)) {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
      return String.fromCodePoint(code);
    }
    exports2.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-scalar.js"(exports2) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports2.composeScalar = composeScalar;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports2) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports2.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-node.js"(exports2) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError);
          isSrcToken = false;
        }
      }
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports2.composeEmptyNode = composeEmptyNode;
    exports2.composeNode = composeNode;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/compose-doc.js"(exports2) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports2.composeDoc = composeDoc;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/compose/composer.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          Array.prototype.push.apply(doc.errors, this.errors);
          Array.prototype.push.apply(doc.warnings, this.warnings);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports2.Composer = Composer;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-scalar.js"(exports2) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports2.createScalarToken = createScalarToken;
    exports2.resolveAsScalar = resolveAsScalar;
    exports2.setScalarValue = setScalarValue;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-stringify.js"(exports2) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports2.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst-visit.js"(exports2) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path35) => {
      let item = cst;
      for (const [field, index] of path35) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path35) => {
      const parent = visit.itemAtPath(cst, path35.slice(0, -1));
      const field = path35[path35.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path35, item, visitor) {
      let ctrl = visitor(item, path35);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path35.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path35);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path35) : ctrl;
    }
    exports2.visit = visit;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/cst.js"(exports2) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports2.createScalarToken = cstScalar.createScalarToken;
    exports2.resolveAsScalar = cstScalar.resolveAsScalar;
    exports2.setScalarValue = cstScalar.setScalarValue;
    exports2.stringify = cstStringify.stringify;
    exports2.visit = cstVisit.visit;
    exports2.BOM = BOM;
    exports2.DOCUMENT = DOCUMENT;
    exports2.FLOW_END = FLOW_END;
    exports2.SCALAR = SCALAR;
    exports2.isCollection = isCollection;
    exports2.isScalar = isScalar;
    exports2.prettyToken = prettyToken;
    exports2.tokenType = tokenType;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/lexer.js"(exports2) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return yield* this.parseBlockStart();
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        switch (this.charAt(0)) {
          case "!":
            return (yield* this.pushTag()) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "&":
            return (yield* this.pushUntil(isNotAnchorChar)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
          case "-":
          // this is an error
          case "?":
          // this is an error outside flow collections
          case ":": {
            const inFlow = this.flowLevel > 0;
            const ch1 = this.charAt(1);
            if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
              if (!inFlow)
                this.indentNext = this.indentValue + 1;
              else if (this.flowKey)
                this.flowKey = false;
              return (yield* this.pushCount(1)) + (yield* this.pushSpaces(true)) + (yield* this.pushIndicators());
            }
          }
        }
        return 0;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports2.Lexer = Lexer;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/line-counter.js"(exports2) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports2.LineCounter = LineCounter;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/parse/parser.js"(exports2) {
    "use strict";
    var node_process = require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                Array.prototype.push.apply(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              Array.prototype.push.apply(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs35 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs35, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs35);
              } else {
                Object.assign(it, { key: fs35, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  Array.prototype.push.apply(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs35 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs35, sep: [] });
              else if (it.sep)
                this.stack.push(fs35);
              else
                Object.assign(it, { key: fs35, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports2.Parser = Parser;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/public-api.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports2.parse = parse;
    exports2.parseAllDocuments = parseAllDocuments;
    exports2.parseDocument = parseDocument;
    exports2.stringify = stringify;
  }
});

// node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/yaml@2.8.2/node_modules/yaml/dist/index.js"(exports2) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports2.Composer = composer.Composer;
    exports2.Document = Document.Document;
    exports2.Schema = Schema.Schema;
    exports2.YAMLError = errors.YAMLError;
    exports2.YAMLParseError = errors.YAMLParseError;
    exports2.YAMLWarning = errors.YAMLWarning;
    exports2.Alias = Alias.Alias;
    exports2.isAlias = identity.isAlias;
    exports2.isCollection = identity.isCollection;
    exports2.isDocument = identity.isDocument;
    exports2.isMap = identity.isMap;
    exports2.isNode = identity.isNode;
    exports2.isPair = identity.isPair;
    exports2.isScalar = identity.isScalar;
    exports2.isSeq = identity.isSeq;
    exports2.Pair = Pair.Pair;
    exports2.Scalar = Scalar.Scalar;
    exports2.YAMLMap = YAMLMap.YAMLMap;
    exports2.YAMLSeq = YAMLSeq.YAMLSeq;
    exports2.CST = cst;
    exports2.Lexer = lexer.Lexer;
    exports2.LineCounter = lineCounter.LineCounter;
    exports2.Parser = parser.Parser;
    exports2.parse = publicApi.parse;
    exports2.parseAllDocuments = publicApi.parseAllDocuments;
    exports2.parseDocument = publicApi.parseDocument;
    exports2.stringify = publicApi.stringify;
    exports2.visit = visit.visit;
    exports2.visitAsync = visit.visitAsync;
  }
});

// packages/core/src/lockfile.js
async function writeLockfile(resolved) {
  const lockPath = getLockfilePath(resolved.id);
  const lockDir = import_path3.default.dirname(lockPath);
  if (!import_fs3.default.existsSync(lockDir)) {
    import_fs3.default.mkdirSync(lockDir, { recursive: true });
  }
  const lockfile = {
    id: resolved.id,
    version: resolved.version,
    name: resolved.name,
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    checksum: await computeChecksum(resolved),
    dependencies: (resolved.dependencies || []).map((dep) => ({
      id: dep.id,
      version: dep.version,
      checksum: ""
      // Would compute in production
    }))
  };
  const content = (0, import_yaml.stringify)(lockfile, {
    lineWidth: 0
    // Don't wrap lines
  });
  import_fs3.default.writeFileSync(lockPath, content);
  return lockPath;
}
function readLockfile(id) {
  const lockPath = getLockfilePath(id);
  if (!import_fs3.default.existsSync(lockPath)) {
    return null;
  }
  try {
    const content = import_fs3.default.readFileSync(lockPath, "utf-8");
    return (0, import_yaml.parse)(content);
  } catch {
    return null;
  }
}
function hasLockfile(id) {
  return import_fs3.default.existsSync(getLockfilePath(id));
}
function deleteLockfile(id) {
  const lockPath = getLockfilePath(id);
  if (import_fs3.default.existsSync(lockPath)) {
    import_fs3.default.unlinkSync(lockPath);
  }
}
async function verifyLockfile(id) {
  const lockfile = readLockfile(id);
  if (!lockfile) {
    return { valid: false, errors: ["Lockfile not found"] };
  }
  const errors = [];
  if (!isPackageInstalled(id)) {
    errors.push("Package not installed");
    return { valid: false, errors };
  }
  for (const dep of lockfile.dependencies || []) {
    if (!isPackageInstalled(dep.id)) {
      errors.push(`Missing dependency: ${dep.id}`);
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
async function computeChecksum(pkg) {
  const crypto2 = await import("crypto");
  const data = JSON.stringify({
    id: pkg.id,
    version: pkg.version,
    name: pkg.name
  });
  return crypto2.createHash("sha256").update(data).digest("hex").slice(0, 16);
}
function getAllLockfiles() {
  const lockfiles = [];
  for (const kind of ["stacks", "prompts", "runtimes", "binaries", "agents"]) {
    const lockDir = import_path3.default.join(PATHS.locks, kind);
    if (!import_fs3.default.existsSync(lockDir)) continue;
    const files = import_fs3.default.readdirSync(lockDir).filter((f) => f.endsWith(".lock.yaml"));
    for (const file of files) {
      try {
        const content = import_fs3.default.readFileSync(import_path3.default.join(lockDir, file), "utf-8");
        lockfiles.push((0, import_yaml.parse)(content));
      } catch {
      }
    }
  }
  return lockfiles;
}
async function cleanOrphanedLockfiles() {
  const removed = [];
  for (const kind of ["stacks", "prompts", "runtimes", "binaries", "agents"]) {
    const lockDir = import_path3.default.join(PATHS.locks, kind);
    if (!import_fs3.default.existsSync(lockDir)) continue;
    const files = import_fs3.default.readdirSync(lockDir).filter((f) => f.endsWith(".lock.yaml"));
    for (const file of files) {
      const lockPath = import_path3.default.join(lockDir, file);
      try {
        const content = import_fs3.default.readFileSync(lockPath, "utf-8");
        const lockfile = (0, import_yaml.parse)(content);
        if (!isPackageInstalled(lockfile.id)) {
          import_fs3.default.unlinkSync(lockPath);
          removed.push(lockPath);
        }
      } catch {
        import_fs3.default.unlinkSync(lockPath);
        removed.push(lockPath);
      }
    }
  }
  return removed;
}
var import_fs3, import_path3, import_yaml;
var init_lockfile = __esm({
  "packages/core/src/lockfile.js"() {
    import_fs3 = __toESM(require("fs"), 1);
    import_path3 = __toESM(require("path"), 1);
    import_yaml = __toESM(require_dist(), 1);
    init_src();
  }
});

// packages/core/src/shims.js
var shims_exports = {};
__export(shims_exports, {
  createShimsForTool: () => createShimsForTool,
  getAllShimOwners: () => getAllShimOwners,
  getShimOwner: () => getShimOwner,
  listShims: () => listShims,
  removeShims: () => removeShims,
  validateShim: () => validateShim
});
function getShimRegistryPath() {
  return import_path4.default.join(PATHS.home, "shim-registry.json");
}
function loadShimRegistry() {
  const registryPath = getShimRegistryPath();
  try {
    if (import_fs4.default.existsSync(registryPath)) {
      return JSON.parse(import_fs4.default.readFileSync(registryPath, "utf-8"));
    }
  } catch {
  }
  return {};
}
function saveShimRegistry(registry) {
  const registryPath = getShimRegistryPath();
  const dir = import_path4.default.dirname(registryPath);
  if (!import_fs4.default.existsSync(dir)) {
    import_fs4.default.mkdirSync(dir, { recursive: true });
  }
  import_fs4.default.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
function registerShim(bin, owner, type, target) {
  const registry = loadShimRegistry();
  const existing = registry[bin];
  let collision = false;
  let previousOwner = void 0;
  if (existing && existing.owner !== owner) {
    collision = true;
    previousOwner = existing.owner;
  }
  registry[bin] = {
    owner,
    type,
    target,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveShimRegistry(registry);
  return { collision, previousOwner };
}
function unregisterShim(bin) {
  const registry = loadShimRegistry();
  delete registry[bin];
  saveShimRegistry(registry);
}
function getShimOwner(bin) {
  const registry = loadShimRegistry();
  return registry[bin] || null;
}
function getAllShimOwners() {
  return loadShimRegistry();
}
async function createShimsForTool(manifest) {
  const bins = manifest.bins || [manifest.name || manifest.id.split(":")[1]];
  const created = [];
  const collisions = [];
  for (const bin of bins) {
    const target = resolveBinTarget(manifest, bin);
    if (!import_fs4.default.existsSync(target)) {
      console.warn(`[Shims] Warning: Binary target does not exist: ${target}`);
      continue;
    }
    const shimType = manifest.installType === "binary" ? "symlink" : "wrapper";
    if (manifest.installType === "binary") {
      createSymlinkShim(bin, target, PATHS.bins);
    } else {
      createWrapperShim(bin, target, PATHS.bins);
    }
    const { collision, previousOwner } = registerShim(bin, manifest.id, shimType, target);
    if (collision) {
      collisions.push({ bin, previousOwner });
      console.warn(`[Shims] Warning: '${bin}' was owned by ${previousOwner}, now owned by ${manifest.id}`);
    }
    created.push(bin);
  }
  return { created, collisions };
}
function resolveBinTarget(manifest, bin) {
  switch (manifest.installType) {
    case "binary":
      return import_path4.default.join(manifest.installDir, bin);
    case "npm":
      return import_path4.default.join(manifest.installDir, "node_modules", ".bin", bin);
    case "pip":
      return import_path4.default.join(manifest.installDir, "venv", "bin", bin);
    case "system":
      return manifest.source?.path || manifest.systemPath;
    default:
      throw new Error(`Unknown installType: ${manifest.installType}`);
  }
}
function createWrapperShim(name, targetAbs, binsDir) {
  import_fs4.default.mkdirSync(binsDir, { recursive: true });
  const shimPath = import_path4.default.join(binsDir, name);
  const script = `#!/usr/bin/env bash
set -euo pipefail
exec "${targetAbs}" "$@"
`;
  const tempPath = `${shimPath}.tmp`;
  import_fs4.default.writeFileSync(tempPath, script, "utf8");
  import_fs4.default.chmodSync(tempPath, 493);
  import_fs4.default.renameSync(tempPath, shimPath);
  console.log(`[Shims] Created wrapper shim: ${name} \u2192 ${targetAbs}`);
}
function createSymlinkShim(name, targetAbs, binsDir) {
  import_fs4.default.mkdirSync(binsDir, { recursive: true });
  const shimPath = import_path4.default.join(binsDir, name);
  try {
    import_fs4.default.unlinkSync(shimPath);
  } catch (err) {
  }
  const relTarget = import_path4.default.relative(binsDir, targetAbs);
  import_fs4.default.symlinkSync(relTarget, shimPath);
  console.log(`[Shims] Created symlink shim: ${name} \u2192 ${targetAbs}`);
}
function removeShims(bins) {
  const removed = [];
  const notFound = [];
  for (const bin of bins) {
    const shimPath = import_path4.default.join(PATHS.bins, bin);
    try {
      import_fs4.default.unlinkSync(shimPath);
      unregisterShim(bin);
      removed.push(bin);
      console.log(`[Shims] Removed shim: ${bin}`);
    } catch (err) {
      notFound.push(bin);
      unregisterShim(bin);
    }
  }
  return { removed, notFound };
}
function listShims() {
  if (!import_fs4.default.existsSync(PATHS.bins)) {
    return [];
  }
  return import_fs4.default.readdirSync(PATHS.bins).filter((name) => {
    const shimPath = import_path4.default.join(PATHS.bins, name);
    try {
      const stat = import_fs4.default.statSync(shimPath);
      return stat.isFile() || stat.isSymbolicLink();
    } catch {
      return false;
    }
  });
}
function validateShim(bin) {
  const shimPath = import_path4.default.join(PATHS.bins, bin);
  if (!import_fs4.default.existsSync(shimPath)) {
    return { valid: false, error: "Shim does not exist" };
  }
  try {
    const stat = import_fs4.default.lstatSync(shimPath);
    if (stat.isSymbolicLink()) {
      const target = import_fs4.default.readlinkSync(shimPath);
      const targetAbs = import_path4.default.isAbsolute(target) ? target : import_path4.default.resolve(import_path4.default.dirname(shimPath), target);
      if (!import_fs4.default.existsSync(targetAbs)) {
        return { valid: false, target: targetAbs, error: "Symlink target does not exist" };
      }
      return { valid: true, target: targetAbs };
    } else if (stat.isFile()) {
      const content = import_fs4.default.readFileSync(shimPath, "utf8");
      const match = content.match(/exec "([^"]+)"/);
      const target = match?.[1];
      if (!target) {
        return { valid: false, error: "Cannot parse wrapper script" };
      }
      if (!import_fs4.default.existsSync(target)) {
        return { valid: false, target, error: "Wrapper target does not exist" };
      }
      return { valid: true, target };
    }
    return { valid: false, error: "Unknown shim type" };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
var import_fs4, import_path4;
var init_shims = __esm({
  "packages/core/src/shims.js"() {
    import_fs4 = __toESM(require("fs"), 1);
    import_path4 = __toESM(require("path"), 1);
    init_src();
  }
});

// packages/core/src/installer.js
function discoverNpmBins(installPath, packageName) {
  try {
    const pkgJsonPath = import_path5.default.join(installPath, "node_modules", packageName, "package.json");
    if (!import_fs5.default.existsSync(pkgJsonPath)) {
      console.warn(`[Installer] Warning: Could not find package.json at ${pkgJsonPath}`);
      return [];
    }
    const pkgJson = JSON.parse(import_fs5.default.readFileSync(pkgJsonPath, "utf8"));
    const bins = [];
    if (typeof pkgJson.bin === "string") {
      const binName = packageName.split("/").pop();
      bins.push(binName);
    } else if (typeof pkgJson.bin === "object" && pkgJson.bin !== null) {
      bins.push(...Object.keys(pkgJson.bin));
    } else {
      console.warn(`[Installer] Warning: Package '${packageName}' has no 'bin' field`);
    }
    return bins;
  } catch (error) {
    console.warn(`[Installer] Error discovering bins: ${error.message}`);
    return [];
  }
}
function hasInstallScripts(installPath, packageName) {
  try {
    const pkgJsonPath = import_path5.default.join(installPath, "node_modules", packageName, "package.json");
    if (!import_fs5.default.existsSync(pkgJsonPath)) {
      return false;
    }
    const pkgJson = JSON.parse(import_fs5.default.readFileSync(pkgJsonPath, "utf8"));
    const scripts = pkgJson.scripts || {};
    const installScriptKeys = ["preinstall", "install", "postinstall", "prepare"];
    return installScriptKeys.some((key) => scripts[key]);
  } catch (error) {
    return false;
  }
}
async function installPackage(id, options = {}) {
  const { force = false, allowScripts = false, onProgress } = options;
  ensureDirectories();
  onProgress?.({ phase: "resolving", package: id });
  const resolved = await resolvePackage(id);
  let toInstall = getInstallOrder(resolved);
  if (toInstall.length === 0 && !force) {
    return {
      success: true,
      id: resolved.id,
      path: getPackagePath(resolved.id),
      alreadyInstalled: true
    };
  }
  if (force && !toInstall.find((p) => p.id === resolved.id)) {
    toInstall.push(resolved);
  }
  const results = [];
  for (const pkg of toInstall) {
    onProgress?.({ phase: "installing", package: pkg.id, total: toInstall.length, current: results.length + 1 });
    try {
      const result = await installSinglePackage(pkg, { force, allowScripts, onProgress });
      results.push(result);
    } catch (error) {
      return {
        success: false,
        id: pkg.id,
        error: error.message
      };
    }
  }
  onProgress?.({ phase: "lockfile", package: resolved.id });
  await writeLockfile(resolved);
  return {
    success: true,
    id: resolved.id,
    path: getPackagePath(resolved.id),
    installed: results.map((r) => r.id)
  };
}
async function installSinglePackage(pkg, options = {}) {
  const { force = false, allowScripts = false, onProgress } = options;
  const installPath = getPackagePath(pkg.id);
  if (import_fs5.default.existsSync(installPath) && !force) {
    return { success: true, id: pkg.id, path: installPath, skipped: true };
  }
  if (pkg.kind === "runtime" || pkg.kind === "binary" || pkg.kind === "agent") {
    const pkgName = pkg.id.replace(/^(runtime|binary|agent):/, "");
    onProgress?.({ phase: "downloading", package: pkg.id });
    if (pkg.npmPackage) {
      try {
        const { execSync: execSync10 } = await import("child_process");
        if (!import_fs5.default.existsSync(installPath)) {
          import_fs5.default.mkdirSync(installPath, { recursive: true });
        }
        onProgress?.({ phase: "installing", package: pkg.id, message: `npm install ${pkg.npmPackage}` });
        const resourcesPath = process.env.RESOURCES_PATH;
        const npmCmd = resourcesPath ? import_path5.default.join(resourcesPath, "bundled-runtimes", "node", "bin", "npm") : "npm";
        if (!import_fs5.default.existsSync(import_path5.default.join(installPath, "package.json"))) {
          execSync10(`"${npmCmd}" init -y`, { cwd: installPath, stdio: "pipe" });
        }
        const shouldIgnoreScripts = pkg.source?.type === "npm" && !allowScripts;
        const installFlags = shouldIgnoreScripts ? "--ignore-scripts --no-audit --no-fund" : "--no-audit --no-fund";
        execSync10(`"${npmCmd}" install ${pkg.npmPackage} ${installFlags}`, { cwd: installPath, stdio: "pipe" });
        let bins = pkg.bins;
        if (!bins || bins.length === 0) {
          bins = discoverNpmBins(installPath, pkg.npmPackage);
          console.log(`[Installer] Discovered binaries: ${bins.join(", ") || "(none)"}`);
        }
        let installedVersion = pkg.version || "latest";
        try {
          const pkgJsonPath = import_path5.default.join(installPath, "node_modules", pkg.npmPackage, "package.json");
          if (import_fs5.default.existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(import_fs5.default.readFileSync(pkgJsonPath, "utf8"));
            installedVersion = pkgJson.version;
          }
        } catch (err) {
        }
        if (pkg.postInstall) {
          onProgress?.({ phase: "postInstall", package: pkg.id, message: pkg.postInstall });
          const postInstallCmd = pkg.postInstall.replace(
            /^npx\s+(\S+)/,
            `"${import_path5.default.join(installPath, "node_modules", ".bin", "$1")}"`
          );
          execSync10(postInstallCmd, { cwd: installPath, stdio: "pipe" });
        }
        const scriptsDetected = hasInstallScripts(installPath, pkg.npmPackage);
        const scriptsPolicy = installFlags.includes("--ignore-scripts") ? "ignore" : "allow";
        if (scriptsDetected && scriptsPolicy === "ignore") {
          console.warn(`
\u26A0\uFE0F  This package defines install scripts that were skipped for security.`);
          console.warn(`   If the CLI fails to run, reinstall with:`);
          console.warn(`   rudi install ${pkg.id} --allow-scripts
`);
        }
        const manifest2 = {
          id: pkg.id,
          kind: pkg.kind,
          name: pkgName,
          version: installedVersion,
          npmPackage: pkg.npmPackage,
          bins,
          hasInstallScripts: scriptsDetected,
          scriptsPolicy,
          postInstall: pkg.postInstall,
          installedAt: (/* @__PURE__ */ new Date()).toISOString(),
          source: pkg.source || { type: "npm" }
        };
        import_fs5.default.writeFileSync(
          import_path5.default.join(installPath, "manifest.json"),
          JSON.stringify(manifest2, null, 2)
        );
        if (bins && bins.length > 0) {
          await createShimsForTool({
            id: pkg.id,
            installType: "npm",
            installDir: installPath,
            bins,
            name: pkgName
          });
        } else {
          console.warn(`[Installer] Warning: No binaries found for ${pkg.npmPackage}`);
        }
        return { success: true, id: pkg.id, path: installPath };
      } catch (error) {
        throw new Error(`Failed to install ${pkg.npmPackage}: ${error.message}`);
      }
    }
    if (pkg.pipPackage) {
      try {
        if (!import_fs5.default.existsSync(installPath)) {
          import_fs5.default.mkdirSync(installPath, { recursive: true });
        }
        onProgress?.({ phase: "installing", package: pkg.id, message: `Installing ${pkg.pipPackage}...` });
        const { usedUv } = await installPythonPackage(installPath, pkg.pipPackage, (p) => {
          onProgress?.({ ...p, package: pkg.id });
        });
        const manifest2 = {
          id: pkg.id,
          kind: pkg.kind,
          name: pkgName,
          version: pkg.version || "latest",
          pipPackage: pkg.pipPackage,
          installedAt: (/* @__PURE__ */ new Date()).toISOString(),
          source: usedUv ? "uv" : "pip",
          venvPath: import_path5.default.join(installPath, "venv")
        };
        import_fs5.default.writeFileSync(
          import_path5.default.join(installPath, "manifest.json"),
          JSON.stringify(manifest2, null, 2)
        );
        await createShimsForTool({
          id: pkg.id,
          installType: "pip",
          installDir: installPath,
          bins: pkg.bins || [pkgName],
          name: pkgName
        });
        return { success: true, id: pkg.id, path: installPath };
      } catch (error) {
        throw new Error(`Failed to install ${pkg.pipPackage}: ${error.message}`);
      }
    }
    const version = pkg.version?.replace(/\.x$/, ".0") || "1.0.0";
    try {
      if (pkg.kind === "binary") {
        await downloadTool(pkgName, installPath, {
          onProgress: (p) => onProgress?.({ ...p, package: pkg.id })
        });
        const manifestPath = import_path5.default.join(installPath, "manifest.json");
        const manifest2 = JSON.parse(import_fs5.default.readFileSync(manifestPath, "utf-8"));
        await createShimsForTool({
          id: pkg.id,
          installType: "binary",
          installDir: installPath,
          bins: manifest2.bins || manifest2.binaries || pkg.bins || [pkgName],
          name: pkgName
        });
      } else {
        await downloadRuntime(pkgName, version, installPath, {
          onProgress: (p) => onProgress?.({ ...p, package: pkg.id })
        });
      }
      return { success: true, id: pkg.id, path: installPath };
    } catch (error) {
      console.warn(`Package download failed: ${error.message}`);
      console.warn(`Creating placeholder for ${pkg.id}`);
      if (!import_fs5.default.existsSync(installPath)) {
        import_fs5.default.mkdirSync(installPath, { recursive: true });
      }
      import_fs5.default.writeFileSync(
        import_path5.default.join(installPath, "manifest.json"),
        JSON.stringify({
          id: pkg.id,
          kind: pkg.kind,
          name: pkg.name,
          version: pkg.version,
          installedAt: (/* @__PURE__ */ new Date()).toISOString(),
          source: "placeholder",
          error: error.message
        }, null, 2)
      );
      return { success: true, id: pkg.id, path: installPath, placeholder: true };
    }
  }
  if (pkg.path) {
    onProgress?.({ phase: "downloading", package: pkg.id });
    try {
      await downloadPackage(pkg, installPath, { onProgress });
      if (pkg.kind !== "prompt") {
        const manifestPath = import_path5.default.join(installPath, "manifest.json");
        if (!import_fs5.default.existsSync(manifestPath)) {
          import_fs5.default.writeFileSync(
            manifestPath,
            JSON.stringify({
              id: pkg.id,
              kind: pkg.kind,
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              runtime: pkg.runtime,
              entry: pkg.entry || "create_pdf.py",
              // default entry point
              requires: pkg.requires,
              installedAt: (/* @__PURE__ */ new Date()).toISOString(),
              source: "registry"
            }, null, 2)
          );
        }
        if (pkg.kind === "stack") {
          onProgress?.({ phase: "installing-deps", package: pkg.id });
          await installStackDependencies(installPath, onProgress);
        }
      }
      onProgress?.({ phase: "installed", package: pkg.id });
      return { success: true, id: pkg.id, path: installPath };
    } catch (error) {
      throw new Error(`Failed to install ${pkg.id}: ${error.message}`);
    }
  }
  if (pkg.kind === "prompt") {
    throw new Error(`Prompt ${pkg.id} not found in registry`);
  }
  if (import_fs5.default.existsSync(installPath)) {
    import_fs5.default.rmSync(installPath, { recursive: true });
  }
  import_fs5.default.mkdirSync(installPath, { recursive: true });
  const manifest = {
    id: pkg.id,
    kind: pkg.kind,
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: "registry"
  };
  import_fs5.default.writeFileSync(
    import_path5.default.join(installPath, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  onProgress?.({ phase: "installed", package: pkg.id });
  return { success: true, id: pkg.id, path: installPath };
}
async function uninstallPackage(id) {
  const installPath = getPackagePath(id);
  const [kind, name] = parsePackageId(id);
  if (!import_fs5.default.existsSync(installPath)) {
    return { success: false, error: `Package not installed: ${id}` };
  }
  try {
    let bins = [];
    if (kind !== "prompt") {
      const manifestPath = import_path5.default.join(installPath, "manifest.json");
      if (import_fs5.default.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(import_fs5.default.readFileSync(manifestPath, "utf-8"));
          bins = manifest.bins || manifest.binaries || [];
        } catch {
          bins = [name];
        }
      }
    }
    if (bins.length > 0) {
      removeShims(bins);
    }
    if (kind === "prompt") {
      import_fs5.default.unlinkSync(installPath);
    } else {
      import_fs5.default.rmSync(installPath, { recursive: true });
    }
    const lockDir = kind === "binary" ? "binaries" : kind === "npm" ? "npms" : kind + "s";
    const lockName = name.replace(/\//g, "__").replace(/^@/, "");
    const lockPath = import_path5.default.join(PATHS.locks, lockDir, `${lockName}.lock.yaml`);
    if (import_fs5.default.existsSync(lockPath)) {
      import_fs5.default.unlinkSync(lockPath);
    }
    return { success: true, removedShims: bins };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
async function installFromLocal(dir, options = {}) {
  ensureDirectories();
  const manifestPath = import_path5.default.join(dir, "stack.yaml") || import_path5.default.join(dir, "manifest.yaml");
  if (!import_fs5.default.existsSync(manifestPath)) {
    throw new Error(`No manifest found in ${dir}`);
  }
  const { parse: parseYaml4 } = await Promise.resolve().then(() => __toESM(require_dist(), 1));
  const manifestContent = import_fs5.default.readFileSync(manifestPath, "utf-8");
  const manifest = parseYaml4(manifestContent);
  const id = manifest.id.includes(":") ? manifest.id : `stack:${manifest.id}`;
  const installPath = getPackagePath(id);
  if (import_fs5.default.existsSync(installPath)) {
    import_fs5.default.rmSync(installPath, { recursive: true });
  }
  await copyDirectory(dir, installPath);
  const meta = {
    id,
    kind: "stack",
    name: manifest.name,
    version: manifest.version,
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: "local",
    sourcePath: dir
  };
  import_fs5.default.writeFileSync(
    import_path5.default.join(installPath, ".install-meta.json"),
    JSON.stringify(meta, null, 2)
  );
  return { success: true, id, path: installPath };
}
async function copyDirectory(src, dest) {
  import_fs5.default.mkdirSync(dest, { recursive: true });
  const entries = import_fs5.default.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = import_path5.default.join(src, entry.name);
    const destPath = import_path5.default.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        await copyDirectory(srcPath, destPath);
      }
    } else {
      import_fs5.default.copyFileSync(srcPath, destPath);
    }
  }
}
async function listInstalled(kind) {
  const kinds = kind ? [kind] : ["stack", "prompt", "runtime", "binary", "agent"];
  const packages = [];
  for (const k of kinds) {
    const dir = {
      stack: PATHS.stacks,
      prompt: PATHS.prompts,
      runtime: PATHS.runtimes,
      binary: PATHS.binaries,
      agent: PATHS.agents
    }[k];
    if (!dir || !import_fs5.default.existsSync(dir)) continue;
    const entries = import_fs5.default.readdirSync(dir, { withFileTypes: true });
    if (k === "prompt") {
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name.startsWith(".")) continue;
        const filePath = import_path5.default.join(dir, entry.name);
        const name = entry.name.replace(/\.md$/, "");
        try {
          const content = import_fs5.default.readFileSync(filePath, "utf-8");
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          let metadata = {};
          if (frontmatterMatch) {
            const yaml = frontmatterMatch[1];
            const nameMatch = yaml.match(/^name:\s*["']?(.+?)["']?\s*$/m);
            const descMatch = yaml.match(/^description:\s*["']?(.+?)["']?\s*$/m);
            const versionMatch = yaml.match(/^version:\s*["']?(.+?)["']?\s*$/m);
            const categoryMatch = yaml.match(/^category:\s*["']?(.+?)["']?\s*$/m);
            const iconMatch = yaml.match(/^icon:\s*["']?(.+?)["']?\s*$/m);
            if (nameMatch) metadata.name = nameMatch[1];
            if (descMatch) metadata.description = descMatch[1];
            if (versionMatch) metadata.version = versionMatch[1];
            if (categoryMatch) metadata.category = categoryMatch[1];
            if (iconMatch) metadata.icon = iconMatch[1];
            const tagsSection = yaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
            if (tagsSection) {
              metadata.tags = tagsSection[1].split("\n").map((line) => line.replace(/^\s+-\s+/, "").trim()).filter(Boolean);
            }
          }
          packages.push({
            id: `prompt:${name}`,
            kind: "prompt",
            name: metadata.name || name,
            version: metadata.version || "1.0.0",
            description: metadata.description || `${name} prompt`,
            category: metadata.category || "general",
            tags: metadata.tags || [],
            icon: metadata.icon || "",
            path: filePath
          });
        } catch {
          packages.push({
            id: `prompt:${name}`,
            kind: "prompt",
            name,
            version: "1.0.0",
            description: `${name} prompt`,
            category: "general",
            tags: [],
            path: filePath
          });
        }
      }
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const pkgDir = import_path5.default.join(dir, entry.name);
      const manifestPath = import_path5.default.join(pkgDir, "manifest.json");
      const runtimePath = import_path5.default.join(pkgDir, "runtime.json");
      if (import_fs5.default.existsSync(manifestPath)) {
        const manifest = JSON.parse(import_fs5.default.readFileSync(manifestPath, "utf-8"));
        packages.push({ ...manifest, kind: k, path: pkgDir });
      } else if (import_fs5.default.existsSync(runtimePath)) {
        const runtimeMeta = JSON.parse(import_fs5.default.readFileSync(runtimePath, "utf-8"));
        packages.push({
          id: `${k}:${entry.name}`,
          kind: k,
          name: entry.name,
          version: runtimeMeta.version || "unknown",
          description: `${entry.name} ${k}`,
          installedAt: runtimeMeta.downloadedAt || runtimeMeta.installedAt,
          path: pkgDir
        });
      }
    }
  }
  return packages;
}
async function updatePackage(id) {
  return installPackage(id, { force: true });
}
async function updateAll(options = {}) {
  const installed = await listInstalled();
  const results = [];
  for (const pkg of installed) {
    options.onProgress?.({ package: pkg.id, current: results.length + 1, total: installed.length });
    try {
      const result = await updatePackage(pkg.id);
      results.push(result);
    } catch (error) {
      results.push({ success: false, id: pkg.id, error: error.message });
    }
  }
  return results;
}
async function installStackDependencies(stackPath, onProgress) {
  const { execSync: execSync10 } = await import("child_process");
  const nodePath = import_path5.default.join(stackPath, "node");
  if (import_fs5.default.existsSync(nodePath)) {
    const packageJsonPath = import_path5.default.join(nodePath, "package.json");
    if (import_fs5.default.existsSync(packageJsonPath)) {
      onProgress?.({ phase: "installing-deps", message: "Installing Node.js dependencies..." });
      try {
        const npmCmd = await findNpmExecutable();
        execSync10(`"${npmCmd}" install`, { cwd: nodePath, stdio: "pipe" });
      } catch (error) {
        console.warn(`Warning: Failed to install Node.js dependencies: ${error.message}`);
      }
    }
  }
  const pythonPath = import_path5.default.join(stackPath, "python");
  if (import_fs5.default.existsSync(pythonPath)) {
    const requirementsPath = import_path5.default.join(pythonPath, "requirements.txt");
    if (import_fs5.default.existsSync(requirementsPath)) {
      try {
        await installPythonRequirements(pythonPath, onProgress);
      } catch (error) {
        console.warn(`Warning: Failed to install Python dependencies: ${error.message}`);
      }
    }
  }
}
async function findNpmExecutable() {
  const isWindows = process.platform === "win32";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const binDir = isWindows ? "" : "bin";
  const exe = isWindows ? "npm.cmd" : "npm";
  const bundledNodeBase = import_path5.default.join(PATHS.runtimes, "node");
  const archSpecificNpm = import_path5.default.join(bundledNodeBase, arch, binDir, exe);
  if (import_fs5.default.existsSync(archSpecificNpm)) {
    return archSpecificNpm;
  }
  const flatNpm = import_path5.default.join(bundledNodeBase, binDir, exe);
  if (import_fs5.default.existsSync(flatNpm)) {
    return flatNpm;
  }
  return "npm";
}
async function findPythonExecutable() {
  const isWindows = process.platform === "win32";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const binDir = isWindows ? "" : "bin";
  const exe = isWindows ? "python.exe" : "python3";
  const bundledPythonBase = import_path5.default.join(PATHS.runtimes, "python");
  const archSpecificPython = import_path5.default.join(bundledPythonBase, arch, binDir, exe);
  if (import_fs5.default.existsSync(archSpecificPython)) {
    return archSpecificPython;
  }
  const flatPython = import_path5.default.join(bundledPythonBase, binDir, exe);
  if (import_fs5.default.existsSync(flatPython)) {
    return flatPython;
  }
  return "python3";
}
function findUvExecutable() {
  const isWindows = process.platform === "win32";
  const exe = isWindows ? "uv.exe" : "uv";
  const uvPath = import_path5.default.join(PATHS.binaries, "uv", exe);
  if (import_fs5.default.existsSync(uvPath)) {
    return uvPath;
  }
  try {
    const { execSync: execSync10 } = require("child_process");
    execSync10("uv --version", { stdio: "pipe" });
    return "uv";
  } catch {
    return null;
  }
}
async function ensureUv(onProgress) {
  const existing = findUvExecutable();
  if (existing) {
    return existing;
  }
  onProgress?.({ phase: "installing", message: "Installing uv for faster Python package management..." });
  try {
    const result = await installPackage("binary:uv", { onProgress });
    if (result.success) {
      return findUvExecutable();
    }
  } catch (error) {
    console.warn(`Warning: Failed to install uv: ${error.message}`);
    console.warn("Falling back to pip for Python package installation.");
  }
  return null;
}
async function installPythonPackage(installPath, pipPackage, onProgress) {
  const { execSync: execSync10 } = await import("child_process");
  const uvCmd = findUvExecutable();
  if (uvCmd) {
    onProgress?.({ phase: "installing", message: `uv pip install ${pipPackage}` });
    execSync10(`"${uvCmd}" venv "${installPath}/venv"`, { stdio: "pipe" });
    execSync10(`"${uvCmd}" pip install --python "${installPath}/venv/bin/python" ${pipPackage}`, { stdio: "pipe" });
    return { usedUv: true };
  } else {
    onProgress?.({ phase: "installing", message: `pip install ${pipPackage}` });
    const pythonCmd = await findPythonExecutable();
    execSync10(`"${pythonCmd}" -m venv "${installPath}/venv"`, { stdio: "pipe" });
    execSync10(`"${installPath}/venv/bin/pip" install ${pipPackage}`, { stdio: "pipe" });
    return { usedUv: false };
  }
}
async function installPythonRequirements(pythonPath, onProgress) {
  const { execSync: execSync10 } = await import("child_process");
  const uvCmd = findUvExecutable();
  const isWindows = process.platform === "win32";
  const venvPython = isWindows ? import_path5.default.join(pythonPath, "venv", "Scripts", "python.exe") : import_path5.default.join(pythonPath, "venv", "bin", "python");
  if (uvCmd) {
    onProgress?.({ phase: "installing-deps", message: "Installing Python dependencies with uv..." });
    execSync10(`"${uvCmd}" venv "${pythonPath}/venv"`, { cwd: pythonPath, stdio: "pipe" });
    execSync10(`"${uvCmd}" pip install --python "${venvPython}" -r requirements.txt`, { cwd: pythonPath, stdio: "pipe" });
    return { usedUv: true };
  } else {
    onProgress?.({ phase: "installing-deps", message: "Installing Python dependencies..." });
    const pythonCmd = await findPythonExecutable();
    execSync10(`"${pythonCmd}" -m venv venv`, { cwd: pythonPath, stdio: "pipe" });
    const pipCmd = isWindows ? ".\\venv\\Scripts\\pip" : "./venv/bin/pip";
    execSync10(`${pipCmd} install -r requirements.txt`, { cwd: pythonPath, stdio: "pipe" });
    return { usedUv: false };
  }
}
var import_fs5, import_path5;
var init_installer = __esm({
  "packages/core/src/installer.js"() {
    import_fs5 = __toESM(require("fs"), 1);
    import_path5 = __toESM(require("path"), 1);
    init_src();
    init_src2();
    init_resolver();
    init_lockfile();
    init_shims();
  }
});

// packages/core/src/deps.js
function checkRuntime(runtime) {
  const name = runtime.replace(/^runtime:/, "");
  const rudiPath = import_path6.default.join(PATHS.runtimes, name);
  if (import_fs6.default.existsSync(rudiPath)) {
    const binPath = getBinPath(rudiPath, name);
    if (binPath && import_fs6.default.existsSync(binPath)) {
      const version = getVersion(binPath, name);
      return { available: true, path: binPath, version, source: "rudi" };
    }
  }
  const systemCmd = getSystemCommand(name);
  const systemPath = which(systemCmd);
  if (systemPath) {
    const version = getVersion(systemPath, name);
    return { available: true, path: systemPath, version, source: "system" };
  }
  return { available: false, path: null, version: null, source: null };
}
function checkBinary(binary) {
  const name = binary.replace(/^binary:/, "");
  const rudiPath = import_path6.default.join(PATHS.binaries, name);
  if (import_fs6.default.existsSync(rudiPath)) {
    const binPath = getBinPath(rudiPath, name);
    if (binPath && import_fs6.default.existsSync(binPath)) {
      const version = getVersion(binPath, name);
      return { available: true, path: binPath, version, source: "rudi" };
    }
  }
  const systemPath = which(name);
  if (systemPath) {
    const version = getVersion(systemPath, name);
    return { available: true, path: systemPath, version, source: "system" };
  }
  return { available: false, path: null, version: null, source: null };
}
function checkAllDependencies(resolved) {
  const results = [];
  let satisfied = true;
  if (resolved.runtime) {
    const runtime = resolved.runtime.replace(/^runtime:/, "");
    const check = checkRuntime(runtime);
    results.push({
      type: "runtime",
      name: runtime,
      required: true,
      ...check
    });
    if (!check.available) satisfied = false;
  }
  for (const rt of resolved.requires?.runtimes || []) {
    const name = rt.replace(/^runtime:/, "");
    const check = checkRuntime(name);
    results.push({
      type: "runtime",
      name,
      required: true,
      ...check
    });
    if (!check.available) satisfied = false;
  }
  for (const bin of resolved.requires?.binaries || []) {
    const name = bin.replace(/^binary:/, "");
    const check = checkBinary(name);
    results.push({
      type: "binary",
      name,
      required: true,
      ...check
    });
    if (!check.available) satisfied = false;
  }
  return { satisfied, results };
}
function formatDependencyResults(results) {
  const lines = [];
  for (const r of results) {
    const icon = r.available ? "\u2713" : "\u2717";
    const version = r.version ? ` v${r.version}` : "";
    const source = r.source ? ` (${r.source})` : "";
    const status = r.available ? `${icon} ${r.name}${version}${source}` : `${icon} ${r.name} - not found`;
    lines.push(`  ${status}`);
  }
  return lines;
}
function getBinPath(baseDir, name) {
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const isWindows = process.platform === "win32";
  const ext = isWindows ? ".exe" : "";
  const exeMap = {
    node: "node",
    python: "python3",
    deno: "deno",
    bun: "bun",
    ffmpeg: "ffmpeg",
    ripgrep: "rg",
    sqlite: "sqlite3",
    jq: "jq",
    yq: "yq"
  };
  const exe = exeMap[name] || name;
  const archPath = import_path6.default.join(baseDir, arch, "bin", exe + ext);
  if (import_fs6.default.existsSync(archPath)) return archPath;
  const flatPath = import_path6.default.join(baseDir, "bin", exe + ext);
  if (import_fs6.default.existsSync(flatPath)) return flatPath;
  const directPath = import_path6.default.join(baseDir, exe + ext);
  if (import_fs6.default.existsSync(directPath)) return directPath;
  return null;
}
function getSystemCommand(name) {
  const cmdMap = {
    python: "python3",
    node: "node",
    deno: "deno",
    bun: "bun"
  };
  return cmdMap[name] || name;
}
function which(cmd) {
  try {
    const result = (0, import_child_process.execSync)(`which ${cmd} 2>/dev/null`, { encoding: "utf-8" });
    return result.trim();
  } catch {
    return null;
  }
}
function getVersion(binPath, name) {
  const versionFlags = {
    node: "--version",
    python: "--version",
    python3: "--version",
    deno: "--version",
    bun: "--version",
    ffmpeg: "-version",
    rg: "--version",
    ripgrep: "--version",
    sqlite3: "--version",
    jq: "--version",
    yq: "--version"
  };
  const flag = versionFlags[name] || "--version";
  try {
    const output = (0, import_child_process.execSync)(`"${binPath}" ${flag} 2>&1`, { encoding: "utf-8" });
    const match = output.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match ? match[1] : output.split("\n")[0].trim();
  } catch {
    return null;
  }
}
function getAvailableDeps() {
  const installedRuntimes = scanDirectory(PATHS.runtimes);
  const installedBinaries = scanDirectory(PATHS.binaries);
  const commonRuntimes = ["node", "python", "deno", "bun"];
  const commonBinaries = ["ffmpeg", "ripgrep", "sqlite3", "jq", "yq", "git", "docker", "rg"];
  const runtimeNames = [.../* @__PURE__ */ new Set([...installedRuntimes, ...commonRuntimes])];
  const binaryNames = [.../* @__PURE__ */ new Set([...installedBinaries, ...commonBinaries])];
  const runtimes = runtimeNames.map((name) => ({
    name,
    ...checkRuntime(name)
  }));
  const binaries = binaryNames.filter((name) => name !== "rg").map((name) => ({
    name,
    ...checkBinary(name)
  }));
  return { runtimes, binaries };
}
function scanDirectory(dir) {
  if (!import_fs6.default.existsSync(dir)) return [];
  try {
    return import_fs6.default.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
  } catch {
    return [];
  }
}
async function getAllDepsFromRegistry() {
  const index = await fetchIndex();
  const runtimes = (index.packages?.runtimes?.official || []).map((rt) => {
    const name = rt.id.replace(/^runtime:/, "");
    const check = checkRuntime(name);
    return {
      name,
      registryVersion: rt.version,
      description: rt.description,
      ...check,
      status: check.available ? check.source === "rudi" ? "installed" : "system" : "available"
    };
  });
  const binaries = (index.packages?.binaries?.official || []).map((bin) => {
    const name = bin.id.replace(/^binary:/, "");
    const check = checkBinary(name);
    return {
      name,
      registryVersion: bin.version,
      description: bin.description,
      managed: bin.managed !== false,
      ...check,
      status: check.available ? check.source === "rudi" ? "installed" : "system" : "available"
    };
  });
  return { runtimes, binaries };
}
var import_fs6, import_path6, import_child_process;
var init_deps = __esm({
  "packages/core/src/deps.js"() {
    import_fs6 = __toESM(require("fs"), 1);
    import_path6 = __toESM(require("path"), 1);
    import_child_process = require("child_process");
    init_src();
    init_src2();
  }
});

// packages/core/src/rudi-config.js
function createRudiConfig() {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    version: "1.0.0",
    schemaVersion: 1,
    installed: false,
    installedAt: now,
    updatedAt: now,
    runtimes: {},
    stacks: {},
    binaries: {},
    secrets: {}
  };
}
function createLaunchConfig(command, runtime, stackPath) {
  if (!command || command.length === 0) {
    if (runtime === "python") {
      return {
        bin: getDefaultRuntimeBin("python"),
        args: ["-u", "src/server.py"],
        cwd: stackPath
      };
    }
    return {
      bin: getDefaultRuntimeBin("node"),
      args: ["dist/index.js"],
      cwd: stackPath
    };
  }
  const [bin, ...args] = command;
  let resolvedBin = bin;
  if (bin === "node" || bin === "python" || bin === "python3") {
    resolvedBin = getDefaultRuntimeBin(bin === "python3" ? "python" : bin);
  } else if (bin === "npx") {
    resolvedBin = getDefaultNpxBin();
  }
  return {
    bin: resolvedBin,
    args,
    cwd: stackPath
  };
}
function getDefaultRuntimeBin(runtime) {
  const platform = getPlatform();
  if (runtime === "node") {
    return platform === "win32" ? path7.join(PATHS.runtimes, "node", "node.exe") : path7.join(PATHS.runtimes, "node", "bin", "node");
  }
  if (runtime === "python") {
    return platform === "win32" ? path7.join(PATHS.runtimes, "python", "python.exe") : path7.join(PATHS.runtimes, "python", "bin", "python3");
  }
  return runtime;
}
function getDefaultNpxBin() {
  const platform = getPlatform();
  return platform === "win32" ? path7.join(PATHS.runtimes, "node", "npx.cmd") : path7.join(PATHS.runtimes, "node", "bin", "npx");
}
function acquireLock(timeoutMs = LOCK_TIMEOUT_MS) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      fs7.writeFileSync(RUDI_JSON_LOCK, String(process.pid), { flag: "wx" });
      return true;
    } catch (err) {
      if (err.code === "EEXIST") {
        try {
          const pid = parseInt(fs7.readFileSync(RUDI_JSON_LOCK, "utf-8"), 10);
          try {
            process.kill(pid, 0);
          } catch {
            fs7.unlinkSync(RUDI_JSON_LOCK);
            continue;
          }
        } catch {
        }
        const delay = Math.min(50, timeoutMs - (Date.now() - startTime));
        if (delay > 0) {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
        }
      } else {
        throw err;
      }
    }
  }
  return false;
}
function releaseLock() {
  try {
    fs7.unlinkSync(RUDI_JSON_LOCK);
  } catch {
  }
}
function rudiConfigExists() {
  return fs7.existsSync(RUDI_JSON_PATH);
}
function readRudiConfig() {
  try {
    const content = fs7.readFileSync(RUDI_JSON_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw new Error(`Failed to read rudi.json: ${err.message}`);
  }
}
function writeRudiConfig(config) {
  config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!acquireLock()) {
    throw new Error("Failed to acquire lock for rudi.json (another process may be writing)");
  }
  try {
    const content = JSON.stringify(config, null, 2);
    fs7.writeFileSync(RUDI_JSON_TMP, content, { mode: CONFIG_MODE });
    fs7.renameSync(RUDI_JSON_TMP, RUDI_JSON_PATH);
    fs7.chmodSync(RUDI_JSON_PATH, CONFIG_MODE);
  } finally {
    releaseLock();
  }
}
function initRudiConfig() {
  if (rudiConfigExists()) {
    return readRudiConfig();
  }
  const config = createRudiConfig();
  writeRudiConfig(config);
  return config;
}
function updateRudiConfig(modifier) {
  const config = readRudiConfig() || createRudiConfig();
  modifier(config);
  writeRudiConfig(config);
  return config;
}
function addStack(stackId, stackInfo) {
  updateRudiConfig((config) => {
    const launch = createLaunchConfig(
      stackInfo.command,
      stackInfo.runtime || "node",
      stackInfo.path
    );
    const secrets = (stackInfo.secrets || []).map((s) => ({
      name: typeof s === "string" ? s : s.name,
      required: typeof s === "object" ? s.required !== false : true
    }));
    config.stacks[stackId] = {
      path: stackInfo.path,
      runtime: stackInfo.runtime || "node",
      launch,
      secrets,
      installed: true,
      installedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: stackInfo.version
    };
    for (const secret of secrets) {
      if (!config.secrets[secret.name]) {
        config.secrets[secret.name] = {
          configured: false,
          provider: getDefaultSecretProvider(),
          stack: stackId,
          required: secret.required
        };
      }
    }
  });
}
function removeStack(stackId) {
  updateRudiConfig((config) => {
    delete config.stacks[stackId];
    for (const [secretName, meta] of Object.entries(config.secrets)) {
      if (meta.stack === stackId) {
        const stillNeeded = Object.values(config.stacks).some(
          (stack) => stack.secrets.some((s) => s.name === secretName)
        );
        if (!stillNeeded) {
          delete config.secrets[secretName];
        }
      }
    }
  });
}
function updateStackTools(stackId, tools) {
  updateRudiConfig((config) => {
    if (config.stacks[stackId]) {
      config.stacks[stackId].tools = tools;
    }
  });
}
function addRuntime(runtimeId, runtimeInfo) {
  updateRudiConfig((config) => {
    const platform = getPlatform();
    let bin;
    if (runtimeId === "node") {
      bin = platform === "win32" ? "node.exe" : "bin/node";
    } else if (runtimeId === "python") {
      bin = platform === "win32" ? "python.exe" : "bin/python3";
    } else {
      bin = runtimeId;
    }
    config.runtimes[runtimeId] = {
      path: runtimeInfo.path,
      bin: path7.join(runtimeInfo.path, bin),
      version: runtimeInfo.version
    };
  });
}
function getDefaultSecretProvider() {
  const platform = getPlatform();
  return platform === "darwin" ? "keychain" : "secrets.json";
}
function updateSecretStatus(secretName, configured, provider) {
  updateRudiConfig((config) => {
    if (config.secrets[secretName]) {
      config.secrets[secretName].configured = configured;
      if (provider) {
        config.secrets[secretName].provider = provider;
      }
      config.secrets[secretName].lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    }
  });
}
var fs7, path7, RUDI_JSON_PATH, RUDI_JSON_TMP, RUDI_JSON_LOCK, CONFIG_MODE, LOCK_TIMEOUT_MS;
var init_rudi_config = __esm({
  "packages/core/src/rudi-config.js"() {
    fs7 = __toESM(require("fs"), 1);
    path7 = __toESM(require("path"), 1);
    init_src();
    RUDI_JSON_PATH = path7.join(RUDI_HOME, "rudi.json");
    RUDI_JSON_TMP = path7.join(RUDI_HOME, "rudi.json.tmp");
    RUDI_JSON_LOCK = path7.join(RUDI_HOME, "rudi.json.lock");
    CONFIG_MODE = 384;
    LOCK_TIMEOUT_MS = 5e3;
  }
});

// packages/core/src/tool-index.js
function loadSecrets() {
  try {
    const content = fs8.readFileSync(SECRETS_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
function getStackSecrets(stackConfig) {
  const allSecrets = loadSecrets();
  const secrets = {};
  const missing = [];
  for (const secretDef of stackConfig.secrets || []) {
    const name = typeof secretDef === "string" ? secretDef : secretDef.name;
    const required = typeof secretDef === "object" ? secretDef.required !== false : true;
    if (allSecrets[name] && allSecrets[name].trim() !== "") {
      secrets[name] = allSecrets[name];
    } else if (required) {
      missing.push(name);
    }
  }
  return { secrets, missing };
}
async function discoverStackTools(stackId, stackConfig, options = {}) {
  const { timeout = REQUEST_TIMEOUT_MS, log = () => {
  } } = options;
  const launch = stackConfig.launch;
  if (!launch || !launch.bin) {
    return {
      tools: [],
      error: "No launch configuration",
      missingSecrets: []
    };
  }
  const { secrets, missing } = getStackSecrets(stackConfig);
  if (missing.length > 0) {
    return {
      tools: [],
      error: `Missing required secrets: ${missing.join(", ")}`,
      missingSecrets: missing
    };
  }
  const env = { ...process.env, ...secrets };
  const nodeBin = path8.join(RUDI_HOME, "runtimes", "node", "bin");
  const pythonBin = path8.join(RUDI_HOME, "runtimes", "python", "bin");
  const runtimePaths = [];
  if (fs8.existsSync(nodeBin)) runtimePaths.push(nodeBin);
  if (fs8.existsSync(pythonBin)) runtimePaths.push(pythonBin);
  if (runtimePaths.length > 0) {
    env.PATH = runtimePaths.join(path8.delimiter) + path8.delimiter + (env.PATH || "");
  }
  log(`  Spawning ${stackId}...`);
  return new Promise((resolve) => {
    let resolved = false;
    let childProcess;
    const cleanup = () => {
      if (childProcess && !childProcess.killed) {
        childProcess.kill();
      }
    };
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          tools: [],
          error: `Timeout after ${timeout}ms`,
          missingSecrets: []
        });
      }
    }, timeout);
    try {
      childProcess = (0, import_child_process2.spawn)(launch.bin, launch.args || [], {
        cwd: launch.cwd || stackConfig.path,
        stdio: ["pipe", "pipe", "pipe"],
        env
      });
      const rl = readline.createInterface({
        input: childProcess.stdout,
        terminal: false
      });
      let requestId = 0;
      const pending = /* @__PURE__ */ new Map();
      const send = (method, params = {}) => {
        return new Promise((resolveReq, rejectReq) => {
          const id = ++requestId;
          pending.set(id, { resolve: resolveReq, reject: rejectReq });
          const msg = JSON.stringify({
            jsonrpc: "2.0",
            id,
            method,
            params
          }) + "\n";
          childProcess.stdin.write(msg);
        });
      };
      rl.on("line", (line) => {
        try {
          const response = JSON.parse(line);
          if (response.id !== null && response.id !== void 0) {
            const p = pending.get(response.id);
            if (p) {
              pending.delete(response.id);
              if (response.error) {
                p.reject(new Error(response.error.message || "RPC error"));
              } else {
                p.resolve(response.result);
              }
            }
          }
        } catch {
        }
      });
      childProcess.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve({
            tools: [],
            error: `Spawn error: ${err.message}`,
            missingSecrets: []
          });
        }
      });
      childProcess.on("exit", (code) => {
        if (!resolved && code !== 0) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve({
            tools: [],
            error: `Process exited with code ${code}`,
            missingSecrets: []
          });
        }
      });
      (async () => {
        try {
          await send("initialize", {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: "rudi-index", version: "1.0.0" }
          });
          childProcess.stdin.write(JSON.stringify({
            jsonrpc: "2.0",
            method: "notifications/initialized"
          }) + "\n");
          const result = await send("tools/list");
          const tools = (result?.tools || []).map((t) => ({
            name: t.name,
            description: t.description || t.name,
            inputSchema: t.inputSchema || { type: "object", properties: {} }
          }));
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve({
              tools,
              error: null,
              missingSecrets: []
            });
          }
        } catch (err) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            cleanup();
            resolve({
              tools: [],
              error: err.message,
              missingSecrets: []
            });
          }
        }
      })();
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({
          tools: [],
          error: `Failed to spawn: ${err.message}`,
          missingSecrets: []
        });
      }
    }
  });
}
function readToolIndex() {
  try {
    const content = fs8.readFileSync(TOOL_INDEX_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeToolIndex(index) {
  const cacheDir = path8.dirname(TOOL_INDEX_PATH);
  if (!fs8.existsSync(cacheDir)) {
    fs8.mkdirSync(cacheDir, { recursive: true });
  }
  index.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const content = JSON.stringify(index, null, 2);
  fs8.writeFileSync(TOOL_INDEX_TMP, content, { mode: 384 });
  fs8.renameSync(TOOL_INDEX_TMP, TOOL_INDEX_PATH);
}
function createToolIndex() {
  return {
    version: 1,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    byStack: {}
  };
}
async function indexAllStacks(options = {}) {
  const { stacks: stackFilter, log = console.log, timeout } = options;
  const config = readRudiConfig();
  if (!config) {
    throw new Error("rudi.json not found");
  }
  const index = readToolIndex() || createToolIndex();
  let indexed = 0;
  let failed = 0;
  const stackIds = stackFilter || Object.keys(config.stacks || {});
  for (const stackId of stackIds) {
    const stackConfig = config.stacks[stackId];
    if (!stackConfig) {
      log(`  \u26A0 Stack not found: ${stackId}`);
      failed++;
      continue;
    }
    if (!stackConfig.installed) {
      log(`  \u26A0 Stack not installed: ${stackId}`);
      failed++;
      continue;
    }
    log(`Indexing ${stackId}...`);
    const result = await discoverStackTools(stackId, stackConfig, { timeout, log });
    index.byStack[stackId] = {
      indexedAt: (/* @__PURE__ */ new Date()).toISOString(),
      tools: result.tools,
      error: result.error,
      missingSecrets: result.missingSecrets.length > 0 ? result.missingSecrets : void 0
    };
    if (result.error) {
      log(`  \u2717 ${result.error}`);
      failed++;
    } else {
      log(`  \u2713 ${result.tools.length} tools`);
      indexed++;
    }
  }
  writeToolIndex(index);
  return { indexed, failed, index };
}
var import_child_process2, fs8, path8, readline, TOOL_INDEX_PATH, TOOL_INDEX_TMP, SECRETS_PATH, REQUEST_TIMEOUT_MS, PROTOCOL_VERSION;
var init_tool_index = __esm({
  "packages/core/src/tool-index.js"() {
    import_child_process2 = require("child_process");
    fs8 = __toESM(require("fs"), 1);
    path8 = __toESM(require("path"), 1);
    readline = __toESM(require("readline"), 1);
    init_src();
    init_rudi_config();
    TOOL_INDEX_PATH = path8.join(RUDI_HOME, "cache", "tool-index.json");
    TOOL_INDEX_TMP = path8.join(RUDI_HOME, "cache", "tool-index.json.tmp");
    SECRETS_PATH = path8.join(RUDI_HOME, "secrets.json");
    REQUEST_TIMEOUT_MS = 15e3;
    PROTOCOL_VERSION = "2024-11-05";
  }
});

// packages/core/src/system-registry.js
async function registerSystemBinary(name, options = {}) {
  const {
    searchPaths = getDefaultSearchPaths(),
    bins = [name]
  } = options;
  const systemPath = findSystemBinary(name, searchPaths);
  if (!systemPath) {
    return {
      success: false,
      error: `${name} not found in system paths: ${searchPaths.join(", ")}`
    };
  }
  try {
    (0, import_child_process3.execSync)(`"${systemPath}" --version`, { stdio: "pipe" });
  } catch (error) {
    return {
      success: false,
      path: systemPath,
      error: `${name} found at ${systemPath} but is not functional: ${error.message}`
    };
  }
  const installPath = getPackagePath(`binary:${name}`);
  import_fs7.default.mkdirSync(installPath, { recursive: true });
  const manifest = {
    id: `binary:${name}`,
    installType: "system",
    installedAt: (/* @__PURE__ */ new Date()).toISOString(),
    bins,
    source: {
      type: "system",
      path: systemPath
    }
  };
  import_fs7.default.writeFileSync(
    import_path7.default.join(installPath, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  try {
    await createShimsForTool({
      id: `binary:${name}`,
      installType: "system",
      installDir: installPath,
      bins,
      source: { path: systemPath }
    });
  } catch (error) {
    return {
      success: false,
      path: systemPath,
      error: `Failed to create shims: ${error.message}`
    };
  }
  console.log(`[System Registry] Registered ${name} from ${systemPath}`);
  return { success: true, path: systemPath };
}
function isSystemBinaryRegistered(name) {
  const installPath = getPackagePath(`binary:${name}`);
  const manifestPath = import_path7.default.join(installPath, "manifest.json");
  if (!import_fs7.default.existsSync(manifestPath)) {
    return false;
  }
  try {
    const manifest = JSON.parse(import_fs7.default.readFileSync(manifestPath, "utf-8"));
    return manifest.installType === "system";
  } catch {
    return false;
  }
}
function getDefaultSearchPaths() {
  const paths = [];
  if (process.platform === "darwin") {
    paths.push("/opt/homebrew/bin");
    paths.push("/usr/local/bin");
  } else if (process.platform === "linux") {
    paths.push("/usr/local/bin");
  }
  paths.push("/usr/bin");
  paths.push("/bin");
  return paths;
}
function findSystemBinary(name, searchPaths) {
  for (const searchPath of searchPaths) {
    const binaryPath = import_path7.default.join(searchPath, name);
    if (import_fs7.default.existsSync(binaryPath)) {
      try {
        import_fs7.default.accessSync(binaryPath, import_fs7.default.constants.X_OK);
        return binaryPath;
      } catch {
        continue;
      }
    }
  }
  return null;
}
async function unregisterSystemBinary(name) {
  const installPath = getPackagePath(`binary:${name}`);
  if (!import_fs7.default.existsSync(installPath)) {
    return { success: false, error: `${name} is not registered` };
  }
  try {
    const manifestPath = import_path7.default.join(installPath, "manifest.json");
    let bins = [name];
    if (import_fs7.default.existsSync(manifestPath)) {
      const manifest = JSON.parse(import_fs7.default.readFileSync(manifestPath, "utf-8"));
      bins = manifest.bins || [name];
    }
    const { removeShims: removeShims2 } = await Promise.resolve().then(() => (init_shims(), shims_exports));
    removeShims2(bins);
    import_fs7.default.rmSync(installPath, { recursive: true });
    console.log(`[System Registry] Unregistered ${name}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
function getSystemBinaryInfo(name) {
  const installPath = getPackagePath(`binary:${name}`);
  const manifestPath = import_path7.default.join(installPath, "manifest.json");
  if (!import_fs7.default.existsSync(manifestPath)) {
    return null;
  }
  try {
    const manifest = JSON.parse(import_fs7.default.readFileSync(manifestPath, "utf-8"));
    if (manifest.installType !== "system") {
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}
var import_fs7, import_path7, import_child_process3;
var init_system_registry = __esm({
  "packages/core/src/system-registry.js"() {
    import_fs7 = __toESM(require("fs"), 1);
    import_path7 = __toESM(require("path"), 1);
    import_child_process3 = require("child_process");
    init_src();
    init_shims();
  }
});

// packages/core/src/index.js
var src_exports = {};
__export(src_exports, {
  CONFIG_MODE: () => CONFIG_MODE,
  PATHS: () => PATHS,
  RUDI_JSON_PATH: () => RUDI_JSON_PATH,
  TOOL_INDEX_PATH: () => TOOL_INDEX_PATH,
  addRuntime: () => addRuntime,
  addStack: () => addStack,
  checkAllDependencies: () => checkAllDependencies,
  checkBinary: () => checkBinary,
  checkDependencies: () => checkDependencies,
  checkRuntime: () => checkRuntime,
  cleanOrphanedLockfiles: () => cleanOrphanedLockfiles,
  clearCache: () => clearCache,
  createLaunchConfig: () => createLaunchConfig,
  createPackageId: () => createPackageId,
  createRudiConfig: () => createRudiConfig,
  createShimsForTool: () => createShimsForTool,
  createToolIndex: () => createToolIndex,
  deleteLockfile: () => deleteLockfile,
  discoverStackTools: () => discoverStackTools,
  ensureDirectories: () => ensureDirectories,
  ensureUv: () => ensureUv,
  fetchIndex: () => fetchIndex,
  findUvExecutable: () => findUvExecutable,
  formatDependencyResults: () => formatDependencyResults,
  getAllDepsFromRegistry: () => getAllDepsFromRegistry,
  getAllLockfiles: () => getAllLockfiles,
  getAllShimOwners: () => getAllShimOwners,
  getAvailableDeps: () => getAvailableDeps,
  getDefaultNpxBin: () => getDefaultNpxBin,
  getDefaultRuntimeBin: () => getDefaultRuntimeBin,
  getDefaultSecretProvider: () => getDefaultSecretProvider,
  getInstallOrder: () => getInstallOrder,
  getInstalledPackages: () => getInstalledPackages,
  getLockfilePath: () => getLockfilePath,
  getPackage: () => getPackage,
  getPackagePath: () => getPackagePath,
  getShimOwner: () => getShimOwner,
  getSystemBinaryInfo: () => getSystemBinaryInfo,
  hasLockfile: () => hasLockfile,
  indexAllStacks: () => indexAllStacks,
  initRudiConfig: () => initRudiConfig,
  installFromLocal: () => installFromLocal,
  installPackage: () => installPackage,
  isPackageInstalled: () => isPackageInstalled,
  isSystemBinaryRegistered: () => isSystemBinaryRegistered,
  listInstalled: () => listInstalled,
  listPackages: () => listPackages,
  listShims: () => listShims,
  parsePackageId: () => parsePackageId,
  readLockfile: () => readLockfile,
  readRudiConfig: () => readRudiConfig,
  readToolIndex: () => readToolIndex,
  registerSystemBinary: () => registerSystemBinary,
  removeShims: () => removeShims,
  removeStack: () => removeStack,
  resolvePackage: () => resolvePackage,
  resolvePackages: () => resolvePackages,
  rudiConfigExists: () => rudiConfigExists,
  satisfiesVersion: () => satisfiesVersion,
  searchPackages: () => searchPackages,
  uninstallPackage: () => uninstallPackage,
  unregisterSystemBinary: () => unregisterSystemBinary,
  updateAll: () => updateAll,
  updatePackage: () => updatePackage,
  updateRudiConfig: () => updateRudiConfig,
  updateSecretStatus: () => updateSecretStatus,
  updateStackTools: () => updateStackTools,
  validateShim: () => validateShim,
  verifyLockfile: () => verifyLockfile,
  writeLockfile: () => writeLockfile,
  writeRudiConfig: () => writeRudiConfig,
  writeToolIndex: () => writeToolIndex
});
var init_src3 = __esm({
  "packages/core/src/index.js"() {
    init_src();
    init_src2();
    init_resolver();
    init_installer();
    init_lockfile();
    init_deps();
    init_rudi_config();
    init_tool_index();
    init_shims();
    init_system_registry();
  }
});

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/shims.js
var init_shims2 = __esm({
  "node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/shims.js"() {
    init_src();
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.regexpCode = exports2.getEsmExportName = exports2.getProperty = exports2.safeStringify = exports2.stringify = exports2.strConcat = exports2.addCodeArg = exports2.str = exports2._ = exports2.nil = exports2._Code = exports2.Name = exports2.IDENTIFIER = exports2._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports2._CodeOrName = _CodeOrName;
    exports2.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s) {
        super();
        if (!exports2.IDENTIFIER.test(s))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports2.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
          if (c instanceof Name)
            names[c.str] = (names[c.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports2._Code = _Code;
    exports2.nil = new _Code("");
    function _(strs, ...args) {
      const code = [strs[0]];
      let i = 0;
      while (i < args.length) {
        addCodeArg(code, args[i]);
        code.push(strs[++i]);
      }
      return new _Code(code);
    }
    exports2._ = _;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i = 0;
      while (i < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i]);
        expr.push(plus, safeStringify(strs[++i]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports2.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports2.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i = 1;
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1]);
          if (res !== void 0) {
            expr.splice(i - 1, 3, res);
            continue;
          }
          expr[i++] = "+";
        }
        i++;
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""')
        return a;
      if (a === '""')
        return b;
      if (typeof a == "string") {
        if (b instanceof Name || a[a.length - 1] !== '"')
          return;
        if (typeof b != "string")
          return `${a.slice(0, -1)}${b}"`;
        if (b[0] === '"')
          return a.slice(0, -1) + b.slice(1);
        return;
      }
      if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
        return `"${a}${b.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
    }
    exports2.strConcat = strConcat;
    function interpolate(x) {
      return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
    }
    function stringify(x) {
      return new _Code(safeStringify(x));
    }
    exports2.stringify = stringify;
    function safeStringify(x) {
      return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports2.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports2.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
    }
    exports2.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports2.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports2.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports2.regexpCode = regexpCode;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/scope.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueScope = exports2.ValueScopeName = exports2.Scope = exports2.varKinds = exports2.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports2.UsedValueState = UsedValueState = {}));
    exports2.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports2.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports2.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s.length;
        s[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c = valueCode(name);
            if (c) {
              const def = this.opts.es5 ? exports2.varKinds.var : exports2.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
            } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports2.ValueScope = ValueScope;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/codegen/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.or = exports2.and = exports2.not = exports2.CodeGen = exports2.operators = exports2.varKinds = exports2.ValueScopeName = exports2.ValueScope = exports2.Scope = exports2.Name = exports2.regexpCode = exports2.stringify = exports2.getProperty = exports2.nil = exports2.strConcat = exports2.str = exports2._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports2, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports2, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports2, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports2, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports2, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports2, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports2, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports2.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n) => code + n.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i].optimizeNodes();
          if (Array.isArray(n))
            nodes.splice(i, 1, ...n);
          else if (n)
            nodes[i] = n;
          else
            nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i];
          if (n.optimizeNames(names, constants))
            continue;
          subtractNames(names, n.names);
          nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e = this.else;
        if (e) {
          const ns = e.optimizeNodes();
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e) {
          if (cond === false)
            return e instanceof _If ? e : e.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e instanceof _If ? [e] : e.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports2.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == "function")
          c();
        else if (c !== code_1.nil)
          this._leafNode(new AnyCode(c));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
            this.var(name, (0, code_1._)`${arr}[${i}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode;
        if (n instanceof N1 || N2 && n instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n = this._currNode;
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports2.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) + (from[n] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name)
          c = replaceName(c);
        if (c instanceof code_1._Code)
          items.push(...c._items);
        else
          items.push(c);
        return items;
      }, []));
      function replaceName(n) {
        const c = constants[n.str];
        if (c === void 0 || names[n.str] !== 1)
          return n;
        delete names[n.str];
        return c;
      }
      function canOptimize(e) {
        return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) - (from[n] || 0);
    }
    function not(x) {
      return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
    }
    exports2.not = not;
    var andCode = mappend(exports2.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports2.and = and;
    var orCode = mappend(exports2.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports2.or = or;
    function mappend(op) {
      return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
    }
    function par(x) {
      return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkStrictMode = exports2.getErrorPath = exports2.Type = exports2.useFunc = exports2.setEvaluated = exports2.evaluatedPropsToName = exports2.mergeEvaluated = exports2.eachItem = exports2.unescapeJsonPointer = exports2.escapeJsonPointer = exports2.escapeFragment = exports2.unescapeFragment = exports2.schemaRefOrVal = exports2.schemaHasRulesButRef = exports2.schemaHasRules = exports2.checkUnknownRules = exports2.alwaysValidSchema = exports2.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports2.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports2.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports2.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports2.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports2.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports2.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports2.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports2.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports2.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports2.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    exports2.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports2.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports2.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    exports2.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    exports2.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports2.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports2.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports2.checkStrictMode = checkStrictMode;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/names.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports2.default = names;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/errors.js
var require_errors2 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/errors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendErrors = exports2.resetErrorsCount = exports2.reportExtraError = exports2.reportError = exports2.keyword$DataError = exports2.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports2.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports2.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports2.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports2.reportError = reportError;
    function reportExtraError(cxt, error = exports2.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports2.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports2.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports2.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E.propertyName, propertyName]);
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/boolSchema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.boolOrEmptySchema = exports2.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports2.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports2.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/rules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getRules = exports2.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    exports2.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports2.getRules = getRules;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/applicability.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.shouldUseRule = exports2.shouldUseGroup = exports2.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports2.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports2.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports2.shouldUseRule = shouldUseRule;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/dataType.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.reportTypeError = exports2.checkDataTypes = exports2.checkDataType = exports2.coerceAndCheckDataType = exports2.getJSONTypes = exports2.getSchemaTypes = exports2.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports2.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types = getJSONTypes(schema.type);
      const hasNull = types.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types.push("null");
      }
      return types;
    }
    exports2.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types.every(rules_1.isJSONType))
        return types;
      throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
    }
    exports2.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types, opts.coerceTypes);
      const checkTypes = types.length > 0 && !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports2.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types, coerceTypes) {
      return coerceTypes ? types.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports2.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types = (0, util_1.toHash)(dataTypes);
      if (types.array && types.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types.null;
        delete types.array;
        delete types.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types.number)
        delete types.integer;
      for (const t in types)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    exports2.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports2.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/defaults.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    exports2.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateUnion = exports2.validateArray = exports2.usePattern = exports2.callValidateCode = exports2.schemaProperties = exports2.allSchemaProperties = exports2.noPropertyInData = exports2.propertyInData = exports2.isOwnProperty = exports2.hasPropFunc = exports2.reportMissingProp = exports2.checkMissingProp = exports2.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports2.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports2.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports2.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports2.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports2.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports2.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports2.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    exports2.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    exports2.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports2.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
      });
    }
    exports2.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports2.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports2.validateUnion = validateUnion;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/keyword.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateKeywordUsage = exports2.validSchemaType = exports2.funcKeywordCode = exports2.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors2();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports2.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports2.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports2.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports2.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/subschema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendSubschemaMode = exports2.extendSubschemaData = exports2.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports2.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports2.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports2.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js"(exports2, module2) {
    "use strict";
    var traverse = module2.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/resolve.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getSchemaRefs = exports2.resolveUrl = exports2.normalizeId = exports2._getFullPath = exports2.getFullPath = exports2.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports2.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p = resolver.parse(id);
      return _getFullPath(resolver, p);
    }
    exports2.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    exports2._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports2.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports2.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports2.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/validate/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getData = exports2.KeywordCxt = exports2.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors2();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports2.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
      schemaKeywords(it, types, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types.length === 1 && types[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types) {
      if (!types.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types;
        return;
      }
      types.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports2.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports2.getData = getData;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/validation_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports2.default = ValidationError;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/ref_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports2.default = MissingRefError;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/compile/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveSchema = exports2.getCompilingSchema = exports2.resolveRef = exports2.compileSchema = exports2.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports2.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports2.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports2.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports2.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    exports2.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/refs/data.json"(exports2, module2) {
    module2.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/lib/utils.js"(exports2, module2) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i = 0;
      for (i = 0; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
        break;
      }
      for (i += 1; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
      }
      return acc;
    }
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function consumeIsZone(buffer) {
      buffer.length = 0;
      return true;
    }
    function consumeHextets(buffer, address, output) {
      if (buffer.length) {
        const hex = stringArrayToHexStripped(buffer);
        if (hex !== "") {
          address.push(hex);
        } else {
          output.error = true;
          return false;
        }
        buffer.length = 0;
      }
      return true;
    }
    function getIPV6(input) {
      let tokenCount = 0;
      const output = { error: false, address: "", zone: "" };
      const address = [];
      const buffer = [];
      let endipv6Encountered = false;
      let endIpv6 = false;
      let consume = consumeHextets;
      for (let i = 0; i < input.length; i++) {
        const cursor = input[i];
        if (cursor === "[" || cursor === "]") {
          continue;
        }
        if (cursor === ":") {
          if (endipv6Encountered === true) {
            endIpv6 = true;
          }
          if (!consume(buffer, address, output)) {
            break;
          }
          if (++tokenCount > 7) {
            output.error = true;
            break;
          }
          if (i > 0 && input[i - 1] === ":") {
            endipv6Encountered = true;
          }
          address.push(":");
          continue;
        } else if (cursor === "%") {
          if (!consume(buffer, address, output)) {
            break;
          }
          consume = consumeIsZone;
        } else {
          buffer.push(cursor);
          continue;
        }
      }
      if (buffer.length) {
        if (consume === consumeIsZone) {
          output.zone = buffer.join("");
        } else if (endIpv6) {
          address.push(buffer.join(""));
        } else {
          address.push(stringArrayToHexStripped(buffer));
        }
      }
      output.address = address.join("");
      return output;
    }
    function normalizeIPv6(host) {
      if (findToken(host, ":") < 2) {
        return { host, isIPV6: false };
      }
      const ipv6 = getIPV6(host);
      if (!ipv6.error) {
        let newHost = ipv6.address;
        let escapedHost = ipv6.address;
        if (ipv6.zone) {
          newHost += "%" + ipv6.zone;
          escapedHost += "%25" + ipv6.zone;
        }
        return { host: newHost, isIPV6: true, escapedHost };
      } else {
        return { host, isIPV6: false };
      }
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path35) {
      let input = path35;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    function normalizeComponentEncoding(component, esc) {
      const func = esc !== true ? escape : unescape;
      if (component.scheme !== void 0) {
        component.scheme = func(component.scheme);
      }
      if (component.userinfo !== void 0) {
        component.userinfo = func(component.userinfo);
      }
      if (component.host !== void 0) {
        component.host = func(component.host);
      }
      if (component.path !== void 0) {
        component.path = func(component.path);
      }
      if (component.query !== void 0) {
        component.query = func(component.query);
      }
      if (component.fragment !== void 0) {
        component.fragment = func(component.fragment);
      }
      return component;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(component.userinfo);
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = unescape(component.host);
        if (!isIPv4(host)) {
          const ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = component.host;
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        uriTokens.push(":");
        uriTokens.push(String(component.port));
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module2.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      normalizeComponentEncoding,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/lib/schemes.js"(exports2, module2) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const [path35, query] = wsComponent.resourceName.split("?");
        wsComponent.path = path35 && path35 !== "/" ? path35 : void 0;
        wsComponent.query = query;
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module2.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.0/node_modules/fast-uri/index.js"(exports2, module2) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizeComponentEncoding, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        serialize(parse(uri, options), options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const resolved = resolveComponent(parse(baseURI, schemelessOptions), parse(relativeURI, schemelessOptions), schemelessOptions, true);
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      if (typeof uriA === "string") {
        uriA = unescape(uriA);
        uriA = serialize(normalizeComponentEncoding(parse(uriA, options), true), { ...options, skipEscape: true });
      } else if (typeof uriA === "object") {
        uriA = serialize(normalizeComponentEncoding(uriA, true), { ...options, skipEscape: true });
      }
      if (typeof uriB === "string") {
        uriB = unescape(uriB);
        uriB = serialize(normalizeComponentEncoding(parse(uriB, options), true), { ...options, skipEscape: true });
      } else if (typeof uriB === "object") {
        uriB = serialize(normalizeComponentEncoding(uriB, true), { ...options, skipEscape: true });
      }
      return uriA.toLowerCase() === uriB.toLowerCase();
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = escape(component.path);
          if (component.scheme !== void 0) {
            component.path = component.path.split("%3A").join(":");
          }
        } else {
          component.path = unescape(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (authority === void 0 && s[0] === "/" && s[1] === "/") {
          s = "/%2F" + s.slice(2);
        }
        uriTokens.push(s);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", component.query);
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", component.fragment);
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    function parse(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const ipv6result = normalizeIPv6(parsed.host);
            parsed.host = ipv6result.host.toLowerCase();
            isIP = ipv6result.isIPV6;
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
          if (parsed.host && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
            try {
              parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
            } catch (e) {
              parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
            }
          }
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (uri.indexOf("%") !== -1) {
            if (parsed.scheme !== void 0) {
              parsed.scheme = unescape(parsed.scheme);
            }
            if (parsed.host !== void 0) {
              parsed.host = unescape(parsed.host);
            }
          }
          if (parsed.path) {
            parsed.path = escape(unescape(parsed.path));
          }
          if (parsed.fragment) {
            parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return parsed;
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module2.exports = fastUri;
    module2.exports.default = fastUri;
    module2.exports.fastUri = fastUri;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/uri.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports2.default = uri;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s = o.strict;
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv2 = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = {};
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v;
        if (typeof schemaKeyRef == "string") {
          v = this.getSchema(schemaKeyRef);
          if (!v)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v = this.compile(schemaKeyRef);
        }
        const valid = v(data);
        if (!("$async" in v))
          this.errors = v.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e) {
            if (!(e instanceof ref_error_1.default))
              throw e;
            checkLoaded.call(this, e);
            await loadMissingSchema.call(this, e.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p = this._loading[ref];
          if (p)
            return p;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions) {
        for (const def of definitions)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i >= 0)
            group.rules.splice(i, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text, msg) => text + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv2.ValidationError = validation_error_1.default;
    Ajv2.MissingRefError = ref_error_1.default;
    exports2.default = Ajv2;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/ref.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.callRef = exports2.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports2.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports2.callRef = callRef;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/core/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports2.default = core;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/ucs2length.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports2.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        const regExp = $data ? (0, codegen_1._)`(new RegExp(${schemaCode}, ${u}))` : (0, code_1.usePattern)(cxt, schema);
        cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/required.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/runtime/equal.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports2.default = equal;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/const.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/enum.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/validation/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports2.default = validation;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
          cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports2.validateAdditionalItems = validateAdditionalItems;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/items.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports2.validateTuple = validateTuple;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateSchemaDeps = exports2.validatePropertyDeps = exports2.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports2.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports2.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports2.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports2.validateSchemaDeps = validateSchemaDeps;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/not.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/if.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/applicator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports2.default = getApplicator;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/format/format.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/format/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports2.default = format;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/metadata.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.contentVocabulary = exports2.metadataVocabulary = void 0;
    exports2.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports2.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/draft7.js
var require_draft7 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/draft7.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    exports2.default = draft7Vocabularies;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports2.DiscrError = DiscrError = {}));
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf.length; i++) {
            let sch = oneOf[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/refs/json-schema-draft-07.json
var require_json_schema_draft_07 = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/refs/json-schema-draft-07.json"(exports2, module2) {
    module2.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $ref: "#" }
        },
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      },
      type: ["object", "boolean"],
      properties: {
        $id: {
          type: "string",
          format: "uri-reference"
        },
        $schema: {
          type: "string",
          format: "uri"
        },
        $ref: {
          type: "string",
          format: "uri-reference"
        },
        $comment: {
          type: "string"
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        readOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        additionalItems: { $ref: "#" },
        items: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
          default: true
        },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        properties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependencies: {
          type: "object",
          additionalProperties: {
            anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
          }
        },
        propertyNames: { $ref: "#" },
        const: true,
        enum: {
          type: "array",
          items: true,
          minItems: 1,
          uniqueItems: true
        },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/definitions/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" }
      },
      default: true
    };
  }
});

// node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/ajv.js
var require_ajv = __commonJS({
  "node_modules/.pnpm/ajv@8.17.1/node_modules/ajv/dist/ajv.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MissingRefError = exports2.ValidationError = exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = exports2.Ajv = void 0;
    var core_1 = require_core();
    var draft7_1 = require_draft7();
    var discriminator_1 = require_discriminator();
    var draft7MetaSchema = require_json_schema_draft_07();
    var META_SUPPORT_DATA = ["/properties"];
    var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
    var Ajv2 = class extends core_1.default {
      _addVocabularies() {
        super._addVocabularies();
        draft7_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
          return;
        const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports2.Ajv = Ajv2;
    module2.exports = exports2 = Ajv2;
    module2.exports.Ajv = Ajv2;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = Ajv2;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports2, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports2, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/formats.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatNames = exports2.fastFormats = exports2.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports2.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports2.fastFormats = {
      ...exports2.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports2.formatNames = Object.keys(exports2.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/limit.js
var require_limit = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/limit.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatLimitDefinition = void 0;
    var ajv_1 = require_ajv();
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    exports2.formatLimitDefinition = {
      keyword: Object.keys(KWDs),
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats)
          return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
          cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
          const format = fCxt.schema;
          const fmtDef = self.formats[format];
          if (!fmtDef || fmtDef === true)
            return;
          if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
            throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
          }
          const fmt = gen.scopeValue("formats", {
            key: format,
            ref: fmtDef,
            code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
          });
          cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
          return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
      },
      dependencies: ["format"]
    };
    var formatLimitPlugin = (ajv2) => {
      ajv2.addKeyword(exports2.formatLimitDefinition);
      return ajv2;
    };
    exports2.default = formatLimitPlugin;
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.17.1/node_modules/ajv-formats/dist/index.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var formats_1 = require_formats();
    var limit_1 = require_limit();
    var codegen_1 = require_codegen();
    var fullName = new codegen_1.Name("fullFormats");
    var fastName = new codegen_1.Name("fastFormats");
    var formatsPlugin = (ajv2, opts = { keywords: true }) => {
      if (Array.isArray(opts)) {
        addFormats2(ajv2, opts, formats_1.fullFormats, fullName);
        return ajv2;
      }
      const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
      const list = opts.formats || formats_1.formatNames;
      addFormats2(ajv2, list, formats, exportName);
      if (opts.keywords)
        (0, limit_1.default)(ajv2);
      return ajv2;
    };
    formatsPlugin.get = (name, mode = "full") => {
      const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
      const f = formats[name];
      if (!f)
        throw new Error(`Unknown format "${name}"`);
      return f;
    };
    function addFormats2(ajv2, list, fs35, exportName) {
      var _a;
      var _b;
      (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
      for (const f of list)
        ajv2.addFormat(f, fs35[f]);
    }
    module2.exports = exports2 = formatsPlugin;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = formatsPlugin;
  }
});

// packages/registry-client/src/index.js
var src_exports2 = {};
__export(src_exports2, {
  CACHE_TTL: () => CACHE_TTL2,
  DEFAULT_REGISTRY_URL: () => DEFAULT_REGISTRY_URL2,
  PACKAGE_KINDS: () => PACKAGE_KINDS4,
  RUNTIMES_DOWNLOAD_BASE: () => RUNTIMES_DOWNLOAD_BASE2,
  RUNTIMES_RELEASE_VERSION: () => RUNTIMES_RELEASE_VERSION2,
  checkCache: () => checkCache,
  clearCache: () => clearCache2,
  computeHash: () => computeHash,
  downloadPackage: () => downloadPackage2,
  downloadRuntime: () => downloadRuntime2,
  downloadTool: () => downloadTool2,
  fetchIndex: () => fetchIndex2,
  getManifest: () => getManifest2,
  getPackage: () => getPackage2,
  getPackageKinds: () => getPackageKinds,
  listPackages: () => listPackages2,
  searchPackages: () => searchPackages2,
  verifyHash: () => verifyHash
});
function getLocalRegistryPaths2() {
  if (process.env.USE_LOCAL_REGISTRY !== "true") {
    return [];
  }
  return [
    import_path18.default.join(process.cwd(), "registry", "index.json"),
    import_path18.default.join(process.cwd(), "..", "registry", "index.json"),
    "/Users/hoff/dev/RUDI/registry/index.json"
  ];
}
async function fetchIndex2(options = {}) {
  const { url = DEFAULT_REGISTRY_URL2, force = false } = options;
  const localResult = getLocalIndex2();
  if (localResult) {
    const { index: localIndex, mtime: localMtime } = localResult;
    const cacheMtime = getCacheMtime2();
    if (force || !cacheMtime || localMtime > cacheMtime) {
      cacheIndex2(localIndex);
      return localIndex;
    }
  }
  if (!force) {
    const cached = getCachedIndex2();
    if (cached) {
      return cached;
    }
  }
  if (localResult) {
    return localResult.index;
  }
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "rudi-cli/2.0"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const index = await response.json();
    cacheIndex2(index);
    return index;
  } catch (error) {
    const fallback = getLocalIndex2();
    if (fallback) {
      return fallback.index;
    }
    throw new Error(`Failed to fetch registry: ${error.message}`);
  }
}
function getCachedIndex2() {
  const cachePath = PATHS.registryCache;
  if (!import_fs19.default.existsSync(cachePath)) {
    return null;
  }
  try {
    const stat = import_fs19.default.statSync(cachePath);
    const age = Date.now() - stat.mtimeMs;
    if (age > CACHE_TTL2) {
      return null;
    }
    return JSON.parse(import_fs19.default.readFileSync(cachePath, "utf-8"));
  } catch {
    return null;
  }
}
function cacheIndex2(index) {
  const cachePath = PATHS.registryCache;
  const cacheDir = import_path18.default.dirname(cachePath);
  if (!import_fs19.default.existsSync(cacheDir)) {
    import_fs19.default.mkdirSync(cacheDir, { recursive: true });
  }
  import_fs19.default.writeFileSync(cachePath, JSON.stringify(index, null, 2));
}
function getCacheMtime2() {
  const cachePath = PATHS.registryCache;
  if (!import_fs19.default.existsSync(cachePath)) {
    return null;
  }
  try {
    return import_fs19.default.statSync(cachePath).mtimeMs;
  } catch {
    return null;
  }
}
function getLocalIndex2() {
  for (const localPath of getLocalRegistryPaths2()) {
    if (import_fs19.default.existsSync(localPath)) {
      try {
        const index = JSON.parse(import_fs19.default.readFileSync(localPath, "utf-8"));
        const mtime = import_fs19.default.statSync(localPath).mtimeMs;
        return { index, mtime };
      } catch {
        continue;
      }
    }
  }
  return null;
}
function clearCache2() {
  if (import_fs19.default.existsSync(PATHS.registryCache)) {
    import_fs19.default.unlinkSync(PATHS.registryCache);
  }
}
function checkCache() {
  const cachePath = PATHS.registryCache;
  if (!import_fs19.default.existsSync(cachePath)) {
    return { fresh: false, age: null };
  }
  try {
    const stat = import_fs19.default.statSync(cachePath);
    const age = Date.now() - stat.mtimeMs;
    return { fresh: age <= CACHE_TTL2, age };
  } catch {
    return { fresh: false, age: null };
  }
}
function getKindSection2(kind) {
  return KIND_PLURALS2[kind] || `${kind}s`;
}
async function searchPackages2(query, options = {}) {
  const { kind } = options;
  const index = await fetchIndex2();
  const results = [];
  const queryLower = query.toLowerCase();
  const kinds = kind ? [kind] : PACKAGE_KINDS4;
  for (const k of kinds) {
    const section = index.packages?.[getKindSection2(k)];
    if (!section) continue;
    const packages = [...section.official || [], ...section.community || []];
    for (const pkg of packages) {
      if (matchesQuery2(pkg, queryLower)) {
        results.push({ ...pkg, kind: k });
      }
    }
  }
  return results;
}
function matchesQuery2(pkg, query) {
  const searchable = [
    pkg.id || "",
    pkg.name || "",
    pkg.description || "",
    ...pkg.tags || []
  ].join(" ").toLowerCase();
  return searchable.includes(query);
}
async function getPackage2(id) {
  const index = await fetchIndex2();
  const [kind, name] = id.includes(":") ? id.split(":") : [null, id];
  const kinds = kind ? [kind] : PACKAGE_KINDS4;
  for (const k of kinds) {
    const section = index.packages?.[getKindSection2(k)];
    if (!section) continue;
    const packages = [...section.official || [], ...section.community || []];
    for (const pkg of packages) {
      const kindPrefixPattern = new RegExp(`^(${PACKAGE_KINDS4.join("|")}):`);
      const pkgShortId = pkg.id?.replace(kindPrefixPattern, "") || "";
      if (pkgShortId === name || pkg.id === id) {
        return { ...pkg, kind: k };
      }
    }
  }
  return null;
}
async function getManifest2(pkg) {
  if (!pkg || !pkg.path) {
    return null;
  }
  const manifestPath = pkg.path;
  if (process.env.USE_LOCAL_REGISTRY === "true") {
    const localPaths = [
      import_path18.default.join(process.cwd(), "registry", manifestPath),
      import_path18.default.join(process.cwd(), "..", "registry", manifestPath),
      `/Users/hoff/dev/RUDI/registry/${manifestPath}`
    ];
    for (const localPath of localPaths) {
      if (import_fs19.default.existsSync(localPath)) {
        try {
          const content = import_fs19.default.readFileSync(localPath, "utf-8");
          return JSON.parse(content);
        } catch (err) {
        }
      }
    }
  }
  try {
    const url = `${GITHUB_RAW_BASE2}/${manifestPath}`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "rudi-cli/2.0"
      }
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (err) {
    return null;
  }
}
async function listPackages2(kind) {
  const index = await fetchIndex2();
  const section = index.packages?.[getKindSection2(kind)];
  if (!section) return [];
  return [...section.official || [], ...section.community || []];
}
function getPackageKinds() {
  return PACKAGE_KINDS4;
}
async function downloadPackage2(pkg, destPath, options = {}) {
  const { onProgress } = options;
  const registryPath = pkg.path;
  if (!import_fs19.default.existsSync(destPath)) {
    import_fs19.default.mkdirSync(destPath, { recursive: true });
  }
  onProgress?.({ phase: "downloading", package: pkg.name || pkg.id });
  if (pkg.kind === "stack" || registryPath.includes("/stacks/")) {
    await downloadStackFromGitHub2(registryPath, destPath, onProgress);
    return { success: true, path: destPath };
  }
  if (registryPath.endsWith(".md")) {
    const url = `${GITHUB_RAW_BASE2}/${registryPath}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (!response.ok) {
      throw new Error(`Failed to download ${registryPath}: HTTP ${response.status}`);
    }
    const content = await response.text();
    const destDir = import_path18.default.dirname(destPath);
    if (!import_fs19.default.existsSync(destDir)) {
      import_fs19.default.mkdirSync(destDir, { recursive: true });
    }
    import_fs19.default.writeFileSync(destPath, content);
    return { success: true, path: destPath };
  }
  throw new Error(`Unsupported package type: ${registryPath}`);
}
async function downloadStackFromGitHub2(registryPath, destPath, onProgress) {
  const baseUrl = `${GITHUB_RAW_BASE2}/${registryPath}`;
  const apiUrl = `https://api.github.com/repos/learn-rudi/registry/contents/${registryPath}`;
  const listResponse = await fetch(apiUrl, {
    headers: {
      "User-Agent": "rudi-cli/2.0",
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (!listResponse.ok) {
    throw new Error(`Stack not found: ${registryPath}`);
  }
  const contents = await listResponse.json();
  if (!Array.isArray(contents)) {
    throw new Error(`Invalid stack directory: ${registryPath}`);
  }
  const existingItems = /* @__PURE__ */ new Map();
  for (const item of contents) {
    existingItems.set(item.name, item);
  }
  const manifestItem = existingItems.get("manifest.json");
  if (!manifestItem) {
    throw new Error(`Stack missing manifest.json: ${registryPath}`);
  }
  const manifestResponse = await fetch(manifestItem.download_url, {
    headers: { "User-Agent": "rudi-cli/2.0" }
  });
  const manifest = await manifestResponse.json();
  import_fs19.default.writeFileSync(import_path18.default.join(destPath, "manifest.json"), JSON.stringify(manifest, null, 2));
  onProgress?.({ phase: "downloading", file: "manifest.json" });
  const pkgJsonItem = existingItems.get("package.json");
  if (pkgJsonItem) {
    const pkgJsonResponse = await fetch(pkgJsonItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (pkgJsonResponse.ok) {
      const pkgJson = await pkgJsonResponse.text();
      import_fs19.default.writeFileSync(import_path18.default.join(destPath, "package.json"), pkgJson);
      onProgress?.({ phase: "downloading", file: "package.json" });
    }
  }
  const envExampleItem = existingItems.get(".env.example");
  if (envExampleItem) {
    const envResponse = await fetch(envExampleItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (envResponse.ok) {
      const envContent = await envResponse.text();
      import_fs19.default.writeFileSync(import_path18.default.join(destPath, ".env.example"), envContent);
    }
  }
  const tsconfigItem = existingItems.get("tsconfig.json");
  if (tsconfigItem) {
    const tsconfigResponse = await fetch(tsconfigItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (tsconfigResponse.ok) {
      const tsconfig = await tsconfigResponse.text();
      import_fs19.default.writeFileSync(import_path18.default.join(destPath, "tsconfig.json"), tsconfig);
    }
  }
  const requirementsItem = existingItems.get("requirements.txt");
  if (requirementsItem) {
    const reqResponse = await fetch(requirementsItem.download_url, {
      headers: { "User-Agent": "rudi-cli/2.0" }
    });
    if (reqResponse.ok) {
      const requirements = await reqResponse.text();
      import_fs19.default.writeFileSync(import_path18.default.join(destPath, "requirements.txt"), requirements);
    }
  }
  const sourceDirs = ["src", "dist", "node", "python", "lib"];
  for (const dirName of sourceDirs) {
    const dirItem = existingItems.get(dirName);
    if (dirItem && dirItem.type === "dir") {
      onProgress?.({ phase: "downloading", directory: dirName });
      await downloadDirectoryFromGitHub2(
        `${baseUrl}/${dirName}`,
        import_path18.default.join(destPath, dirName),
        onProgress
      );
    }
  }
}
async function downloadDirectoryFromGitHub2(dirUrl, destDir, onProgress) {
  const apiUrl = dirUrl.replace("https://raw.githubusercontent.com/", "https://api.github.com/repos/").replace("/main/", "/contents/");
  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/vnd.github.v3+json"
      }
    });
    if (!response.ok) {
      return;
    }
    const contents = await response.json();
    if (!Array.isArray(contents)) {
      return;
    }
    if (!import_fs19.default.existsSync(destDir)) {
      import_fs19.default.mkdirSync(destDir, { recursive: true });
    }
    for (const item of contents) {
      if (item.type === "file") {
        const fileResponse = await fetch(item.download_url, {
          headers: { "User-Agent": "rudi-cli/2.0" }
        });
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          import_fs19.default.writeFileSync(import_path18.default.join(destDir, item.name), content);
          onProgress?.({ phase: "downloading", file: item.name });
        }
      } else if (item.type === "dir") {
        await downloadDirectoryFromGitHub2(
          item.url.replace("https://api.github.com/repos/", "https://raw.githubusercontent.com/").replace("/contents/", "/main/"),
          import_path18.default.join(destDir, item.name),
          onProgress
        );
      }
    }
  } catch (error) {
    console.error(`Warning: Could not download ${dirUrl}: ${error.message}`);
  }
}
async function downloadRuntime2(runtime, version, destPath, options = {}) {
  const { onProgress } = options;
  const platformArch = getPlatformArch();
  const shortVersion = version.replace(/\.x$/, "").replace(/\.0$/, "");
  const filename = `${runtime}-${shortVersion}-${platformArch}.tar.gz`;
  const url = `${RUNTIMES_DOWNLOAD_BASE2}/${RUNTIMES_RELEASE_VERSION2}/${filename}`;
  onProgress?.({ phase: "downloading", runtime, version, url });
  const tempDir = import_path18.default.join(PATHS.cache, "downloads");
  if (!import_fs19.default.existsSync(tempDir)) {
    import_fs19.default.mkdirSync(tempDir, { recursive: true });
  }
  const tempFile = import_path18.default.join(tempDir, filename);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/octet-stream"
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to download ${runtime}: HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    import_fs19.default.writeFileSync(tempFile, Buffer.from(buffer));
    onProgress?.({ phase: "extracting", runtime, version });
    if (import_fs19.default.existsSync(destPath)) {
      import_fs19.default.rmSync(destPath, { recursive: true });
    }
    import_fs19.default.mkdirSync(destPath, { recursive: true });
    const { execSync: execSync10 } = await import("child_process");
    execSync10(`tar -xzf "${tempFile}" -C "${destPath}" --strip-components=1`, {
      stdio: "pipe"
    });
    import_fs19.default.unlinkSync(tempFile);
    import_fs19.default.writeFileSync(
      import_path18.default.join(destPath, "runtime.json"),
      JSON.stringify({
        runtime,
        version,
        platformArch,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString(),
        source: url
      }, null, 2)
    );
    onProgress?.({ phase: "complete", runtime, version, path: destPath });
    return { success: true, path: destPath };
  } catch (error) {
    if (import_fs19.default.existsSync(tempFile)) {
      import_fs19.default.unlinkSync(tempFile);
    }
    throw new Error(`Failed to install ${runtime} ${version}: ${error.message}`);
  }
}
async function downloadTool2(toolName, destPath, options = {}) {
  const { onProgress } = options;
  const platformArch = getPlatformArch();
  const toolManifest = await loadToolManifest2(toolName);
  if (!toolManifest) {
    throw new Error(`Binary manifest not found for: ${toolName}`);
  }
  const tempDir = import_path18.default.join(PATHS.cache, "downloads");
  if (!import_fs19.default.existsSync(tempDir)) {
    import_fs19.default.mkdirSync(tempDir, { recursive: true });
  }
  if (import_fs19.default.existsSync(destPath)) {
    import_fs19.default.rmSync(destPath, { recursive: true });
  }
  import_fs19.default.mkdirSync(destPath, { recursive: true });
  const { execSync: execSync10 } = await import("child_process");
  const downloads = toolManifest.downloads?.[platformArch];
  if (downloads && Array.isArray(downloads)) {
    const downloadedUrls = /* @__PURE__ */ new Set();
    for (const download of downloads) {
      const { url, type, binary } = download;
      if (downloadedUrls.has(url)) {
        await extractBinaryFromPath2(destPath, binary, destPath);
        continue;
      }
      onProgress?.({ phase: "downloading", tool: toolName, binary: import_path18.default.basename(binary), url });
      const urlFilename = import_path18.default.basename(new URL(url).pathname);
      const tempFile = import_path18.default.join(tempDir, urlFilename);
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "rudi-cli/2.0",
            "Accept": "application/octet-stream"
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to download ${binary}: HTTP ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        import_fs19.default.writeFileSync(tempFile, Buffer.from(buffer));
        downloadedUrls.add(url);
        onProgress?.({ phase: "extracting", tool: toolName, binary: import_path18.default.basename(binary) });
        const archiveType = type || guessArchiveType2(urlFilename);
        if (archiveType === "zip") {
          execSync10(`unzip -o "${tempFile}" -d "${destPath}"`, { stdio: "pipe" });
        } else if (archiveType === "tar.xz") {
          execSync10(`tar -xJf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
        } else if (archiveType === "tar.gz" || archiveType === "tgz") {
          execSync10(`tar -xzf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
        } else {
          throw new Error(`Unsupported archive type: ${archiveType}`);
        }
        await extractBinaryFromPath2(destPath, binary, destPath);
        import_fs19.default.unlinkSync(tempFile);
      } catch (error) {
        if (import_fs19.default.existsSync(tempFile)) {
          import_fs19.default.unlinkSync(tempFile);
        }
        throw error;
      }
    }
    const binaries = toolManifest.binaries || [toolName];
    for (const bin of binaries) {
      const binPath = import_path18.default.join(destPath, bin);
      if (import_fs19.default.existsSync(binPath)) {
        import_fs19.default.chmodSync(binPath, 493);
      }
    }
  } else {
    const upstreamUrl = toolManifest.upstream?.[platformArch];
    if (!upstreamUrl) {
      throw new Error(`No upstream URL for ${toolName} on ${platformArch}`);
    }
    const extractConfig = toolManifest.extract?.[platformArch] || toolManifest.extract?.default;
    if (!extractConfig) {
      throw new Error(`No extract config for ${toolName} on ${platformArch}`);
    }
    onProgress?.({ phase: "downloading", tool: toolName, url: upstreamUrl });
    const urlFilename = import_path18.default.basename(new URL(upstreamUrl).pathname);
    const tempFile = import_path18.default.join(tempDir, urlFilename);
    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "rudi-cli/2.0",
          "Accept": "application/octet-stream"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to download ${toolName}: HTTP ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      import_fs19.default.writeFileSync(tempFile, Buffer.from(buffer));
      onProgress?.({ phase: "extracting", tool: toolName });
      const archiveType = extractConfig.type || guessArchiveType2(urlFilename);
      const stripComponents = extractConfig.strip || 0;
      const stripFlag = stripComponents > 0 ? ` --strip-components=${stripComponents}` : "";
      if (archiveType === "zip") {
        execSync10(`unzip -o "${tempFile}" -d "${destPath}"`, { stdio: "pipe" });
      } else if (archiveType === "tar.xz") {
        execSync10(`tar -xJf "${tempFile}" -C "${destPath}"${stripFlag}`, { stdio: "pipe" });
      } else if (archiveType === "tar.gz" || archiveType === "tgz") {
        execSync10(`tar -xzf "${tempFile}" -C "${destPath}"${stripFlag}`, { stdio: "pipe" });
      } else {
        throw new Error(`Unsupported archive type: ${archiveType}`);
      }
      await extractBinaryFromPath2(destPath, extractConfig.binary || toolName, destPath);
      const binaries = [toolName, ...toolManifest.additionalBinaries || []];
      for (const bin of binaries) {
        const binPath = import_path18.default.join(destPath, bin);
        if (import_fs19.default.existsSync(binPath)) {
          import_fs19.default.chmodSync(binPath, 493);
        }
      }
      import_fs19.default.unlinkSync(tempFile);
    } catch (error) {
      if (import_fs19.default.existsSync(tempFile)) {
        import_fs19.default.unlinkSync(tempFile);
      }
      throw new Error(`Failed to install ${toolName}: ${error.message}`);
    }
  }
  import_fs19.default.writeFileSync(
    import_path18.default.join(destPath, "manifest.json"),
    JSON.stringify({
      id: `binary:${toolName}`,
      kind: "binary",
      name: toolManifest.name || toolName,
      version: toolManifest.version,
      binaries: toolManifest.bins || toolManifest.binaries || [toolName],
      platformArch,
      installedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2)
  );
  onProgress?.({ phase: "complete", tool: toolName, path: destPath });
  return { success: true, path: destPath };
}
async function extractBinaryFromPath2(extractedPath, binaryPattern, destPath) {
  const directPath = import_path18.default.join(destPath, import_path18.default.basename(binaryPattern));
  if (!binaryPattern.includes("/") && !binaryPattern.includes("*")) {
    if (import_fs19.default.existsSync(directPath)) {
      return;
    }
  }
  if (binaryPattern.includes("*") || binaryPattern.includes("/")) {
    const parts = binaryPattern.split("/");
    let currentPath = extractedPath;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.includes("*")) {
        if (!import_fs19.default.existsSync(currentPath)) break;
        const entries = import_fs19.default.readdirSync(currentPath);
        const pattern = new RegExp("^" + part.replace(/\*/g, ".*") + "$");
        const match = entries.find((e) => pattern.test(e));
        if (match) {
          currentPath = import_path18.default.join(currentPath, match);
        } else {
          break;
        }
      } else {
        currentPath = import_path18.default.join(currentPath, part);
      }
    }
    if (import_fs19.default.existsSync(currentPath) && currentPath !== destPath) {
      const finalPath = import_path18.default.join(destPath, import_path18.default.basename(currentPath));
      if (currentPath !== finalPath && !import_fs19.default.existsSync(finalPath)) {
        import_fs19.default.renameSync(currentPath, finalPath);
      }
    }
  }
}
async function loadToolManifest2(toolName) {
  for (const basePath of getLocalRegistryPaths2()) {
    const registryDir = import_path18.default.dirname(basePath);
    const manifestPath = import_path18.default.join(registryDir, "catalog", "binaries", `${toolName}.json`);
    if (import_fs19.default.existsSync(manifestPath)) {
      try {
        return JSON.parse(import_fs19.default.readFileSync(manifestPath, "utf-8"));
      } catch {
        continue;
      }
    }
  }
  try {
    const url = `https://raw.githubusercontent.com/learn-rudi/registry/main/catalog/binaries/${toolName}.json`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "rudi-cli/2.0",
        "Accept": "application/json"
      }
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
  }
  return null;
}
function guessArchiveType2(filename) {
  if (filename.endsWith(".tar.gz") || filename.endsWith(".tgz")) return "tar.gz";
  if (filename.endsWith(".tar.xz")) return "tar.xz";
  if (filename.endsWith(".zip")) return "zip";
  return "tar.gz";
}
async function verifyHash(filePath, expectedHash) {
  return new Promise((resolve, reject) => {
    const hash = import_crypto2.default.createHash("sha256");
    const stream = import_fs19.default.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => {
      const actualHash = hash.digest("hex");
      resolve(actualHash === expectedHash);
    });
    stream.on("error", reject);
  });
}
async function computeHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = import_crypto2.default.createHash("sha256");
    const stream = import_fs19.default.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}
var import_fs19, import_path18, import_crypto2, DEFAULT_REGISTRY_URL2, RUNTIMES_DOWNLOAD_BASE2, CACHE_TTL2, PACKAGE_KINDS4, KIND_PLURALS2, GITHUB_RAW_BASE2, RUNTIMES_RELEASE_VERSION2;
var init_src4 = __esm({
  "packages/registry-client/src/index.js"() {
    import_fs19 = __toESM(require("fs"), 1);
    import_path18 = __toESM(require("path"), 1);
    import_crypto2 = __toESM(require("crypto"), 1);
    init_src();
    DEFAULT_REGISTRY_URL2 = "https://raw.githubusercontent.com/learn-rudi/registry/main/index.json";
    RUNTIMES_DOWNLOAD_BASE2 = "https://github.com/learn-rudi/registry/releases/download";
    CACHE_TTL2 = 24 * 60 * 60 * 1e3;
    PACKAGE_KINDS4 = ["stack", "prompt", "runtime", "binary", "agent"];
    KIND_PLURALS2 = {
      binary: "binaries"
    };
    GITHUB_RAW_BASE2 = "https://raw.githubusercontent.com/learn-rudi/registry/main";
    RUNTIMES_RELEASE_VERSION2 = "v1.0.0";
  }
});

// packages/utils/src/args.js
function parseArgs(argv) {
  const flags = {};
  const args = [];
  let command = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      if (eqIndex !== -1) {
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        flags[key] = value;
      } else {
        const key = arg.slice(2);
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          flags[key] = nextArg;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      const chars = arg.slice(1);
      for (const char of chars) {
        flags[char] = true;
      }
    } else if (!command) {
      command = arg;
    } else {
      args.push(arg);
    }
  }
  return { command, args, flags };
}
function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  const mins = Math.floor(ms / 6e4);
  const secs = Math.floor(ms % 6e4 / 1e3);
  return `${mins}m ${secs}s`;
}

// packages/utils/src/help.js
function printVersion(version) {
  console.log(`rudi v${version}`);
}
function printHelp(topic) {
  if (topic) {
    printCommandHelp(topic);
    return;
  }
  console.log(`
rudi - RUDI CLI

USAGE
  rudi <command> [options]

SETUP
  init                  Bootstrap RUDI (download runtimes, create shims)

INTROSPECTION
  home                  Show ~/.rudi structure and installed packages
  stacks                List installed stacks
  runtimes              List installed runtimes
  binaries              List installed binaries
  agents                List installed agents
  prompts               List installed prompts
  doctor                Check system health and dependencies
  doctor --all          Show all available runtimes/binaries from registry

PACKAGE MANAGEMENT
  search <query>        Search registry for packages
  search --all          List all available packages
  install <pkg>         Install a package
  remove <pkg>          Remove a package
  update [pkg]          Update packages
  run <stack>           Run a stack

DATABASE
  db stats              Show database statistics
  db search <query>     Search conversation history
  db reset --force      Delete all data
  db vacuum             Compact and reclaim space
  db tables             Show table row counts

SESSION IMPORT
  import sessions       Import from AI providers (claude, codex, gemini)
  import status         Show import status

SECRETS
  secrets set <name>    Set a secret
  secrets list          List configured secrets
  secrets remove <name> Remove a secret

OPTIONS
  -h, --help           Show help
  -v, --version        Show version
  --verbose            Verbose output
  --json               Output as JSON
  --force              Force operation

EXAMPLES
  rudi home                    Show ~/.rudi structure
  rudi runtimes                List installed runtimes
  rudi install runtime:python  Install Python in ~/.rudi
  rudi install binary:ffmpeg   Install ffmpeg
  rudi doctor --all            Show all available deps

PACKAGE TYPES
  stack:name           MCP server stack
  runtime:name         Node, Python, Deno, Bun
  binary:name          ffmpeg, ripgrep, etc.
  agent:name           Claude, Codex, Gemini CLIs
  prompt:name          Prompt template
`);
}
function printCommandHelp(command) {
  const help = {
    search: `
rudi search - Search the registry

USAGE
  rudi search <query> [options]

OPTIONS
  --stacks         Filter to stacks only
  --prompts        Filter to prompts only
  --runtimes       Filter to runtimes only
  --binaries       Filter to binaries only
  --agents         Filter to agents only
  --all            List all packages (no query needed)
  --json           Output as JSON

EXAMPLES
  rudi search pdf
  rudi search deploy --stacks
  rudi search ffmpeg --binaries
  rudi search --all --agents
`,
    install: `
rudi install - Install a package

USAGE
  rudi install <package> [options]

OPTIONS
  --force          Force reinstall
  --json           Output as JSON

EXAMPLES
  rudi install pdf-creator
  rudi install stack:youtube-extractor
  rudi install runtime:python
  rudi install binary:ffmpeg
  rudi install agent:claude
`,
    run: `
rudi run - Execute a stack

USAGE
  rudi run <stack> [options]

OPTIONS
  --input <json>   Input parameters as JSON
  --cwd <path>     Working directory
  --verbose        Show detailed output

EXAMPLES
  rudi run pdf-creator
  rudi run pdf-creator --input '{"file": "doc.html"}'
`,
    list: `
rudi list - List installed packages

USAGE
  rudi list [kind]

ARGUMENTS
  kind             Filter: stacks, prompts, runtimes, binaries, agents

OPTIONS
  --json           Output as JSON
  --detected       Show MCP servers from agent configs (stacks only)
  --category=X     Filter prompts by category

EXAMPLES
  rudi list
  rudi list stacks
  rudi list stacks --detected     Show MCP servers in Claude/Gemini/Codex
  rudi list binaries
  rudi list prompts --category=coding
`,
    secrets: `
rudi secrets - Manage secrets

USAGE
  rudi secrets <command> [args]

COMMANDS
  set <name>       Set a secret (prompts for value)
  list             List configured secrets (values masked)
  remove <name>    Remove a secret
  export           Export secrets as environment variables

EXAMPLES
  rudi secrets set VERCEL_TOKEN
  rudi secrets list
  rudi secrets remove GITHUB_TOKEN
`,
    db: `
rudi db - Database operations

USAGE
  rudi db <command> [args]

COMMANDS
  stats            Show usage statistics
  search <query>   Search conversation history
  init             Initialize or migrate database
  path             Show database file path
  reset            Delete all data (requires --force)
  vacuum           Compact database and reclaim space
  backup [file]    Create database backup
  prune [days]     Delete sessions older than N days (default: 90)
  tables           Show table row counts

OPTIONS
  --force          Required for destructive operations
  --dry-run        Preview without making changes
  --json           Output as JSON

EXAMPLES
  rudi db stats
  rudi db search "authentication bug"
  rudi db reset --force
  rudi db vacuum
  rudi db backup ~/backups/rudi.db
  rudi db prune 30 --dry-run
  rudi db tables
`,
    import: `
rudi import - Import sessions from AI providers

USAGE
  rudi import <command> [options]

COMMANDS
  sessions [provider]  Import sessions from provider (claude, codex, gemini, or all)
  status               Show import status for all providers

OPTIONS
  --dry-run            Show what would be imported without making changes
  --max-age=DAYS       Only import sessions newer than N days
  --verbose            Show detailed progress

EXAMPLES
  rudi import sessions              Import from all providers
  rudi import sessions claude       Import only Claude sessions
  rudi import sessions --dry-run    Preview without importing
  rudi import status                Check what's available to import
`,
    init: `
rudi init - Bootstrap RUDI environment

USAGE
  rudi init [options]

OPTIONS
  --force            Reinitialize even if already set up
  --skip-downloads   Skip downloading runtimes/binaries
  --quiet            Minimal output (for programmatic use)

WHAT IT DOES
  1. Creates ~/.rudi directory structure (if missing)
  2. Downloads bundled runtimes (Node.js, Python) if not installed
  3. Downloads essential binaries (sqlite3, ripgrep) if not installed
  4. Creates/updates shims in ~/.rudi/shims/
  5. Initializes the database (if missing)
  6. Creates settings.json (if missing)

NOTE: Safe to run multiple times - only creates what's missing.

EXAMPLES
  rudi init
  rudi init --force
  rudi init --skip-downloads
  rudi init --quiet
`,
    home: `
rudi home - Show ~/.rudi structure and status

USAGE
  rudi home [options]

OPTIONS
  --verbose        Show package details
  --json           Output as JSON

SHOWS
  - Directory structure with sizes
  - Installed package counts
  - Database status
  - Quick commands reference

EXAMPLES
  rudi home
  rudi home --verbose
  rudi home --json
`,
    doctor: `
rudi doctor - System health check

USAGE
  rudi doctor [options]

OPTIONS
  --fix            Attempt to fix issues
  --all            Show all available runtimes/binaries from registry

CHECKS
  - Directory structure
  - Database integrity
  - Installed packages
  - Available runtimes (node, python, deno, bun)
  - Available binaries (ffmpeg, ripgrep, etc.)
  - Secrets configuration

EXAMPLES
  rudi doctor
  rudi doctor --fix
  rudi doctor --all
`,
    logs: `
rudi logs - Query agent visibility logs

USAGE
  rudi logs [options]

FILTERS
  --limit <n>           Number of logs to show (default: 50)
  --last <time>         Show logs from last N time (5m, 1h, 30s, 2d)
  --since <timestamp>   Show logs since timestamp (ISO or epoch ms)
  --until <timestamp>   Show logs until timestamp (ISO or epoch ms)
  --filter <text>       Search for text in log messages (repeatable)
  --source <source>     Filter by source (e.g., ipc, console, agent-codex)
  --level <level>       Filter by level (debug, info, warn, error)
  --type <type>         Filter by event type (ipc, window, navigation, error, custom)
  --provider <provider> Filter by provider (claude, codex, gemini)
  --session-id <id>     Filter by session ID
  --terminal-id <id>    Filter by terminal ID

PERFORMANCE
  --slow-only           Show only slow operations
  --slow-threshold <ms> Minimum duration for slow operations (default: 1000)

SPECIAL MODES
  --before-crash        Show last 30 seconds before crash
  --stats               Show statistics summary

EXPORT
  --export <file>       Export logs to file
  --format <format>     Export format: json, ndjson, csv (default: json)

OUTPUT
  --verbose             Show detailed event information
  --json                Output events as JSON lines

EXAMPLES
  rudi logs --last 5m
  rudi logs --level error --last 1h
  rudi logs --filter "authentication" --provider claude
  rudi logs --slow-only --slow-threshold 2000
  rudi logs --stats --last 24h
  rudi logs --export debug.json --format ndjson --last 30m
  rudi logs --before-crash
`
  };
  if (help[command]) {
    console.log(help[command]);
  } else {
    console.log(`No help available for '${command}'`);
    console.log(`Run 'rudi help' for available commands`);
  }
}

// src/commands/search.js
init_src3();
function pluralizeKind(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
function headingForKind(kind) {
  return kind === "binary" ? "BINARIES" : `${kind.toUpperCase()}S`;
}
async function cmdSearch(args, flags) {
  const query = args[0];
  if (flags.all || flags.a) {
    return listAllPackages(flags);
  }
  if (!query) {
    console.error("Usage: rudi search <query>");
    console.error("       rudi search --all            List all available packages");
    console.error("       rudi search --all -s   List all stacks");
    console.error("       rudi search --all --runtimes List all runtimes");
    console.error("       rudi search --all --binaries List all binaries");
    console.error("       rudi search --all --agents   List all agents");
    console.error("Example: rudi search pdf");
    process.exit(1);
  }
  const binariesFlag = flags.binaries || flags.tools;
  const kind = flags.stacks ? "stack" : flags.prompts ? "prompt" : flags.runtimes ? "runtime" : binariesFlag ? "binary" : flags.agents ? "agent" : null;
  console.log(`Searching for "${query}"...`);
  try {
    const results = await searchPackages(query, { kind });
    if (results.length === 0) {
      console.log("No packages found matching your query.");
      return;
    }
    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    console.log(`
Found ${results.length} package(s):
`);
    const grouped = {
      stack: results.filter((r) => r.kind === "stack"),
      prompt: results.filter((r) => r.kind === "prompt"),
      runtime: results.filter((r) => r.kind === "runtime"),
      binary: results.filter((r) => r.kind === "binary"),
      agent: results.filter((r) => r.kind === "agent")
    };
    for (const [kind2, packages] of Object.entries(grouped)) {
      if (packages.length === 0) continue;
      console.log(`${kind2.toUpperCase()}S:`);
      for (const pkg of packages) {
        const id = pkg.id || `${kind2}:${pkg.name}`;
        console.log(`  ${id}`);
        console.log(`    ${pkg.description || "No description"}`);
        if (pkg.version) {
          console.log(`    v${pkg.version}`);
        }
        console.log();
      }
    }
    console.log(`Install with: rudi install <package-id>`);
  } catch (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }
}
async function listAllPackages(flags) {
  const binariesFlag = flags.binaries || flags.tools;
  const kind = flags.stacks ? "stack" : flags.prompts ? "prompt" : flags.runtimes ? "runtime" : binariesFlag ? "binary" : flags.agents ? "agent" : null;
  try {
    const kinds = kind ? [kind] : ["stack", "prompt", "runtime", "binary", "agent"];
    const allPackages = {};
    let totalCount = 0;
    for (const k of kinds) {
      const packages = await listPackages(k);
      allPackages[k] = packages;
      totalCount += packages.length;
    }
    if (flags.json) {
      console.log(JSON.stringify(allPackages, null, 2));
      return;
    }
    console.log(kind ? `Listing all ${pluralizeKind(kind)}...` : "Listing all available packages...");
    for (const k of kinds) {
      const packages = allPackages[k];
      if (packages.length === 0) continue;
      console.log(`
${headingForKind(k)} (${packages.length}):`);
      console.log("\u2500".repeat(50));
      for (const pkg of packages) {
        const id = pkg.id || `${k}:${pkg.name}`;
        const runtime = pkg.runtime ? ` [${pkg.runtime.replace("runtime:", "")}]` : "";
        console.log(`  ${id}${runtime}`);
        console.log(`    ${pkg.description || "No description"}`);
      }
    }
    console.log(`
Total: ${totalCount} package(s) available`);
    console.log(`Install with: rudi install <package-id>`);
  } catch (error) {
    console.error(`Failed to list packages: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/install.js
var fs13 = __toESM(require("fs/promises"), 1);
var path13 = __toESM(require("path"), 1);
var import_child_process4 = require("child_process");
init_src3();

// packages/secrets/src/index.js
var fs10 = __toESM(require("fs"), 1);
var path10 = __toESM(require("path"), 1);
init_src();
var SECRETS_FILE = path10.join(PATHS.home, "secrets.json");
function ensureSecretsFile() {
  const dir = path10.dirname(SECRETS_FILE);
  if (!fs10.existsSync(dir)) {
    fs10.mkdirSync(dir, { recursive: true });
  }
  if (!fs10.existsSync(SECRETS_FILE)) {
    fs10.writeFileSync(SECRETS_FILE, "{}", { mode: 384 });
  } else {
    try {
      fs10.chmodSync(SECRETS_FILE, 384);
    } catch {
    }
  }
}
function loadSecrets2() {
  ensureSecretsFile();
  try {
    const content = fs10.readFileSync(SECRETS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
function saveSecrets(secrets) {
  ensureSecretsFile();
  fs10.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2), {
    encoding: "utf-8",
    mode: 384
  });
}
async function getSecret(name) {
  const secrets = loadSecrets2();
  return secrets[name] || null;
}
async function setSecret(name, value) {
  const secrets = loadSecrets2();
  secrets[name] = value;
  saveSecrets(secrets);
  return true;
}
async function removeSecret(name) {
  const secrets = loadSecrets2();
  delete secrets[name];
  saveSecrets(secrets);
  return true;
}
async function listSecrets() {
  const secrets = loadSecrets2();
  return Object.keys(secrets).sort();
}
async function hasSecret(name) {
  const secrets = loadSecrets2();
  return secrets[name] !== void 0 && secrets[name] !== null && secrets[name] !== "";
}
async function getMaskedSecrets() {
  const secrets = loadSecrets2();
  const masked = {};
  for (const [name, value] of Object.entries(secrets)) {
    if (value && typeof value === "string" && value.length > 8) {
      masked[name] = value.slice(0, 4) + "..." + value.slice(-4);
    } else if (value && typeof value === "string" && value.length > 0) {
      masked[name] = "****";
    } else {
      masked[name] = "(pending)";
    }
  }
  return masked;
}
function getStorageInfo() {
  return {
    backend: "file",
    file: SECRETS_FILE,
    permissions: "0600 (owner read/write only)"
  };
}

// packages/mcp/src/agents.js
var import_fs8 = __toESM(require("fs"), 1);
var import_path8 = __toESM(require("path"), 1);
var import_os2 = __toESM(require("os"), 1);
var AGENT_CONFIGS = [
  // Claude Desktop (Anthropic)
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    key: "mcpServers",
    paths: {
      darwin: ["Library/Application Support/Claude/claude_desktop_config.json"],
      win32: ["AppData/Roaming/Claude/claude_desktop_config.json"],
      linux: [".config/claude/claude_desktop_config.json"]
    }
  },
  // Claude Code CLI (Anthropic)
  {
    id: "claude-code",
    name: "Claude Code",
    key: "mcpServers",
    paths: {
      darwin: [".claude.json"],
      win32: [".claude.json"],
      linux: [".claude.json"]
    }
  },
  // Cursor (Anysphere)
  {
    id: "cursor",
    name: "Cursor",
    key: "mcpServers",
    paths: {
      darwin: [".cursor/mcp.json"],
      win32: [".cursor/mcp.json"],
      linux: [".cursor/mcp.json"]
    }
  },
  // Windsurf (Codeium)
  {
    id: "windsurf",
    name: "Windsurf",
    key: "mcpServers",
    paths: {
      darwin: [".codeium/windsurf/mcp_config.json"],
      win32: [".codeium/windsurf/mcp_config.json"],
      linux: [".codeium/windsurf/mcp_config.json"]
    }
  },
  // Cline (VS Code extension)
  {
    id: "cline",
    name: "Cline",
    key: "mcpServers",
    paths: {
      darwin: ["Documents/Cline/cline_mcp_settings.json"],
      win32: ["Documents/Cline/cline_mcp_settings.json"],
      linux: ["Documents/Cline/cline_mcp_settings.json"]
    }
  },
  // Zed Editor
  {
    id: "zed",
    name: "Zed",
    key: "context_servers",
    paths: {
      darwin: [".zed/settings.json"],
      win32: [".config/zed/settings.json"],
      linux: [".config/zed/settings.json"]
    }
  },
  // VS Code / GitHub Copilot
  {
    id: "vscode",
    name: "VS Code",
    key: "servers",
    paths: {
      darwin: ["Library/Application Support/Code/User/mcp.json"],
      win32: ["AppData/Roaming/Code/User/mcp.json"],
      linux: [".config/Code/User/mcp.json"]
    }
  },
  // Gemini CLI (Google)
  {
    id: "gemini",
    name: "Gemini",
    key: "mcpServers",
    paths: {
      darwin: [".gemini/settings.json"],
      win32: [".gemini/settings.json"],
      linux: [".gemini/settings.json"]
    }
  },
  // Codex CLI (OpenAI)
  {
    id: "codex",
    name: "Codex",
    key: "mcpServers",
    paths: {
      darwin: [".codex/config.json", ".codex/settings.json"],
      win32: [".codex/config.json", ".codex/settings.json"],
      linux: [".codex/config.json", ".codex/settings.json"]
    }
  }
];
function getAgentConfigPaths(agentConfig) {
  const home = import_os2.default.homedir();
  const platform = process.platform;
  const relativePaths = agentConfig.paths[platform] || agentConfig.paths.linux || [];
  return relativePaths.map((p) => import_path8.default.join(home, p));
}
function findAgentConfig(agentConfig) {
  const paths = getAgentConfigPaths(agentConfig);
  for (const configPath of paths) {
    if (import_fs8.default.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}
function readAgentMcpServers(agentConfig) {
  const configPath = findAgentConfig(agentConfig);
  if (!configPath) return [];
  try {
    const content = JSON.parse(import_fs8.default.readFileSync(configPath, "utf-8"));
    const mcpServers = content[agentConfig.key] || {};
    return Object.entries(mcpServers).map(([name, config]) => {
      const command = config.command || config.path || config.command?.path;
      return {
        name,
        agent: agentConfig.id,
        agentName: agentConfig.name,
        command: command || "unknown",
        args: config.args,
        cwd: config.cwd,
        env: config.env ? Object.keys(config.env) : [],
        configFile: configPath
      };
    });
  } catch (e) {
    return [];
  }
}
function detectAllMcpServers() {
  const servers = [];
  for (const agentConfig of AGENT_CONFIGS) {
    const agentServers = readAgentMcpServers(agentConfig);
    servers.push(...agentServers);
  }
  return servers;
}
function getInstalledAgents() {
  return AGENT_CONFIGS.filter((agent) => findAgentConfig(agent) !== null).map((agent) => ({
    id: agent.id,
    name: agent.name,
    configFile: findAgentConfig(agent)
  }));
}
function getMcpServerSummary() {
  const summary = {};
  for (const agentConfig of AGENT_CONFIGS) {
    const configPath = findAgentConfig(agentConfig);
    if (configPath) {
      const servers = readAgentMcpServers(agentConfig);
      summary[agentConfig.id] = {
        name: agentConfig.name,
        configFile: configPath,
        serverCount: servers.length,
        servers: servers.map((s) => s.name)
      };
    }
  }
  return summary;
}

// packages/mcp/src/registry.js
var fs12 = __toESM(require("fs/promises"), 1);
var path12 = __toESM(require("path"), 1);
var os3 = __toESM(require("os"), 1);
var HOME = os3.homedir();
var AGENT_CONFIGS2 = {
  claude: path12.join(HOME, ".claude", "settings.json"),
  codex: path12.join(HOME, ".codex", "config.toml"),
  gemini: path12.join(HOME, ".gemini", "settings.json")
};
async function readJson(filePath) {
  try {
    const content = await fs12.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
async function writeJson(filePath, data) {
  const dir = path12.dirname(filePath);
  await fs12.mkdir(dir, { recursive: true });
  await fs12.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}
function parseTomlValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    const items = [];
    let current = "";
    let inQuote = false;
    let quoteChar = "";
    for (const char of inner) {
      if ((char === '"' || char === "'") && !inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuote) {
        inQuote = false;
        items.push(current);
        current = "";
      } else if (char === "," && !inQuote) {
      } else if (inQuote) {
        current += char;
      }
    }
    return items;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  return value;
}
function parseToml(content) {
  const result = {};
  const lines = content.split("\n");
  let currentTable = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const tableMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (tableMatch) {
      currentTable = tableMatch[1].split(".");
      let obj = result;
      for (const key of currentTable) {
        obj[key] = obj[key] || {};
        obj = obj[key];
      }
      continue;
    }
    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value = kvMatch[2].trim();
      const parsed = parseTomlValue(value);
      let obj = result;
      for (const tableKey of currentTable) {
        obj = obj[tableKey];
      }
      obj[key] = parsed;
    }
  }
  return result;
}
function tomlValue(value) {
  if (typeof value === "string") {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => tomlValue(v));
    return `[${items.join(", ")}]`;
  }
  return String(value);
}
function stringifyToml(config, prefix = "") {
  const lines = [];
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== "object" || Array.isArray(value)) {
      lines.push(`${key} = ${tomlValue(value)}`);
    }
  }
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "object" && !Array.isArray(value)) {
      const tablePath = prefix ? `${prefix}.${key}` : key;
      const hasSimpleValues = Object.values(value).some(
        (v) => typeof v !== "object" || Array.isArray(v)
      );
      if (hasSimpleValues) {
        lines.push("");
        lines.push(`[${tablePath}]`);
      }
      const nested = stringifyToml(value, tablePath);
      if (nested.trim()) {
        lines.push(nested);
      }
    }
  }
  return lines.join("\n");
}
async function readToml(filePath) {
  try {
    const content = await fs12.readFile(filePath, "utf-8");
    return parseToml(content);
  } catch {
    return {};
  }
}
async function writeToml(filePath, data) {
  const dir = path12.dirname(filePath);
  await fs12.mkdir(dir, { recursive: true });
  await fs12.writeFile(filePath, stringifyToml(data), "utf-8");
}
async function unregisterMcpCodex(stackId) {
  const configPath = AGENT_CONFIGS2.codex;
  try {
    const config = await readToml(configPath);
    if (!config.mcp_servers || !config.mcp_servers[stackId]) {
      return { success: true, skipped: true };
    }
    delete config.mcp_servers[stackId];
    await writeToml(configPath, config);
    console.log(`  Unregistered MCP from Codex: ${stackId}`);
    return { success: true };
  } catch (error) {
    console.error(`  Failed to unregister MCP from Codex: ${error.message}`);
    return { success: false, error: error.message };
  }
}
function getInstalledAgentIds() {
  return getInstalledAgents().map((a) => a.id);
}
async function unregisterMcpGeneric(agentId, stackId) {
  const agentConfig = AGENT_CONFIGS.find((a) => a.id === agentId);
  if (!agentConfig) {
    return { success: false, error: `Unknown agent: ${agentId}` };
  }
  const configPath = findAgentConfig(agentConfig);
  if (!configPath) {
    return { success: true, skipped: true, reason: "Agent not installed" };
  }
  if (agentId === "codex") {
    return unregisterMcpCodex(stackId);
  }
  try {
    const settings = await readJson(configPath);
    const key = agentConfig.key;
    if (!settings[key] || !settings[key][stackId]) {
      return { success: true, skipped: true, reason: "Server not found" };
    }
    delete settings[key][stackId];
    await writeJson(configPath, settings);
    console.log(`  Unregistered MCP from ${agentConfig.name}: ${stackId}`);
    return { success: true, configPath };
  } catch (error) {
    console.error(`  Failed to unregister MCP from ${agentConfig.name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}
async function unregisterMcpAll(stackId, targetAgents = null) {
  let agentIds = getInstalledAgentIds();
  if (targetAgents && targetAgents.length > 0) {
    const idMap = {
      "claude": "claude-code",
      "codex": "codex",
      "gemini": "gemini"
    };
    const targetIds = targetAgents.map((a) => idMap[a] || a);
    agentIds = agentIds.filter((id) => targetIds.includes(id));
  }
  const results = {};
  for (const agentId of agentIds) {
    results[agentId] = await unregisterMcpGeneric(agentId, stackId);
  }
  return results;
}

// src/commands/install.js
async function loadManifest(installPath) {
  const manifestPath = path13.join(installPath, "manifest.json");
  try {
    const content = await fs13.readFile(manifestPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function getBundledBinary(runtime, binary) {
  const platform = process.platform;
  const rudiHome = process.env.RUDI_HOME || path13.join(process.env.HOME || process.env.USERPROFILE, ".rudi");
  if (runtime === "node") {
    const npmPath = platform === "win32" ? path13.join(rudiHome, "runtimes", "node", "npm.cmd") : path13.join(rudiHome, "runtimes", "node", "bin", "npm");
    if (require("fs").existsSync(npmPath)) {
      return npmPath;
    }
  }
  if (runtime === "python") {
    const pipPath = platform === "win32" ? path13.join(rudiHome, "runtimes", "python", "Scripts", "pip.exe") : path13.join(rudiHome, "runtimes", "python", "bin", "pip3");
    if (require("fs").existsSync(pipPath)) {
      return pipPath;
    }
  }
  return binary;
}
async function installDependencies(stackPath, manifest) {
  const runtime = manifest?.runtime || manifest?.mcp?.runtime || "node";
  try {
    if (runtime === "node") {
      const packageJsonPath = path13.join(stackPath, "package.json");
      try {
        await fs13.access(packageJsonPath);
      } catch {
        return { installed: false, reason: "No package.json" };
      }
      const nodeModulesPath = path13.join(stackPath, "node_modules");
      try {
        await fs13.access(nodeModulesPath);
        return { installed: false, reason: "Dependencies already installed" };
      } catch {
      }
      const npmCmd = getBundledBinary("node", "npm");
      console.log(`  Installing npm dependencies...`);
      (0, import_child_process4.execSync)(`"${npmCmd}" install --production`, {
        cwd: stackPath,
        stdio: "pipe"
      });
      return { installed: true };
    } else if (runtime === "python") {
      let requirementsPath = path13.join(stackPath, "python", "requirements.txt");
      let reqCwd = path13.join(stackPath, "python");
      try {
        await fs13.access(requirementsPath);
      } catch {
        requirementsPath = path13.join(stackPath, "requirements.txt");
        reqCwd = stackPath;
        try {
          await fs13.access(requirementsPath);
        } catch {
          return { installed: false, reason: "No requirements.txt" };
        }
      }
      const pipCmd = getBundledBinary("python", "pip");
      console.log(`  Installing pip dependencies...`);
      try {
        (0, import_child_process4.execSync)(`"${pipCmd}" install -r requirements.txt`, {
          cwd: reqCwd,
          stdio: "pipe"
        });
      } catch (pipError) {
        const stderr = pipError.stderr?.toString() || "";
        const stdout = pipError.stdout?.toString() || "";
        const output = stderr || stdout || pipError.message;
        return { installed: false, error: `pip install failed:
${output}` };
      }
      return { installed: true };
    }
    return { installed: false, reason: `Unknown runtime: ${runtime}` };
  } catch (error) {
    return { installed: false, error: error.message };
  }
}
function getManifestSecrets(manifest) {
  return manifest?.requires?.secrets || manifest?.secrets || [];
}
function getSecretName(secret) {
  if (typeof secret === "string") return secret;
  return secret.name || secret.key;
}
function getSecretLink(secret) {
  if (typeof secret !== "object" || !secret) return null;
  return secret.link || secret.helpUrl || null;
}
function validateStackEntryPoint(stackPath, manifest) {
  let command = manifest.command;
  if (!command || command.length === 0) {
    if (manifest.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }
  if (!command || command.length === 0) {
    return { valid: false, error: "No command defined in manifest" };
  }
  const skipCommands = [
    "node",
    "python",
    "python3",
    "npx",
    "deno",
    "bun",
    "tsx",
    "ts-node",
    "tsm",
    "esno",
    "esbuild-register",
    // TypeScript runners
    "-y",
    "--yes"
    // npx flags
  ];
  const fileExtensions = [".js", ".ts", ".mjs", ".cjs", ".py", ".mts", ".cts"];
  for (const arg of command) {
    if (skipCommands.includes(arg)) continue;
    if (arg.startsWith("-")) continue;
    const looksLikeFile = fileExtensions.some((ext) => arg.endsWith(ext)) || arg.includes("/");
    if (!looksLikeFile) continue;
    const entryPath = require("path").join(stackPath, arg);
    if (!require("fs").existsSync(entryPath)) {
      return { valid: false, error: `Entry point not found: ${arg}` };
    }
    return { valid: true };
  }
  return { valid: true };
}
async function checkSecrets(manifest) {
  const secrets = getManifestSecrets(manifest);
  const found = [];
  const missing = [];
  for (const secret of secrets) {
    const key = getSecretName(secret);
    const isRequired = typeof secret === "object" ? secret.required !== false : true;
    const exists = await hasSecret(key);
    if (exists) {
      found.push(key);
    } else if (isRequired) {
      missing.push(key);
    }
  }
  return { found, missing };
}
async function parseEnvExample(installPath) {
  const examplePath = path13.join(installPath, ".env.example");
  try {
    const content = await fs13.readFile(examplePath, "utf-8");
    const keys = [];
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
      if (match) {
        keys.push(match[1]);
      }
    }
    return keys;
  } catch {
    return [];
  }
}
async function cmdInstall(args, flags) {
  const pkgId = args[0];
  if (!pkgId) {
    console.error("Usage: rudi install <package>");
    console.error("Example: rudi install slack");
    console.error("");
    console.error("After installing, run:");
    console.error("  rudi secrets set <KEY>    # Configure required secrets");
    console.error("  rudi integrate all        # Wire up your agents");
    process.exit(1);
  }
  const force = flags.force || false;
  const allowScripts = flags["allow-scripts"] || flags.allowScripts || false;
  console.log(`Resolving ${pkgId}...`);
  try {
    const resolved = await resolvePackage(pkgId);
    console.log(`
Package: ${resolved.name} (${resolved.id})`);
    console.log(`Version: ${resolved.version}`);
    if (resolved.description) {
      console.log(`Description: ${resolved.description}`);
    }
    if (resolved.installed && !force) {
      console.log(`
Already installed. Use --force to reinstall.`);
      return;
    }
    if (resolved.dependencies?.length > 0) {
      console.log(`
Dependencies:`);
      for (const dep of resolved.dependencies) {
        const status = dep.installed ? "(installed)" : "(will install)";
        console.log(`  - ${dep.id} ${status}`);
      }
    }
    console.log(`
Dependency check:`);
    const depCheck = checkAllDependencies(resolved);
    if (depCheck.results.length > 0) {
      for (const line of formatDependencyResults(depCheck.results)) {
        console.log(line);
      }
    }
    const secretsCheck = { found: [], missing: [] };
    if (resolved.requires?.secrets?.length > 0) {
      for (const secret of resolved.requires.secrets) {
        const name = typeof secret === "string" ? secret : secret.name;
        const isRequired = typeof secret === "object" ? secret.required !== false : true;
        const exists = await hasSecret(name);
        if (exists) {
          secretsCheck.found.push(name);
          console.log(`  \u2713 ${name} (from secrets store)`);
        } else if (isRequired) {
          secretsCheck.missing.push(name);
          console.log(`  \u25CB ${name} - not configured`);
        } else {
          console.log(`  \u25CB ${name} (optional)`);
        }
      }
    }
    if (!depCheck.satisfied && !force) {
      console.error(`
\u2717 Missing required dependencies. Install them first:`);
      for (const r of depCheck.results.filter((r2) => !r2.available)) {
        console.error(`    rudi install ${r.type}:${r.name}`);
      }
      console.error(`
Or use --force to install anyway.`);
      process.exit(1);
    }
    console.log(`
Installing...`);
    const result = await installPackage(pkgId, {
      force,
      allowScripts,
      onProgress: (progress) => {
        if (progress.phase === "installing") {
          console.log(`  Installing ${progress.package}...`);
        }
      }
    });
    if (result.success) {
      console.log(`
\u2713 Installed ${result.id}`);
      console.log(`  Path: ${result.path}`);
      if (result.installed?.length > 0) {
        console.log(`
  Also installed:`);
        for (const id of result.installed) {
          console.log(`    - ${id}`);
        }
      }
      if (resolved.kind === "stack") {
        const manifest = await loadManifest(result.path);
        if (manifest) {
          const validation = validateStackEntryPoint(result.path, manifest);
          if (!validation.valid) {
            console.error(`
\u2717 Stack validation failed: ${validation.error}`);
            console.error(`  The stack may be incomplete or misconfigured.`);
            process.exit(1);
          }
          const depResult = await installDependencies(result.path, manifest);
          if (depResult.installed) {
            console.log(`  \u2713 Dependencies installed`);
          } else if (depResult.error) {
            console.error(`
\u2717 Failed to install dependencies:`);
            console.error(`  ${depResult.error}`);
            console.error(`
  Stack installed but may not work. Fix dependencies and run:`);
            console.error(`  rudi install ${result.id}`);
            process.exit(1);
          }
          try {
            addStack(result.id, {
              path: result.path,
              runtime: manifest.runtime || manifest.mcp?.runtime || "node",
              command: manifest.command || (manifest.mcp?.command ? [manifest.mcp.command, ...manifest.mcp.args || []] : null),
              secrets: getManifestSecrets(manifest),
              version: manifest.version
            });
            console.log(`  \u2713 Updated rudi.json`);
          } catch (err) {
            console.log(`  \u26A0 Failed to update rudi.json: ${err.message}`);
          }
          const { found, missing } = await checkSecrets(manifest);
          const envExampleKeys = await parseEnvExample(result.path);
          for (const key of envExampleKeys) {
            if (!found.includes(key) && !missing.includes(key)) {
              const exists = await hasSecret(key);
              if (!exists) {
                missing.push(key);
              } else {
                found.push(key);
              }
            }
          }
          if (missing.length > 0) {
            for (const key of missing) {
              const existing = await getSecret(key);
              if (existing === null) {
                await setSecret(key, "");
              }
              try {
                updateSecretStatus(key, false);
              } catch {
              }
            }
          }
          for (const key of found) {
            try {
              updateSecretStatus(key, true);
            } catch {
            }
          }
          console.log(`
Next steps:`);
          if (missing.length > 0) {
            console.log(`
  1. Configure secrets (${missing.length} pending):`);
            for (const key of missing) {
              const secret = getManifestSecrets(manifest).find(
                (s) => (typeof s === "string" ? s : s.name) === key
              );
              const helpUrl = getSecretLink(secret);
              console.log(`     rudi secrets set ${key} "<your-value>"`);
              if (helpUrl) {
                console.log(`     # Get yours: ${helpUrl}`);
              }
            }
            console.log(`
     Check status: rudi secrets list`);
          } else if (found.length > 0) {
            console.log(`
  1. Secrets: \u2713 ${found.length} configured`);
          } else {
            console.log(`
  1. Secrets: \u2713 None required`);
          }
          const agents = getInstalledAgents();
          if (agents.length > 0) {
            console.log(`
  2. Wire up your agents:`);
            console.log(`     rudi integrate all`);
            console.log(`     # Detected: ${agents.map((a) => a.name).join(", ")}`);
          }
          console.log(`
  3. Restart your agent to use the stack`);
          return;
        }
      }
      console.log(`
\u2713 Installed successfully.`);
    } else {
      console.error(`
\u2717 Installation failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// src/commands/run.js
init_src3();

// packages/runner/src/spawn.js
var import_child_process5 = require("child_process");
var import_path10 = __toESM(require("path"), 1);
var import_fs10 = __toESM(require("fs"), 1);

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/index.js
init_src();
init_src2();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/resolver.js
init_src2();
init_src();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/installer.js
init_src();
init_src2();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/lockfile.js
var import_yaml2 = __toESM(require_dist(), 1);
init_src();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/installer.js
init_shims2();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/deps.js
init_src();
init_src2();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/rudi-config.js
var path14 = __toESM(require("path"), 1);
init_src();
var RUDI_JSON_PATH2 = path14.join(RUDI_HOME, "rudi.json");
var RUDI_JSON_TMP2 = path14.join(RUDI_HOME, "rudi.json.tmp");
var RUDI_JSON_LOCK2 = path14.join(RUDI_HOME, "rudi.json.lock");

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/tool-index.js
var path15 = __toESM(require("path"), 1);
init_src();
var TOOL_INDEX_PATH2 = path15.join(RUDI_HOME, "cache", "tool-index.json");
var TOOL_INDEX_TMP2 = path15.join(RUDI_HOME, "cache", "tool-index.json.tmp");
var SECRETS_PATH2 = path15.join(RUDI_HOME, "secrets.json");

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/index.js
init_shims2();

// node_modules/.pnpm/@learnrudi+core@1.0.2/node_modules/@learnrudi/core/src/system-registry.js
init_src();
init_shims2();

// packages/runner/src/secrets.js
var import_fs9 = __toESM(require("fs"), 1);
var import_path9 = __toESM(require("path"), 1);
var import_os3 = __toESM(require("os"), 1);
var SECRETS_PATH3 = import_path9.default.join(import_os3.default.homedir(), ".rudi", "secrets.json");
function loadSecrets3() {
  if (!import_fs9.default.existsSync(SECRETS_PATH3)) {
    return {};
  }
  try {
    const content = import_fs9.default.readFileSync(SECRETS_PATH3, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
async function getSecrets(required) {
  const allSecrets = loadSecrets3();
  const result = {};
  for (const req of required) {
    const name = typeof req === "string" ? req : req.name;
    const isRequired = typeof req === "string" ? true : req.required !== false;
    if (allSecrets[name]) {
      result[name] = allSecrets[name];
    } else if (isRequired) {
      throw new Error(`Missing required secret: ${name}`);
    }
  }
  return result;
}
function checkSecrets2(required) {
  const allSecrets = loadSecrets3();
  const missing = [];
  for (const req of required) {
    const name = typeof req === "string" ? req : req.name;
    const isRequired = typeof req === "string" ? true : req.required !== false;
    if (isRequired && !allSecrets[name]) {
      missing.push(name);
    }
  }
  return {
    satisfied: missing.length === 0,
    missing
  };
}
function listSecretNames() {
  const secrets = loadSecrets3();
  return Object.keys(secrets);
}
function redactSecrets(text, secrets) {
  const allSecrets = secrets || loadSecrets3();
  let result = text;
  for (const value of Object.values(allSecrets)) {
    if (typeof value === "string" && value.length > 3) {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(escaped, "g"), "[REDACTED]");
    }
  }
  return result;
}

// packages/runner/src/spawn.js
async function runStack(id, options = {}) {
  const { inputs = {}, cwd, env = {}, onStdout, onStderr, onExit, signal } = options;
  const startTime = Date.now();
  const packagePath = getPackagePath(id);
  const manifestPath = import_path10.default.join(packagePath, "manifest.json");
  const { default: fs35 } = await import("fs");
  if (!fs35.existsSync(manifestPath)) {
    throw new Error(`Stack manifest not found: ${id}`);
  }
  const manifest = JSON.parse(fs35.readFileSync(manifestPath, "utf-8"));
  const { command, args } = resolveCommandFromManifest(manifest, packagePath);
  const secrets = await getSecrets(manifest.requires?.secrets || []);
  const runEnv = {
    ...process.env,
    ...env,
    ...secrets,
    RUDI_INPUTS: JSON.stringify(inputs),
    RUDI_PACKAGE_ID: id,
    RUDI_PACKAGE_PATH: packagePath
  };
  const proc = (0, import_child_process5.spawn)(command, args, {
    cwd: cwd || packagePath,
    env: runEnv,
    stdio: ["pipe", "pipe", "pipe"],
    signal
  });
  proc.stdin.write(JSON.stringify(inputs));
  proc.stdin.end();
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (data) => {
    const text = data.toString();
    stdout += text;
    if (onStdout) {
      onStdout(redactSecrets(text, secrets));
    }
  });
  proc.stderr.on("data", (data) => {
    const text = data.toString();
    stderr += text;
    if (onStderr) {
      onStderr(redactSecrets(text, secrets));
    }
  });
  return new Promise((resolve, reject) => {
    proc.on("error", (error) => {
      reject(error);
    });
    proc.on("exit", (code, signal2) => {
      const result = {
        exitCode: code ?? -1,
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
        signal: signal2
      };
      if (onExit) {
        onExit(result);
      }
      resolve(result);
    });
  });
}
function getCommand(runtime) {
  const runtimeName = runtime.replace("runtime:", "");
  const runtimePath = import_path10.default.join(PATHS.runtimes, runtimeName);
  const binaryPaths = [
    import_path10.default.join(runtimePath, "bin", runtimeName === "python" ? "python3" : runtimeName),
    import_path10.default.join(runtimePath, "bin", runtimeName),
    import_path10.default.join(runtimePath, runtimeName === "python" ? "python3" : runtimeName),
    import_path10.default.join(runtimePath, runtimeName)
  ];
  for (const binPath of binaryPaths) {
    if (import_fs10.default.existsSync(binPath)) {
      return binPath;
    }
  }
  switch (runtimeName) {
    case "node":
      return "node";
    case "python":
      return "python3";
    case "shell":
    case "bash":
      return "bash";
    default:
      return runtimeName;
  }
}
function resolveCommandFromManifest(manifest, packagePath) {
  if (manifest.command) {
    const cmdArray = Array.isArray(manifest.command) ? manifest.command : [manifest.command];
    const command2 = resolveRelativePath(cmdArray[0], packagePath);
    const args = cmdArray.slice(1).map((arg) => resolveRelativePath(arg, packagePath));
    return { command: command2, args };
  }
  const entry = manifest.entry || "index.js";
  const entryPath = import_path10.default.join(packagePath, entry);
  const runtime = manifest.runtime || "runtime:node";
  const command = getCommand(runtime);
  return { command, args: [entryPath] };
}
function resolveRelativePath(value, basePath) {
  if (typeof value !== "string" || value.startsWith("-")) {
    return value;
  }
  if (import_path10.default.isAbsolute(value)) {
    return value;
  }
  if (value.includes("/") || value.startsWith(".")) {
    return import_path10.default.join(basePath, value);
  }
  return value;
}

// packages/manifest/src/stack.js
var import_yaml3 = __toESM(require_dist(), 1);
var import_fs11 = __toESM(require("fs"), 1);
var import_path11 = __toESM(require("path"), 1);
function parseStackManifest(filePath) {
  const content = import_fs11.default.readFileSync(filePath, "utf-8");
  return parseStackYaml(content, filePath);
}
function parseStackYaml(content, source = "stack.yaml") {
  const raw = (0, import_yaml3.parse)(content);
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid stack manifest in ${source}: expected object`);
  }
  const manifest = normalizeStackManifest(raw);
  validateStackManifest(manifest, source);
  return manifest;
}
function normalizeStackManifest(raw) {
  const manifest = {
    id: raw.id,
    kind: "stack",
    name: raw.name,
    version: raw.version || "1.0.0",
    description: raw.description,
    author: raw.author,
    license: raw.license,
    entry: raw.entry || raw.main || "index.js"
  };
  if (manifest.id && !manifest.id.startsWith("stack:")) {
    manifest.id = `stack:${manifest.id}`;
  }
  if (raw.requires) {
    manifest.requires = normalizeRequires(raw.requires);
  }
  if (raw.inputs) {
    manifest.inputs = normalizeInputs(raw.inputs);
  }
  if (raw.outputs) {
    manifest.outputs = normalizeOutputs(raw.outputs);
  }
  return manifest;
}
function normalizeRequires(raw) {
  const requires = {};
  if (raw.runtimes) {
    requires.runtimes = Array.isArray(raw.runtimes) ? raw.runtimes : [raw.runtimes];
    requires.runtimes = requires.runtimes.map(
      (r) => r.startsWith("runtime:") ? r : `runtime:${r}`
    );
  }
  if (raw.npm) {
    requires.npm = Array.isArray(raw.npm) ? raw.npm : [raw.npm];
  }
  if (raw.pip) {
    requires.pip = Array.isArray(raw.pip) ? raw.pip : [raw.pip];
  }
  if (raw.secrets) {
    requires.secrets = raw.secrets.map((s) => {
      if (typeof s === "string") {
        return { name: s, required: true };
      }
      return {
        name: s.name,
        required: s.required !== false,
        description: s.description,
        link: s.link,
        hint: s.hint
      };
    });
  }
  return requires;
}
function normalizeInputs(raw) {
  if (!Array.isArray(raw)) {
    return Object.entries(raw).map(([name, def]) => ({
      name,
      ...typeof def === "string" ? { type: def } : def
    }));
  }
  return raw.map((input) => ({
    name: input.name,
    type: input.type || "string",
    description: input.description,
    default: input.default,
    required: input.required || false,
    options: input.options
  }));
}
function normalizeOutputs(raw) {
  if (!Array.isArray(raw)) {
    return Object.entries(raw).map(([name, def]) => ({
      name,
      ...typeof def === "string" ? { type: def } : def
    }));
  }
  return raw.map((output) => ({
    name: output.name,
    type: output.type || "string",
    description: output.description
  }));
}
function validateStackManifest(manifest, source) {
  const errors = [];
  if (!manifest.id) {
    errors.push("Missing required field: id");
  }
  if (!manifest.name) {
    errors.push("Missing required field: name");
  }
  if (!manifest.version) {
    errors.push("Missing required field: version");
  }
  if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
    errors.push(`Invalid version format: ${manifest.version} (expected semver)`);
  }
  if (errors.length > 0) {
    throw new Error(`Invalid stack manifest in ${source}:
  - ${errors.join("\n  - ")}`);
  }
}
function findStackManifest(dir) {
  const candidates = ["stack.yaml", "stack.yml", "manifest.yaml", "manifest.yml"];
  for (const filename of candidates) {
    const filePath = import_path11.default.join(dir, filename);
    if (import_fs11.default.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

// packages/manifest/src/prompt.js
var import_yaml4 = __toESM(require_dist(), 1);

// packages/manifest/src/runtime.js
var import_yaml5 = __toESM(require_dist(), 1);

// packages/manifest/src/validate.js
var import_ajv = __toESM(require_ajv(), 1);
var import_ajv_formats = __toESM(require_dist2(), 1);
var ajv = new import_ajv.default({ allErrors: true, strict: false });
(0, import_ajv_formats.default)(ajv);
var stackSchema = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "string", pattern: "^(stack:)?[a-z0-9-]+$" },
    kind: { const: "stack" },
    name: { type: "string", minLength: 1 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+" },
    description: { type: "string" },
    author: { type: "string" },
    license: { type: "string" },
    entry: { type: "string" },
    requires: {
      type: "object",
      properties: {
        runtimes: {
          type: "array",
          items: { type: "string" }
        },
        npm: {
          type: "array",
          items: { type: "string" }
        },
        pip: {
          type: "array",
          items: { type: "string" }
        },
        secrets: {
          type: "array",
          items: {
            oneOf: [
              { type: "string" },
              {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  required: { type: "boolean" },
                  description: { type: "string" },
                  link: { type: "string", format: "uri" },
                  hint: { type: "string" }
                }
              }
            ]
          }
        }
      }
    },
    inputs: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          type: { enum: ["string", "number", "boolean", "path", "file", "select"] },
          description: { type: "string" },
          default: {},
          required: { type: "boolean" },
          options: { type: "array", items: { type: "string" } }
        }
      }
    },
    outputs: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          type: { enum: ["string", "file", "url", "json"] },
          description: { type: "string" }
        }
      }
    }
  }
};
var promptSchema = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "string", pattern: "^(prompt:)?[a-z0-9-]+$" },
    kind: { const: "prompt" },
    name: { type: "string", minLength: 1 },
    version: { type: "string" },
    description: { type: "string" },
    author: { type: "string" },
    category: { enum: ["coding", "writing", "analysis", "creative"] },
    tags: { type: "array", items: { type: "string" } },
    template: { type: "string" },
    variables: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          type: { enum: ["string", "text", "select", "file"] },
          description: { type: "string" },
          default: {},
          required: { type: "boolean" },
          options: { type: "array", items: { type: "string" } }
        }
      }
    }
  }
};
var runtimeSchema = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "string", pattern: "^(runtime:)?[a-z0-9-]+$" },
    kind: { const: "runtime" },
    name: { type: "string", minLength: 1 },
    version: { type: "string" },
    description: { type: "string" },
    aliases: { type: "array", items: { type: "string" } },
    binaries: {
      type: "array",
      items: {
        type: "object",
        required: ["platform", "url", "sha256"],
        properties: {
          platform: { type: "string" },
          url: { type: "string", format: "uri" },
          sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          size: { type: "integer", minimum: 0 }
        }
      }
    }
  }
};
var validateStackInternal = ajv.compile(stackSchema);
var validatePromptInternal = ajv.compile(promptSchema);
var validateRuntimeInternal = ajv.compile(runtimeSchema);

// src/commands/run.js
var import_fs12 = __toESM(require("fs"), 1);
var import_path12 = __toESM(require("path"), 1);
async function cmdRun(args, flags) {
  const stackId = args[0];
  if (!stackId) {
    console.error("Usage: rudi run <stack> [options]");
    console.error("Example: rudi run pdf-creator");
    process.exit(1);
  }
  const fullId = stackId.includes(":") ? stackId : `stack:${stackId}`;
  if (!isPackageInstalled(fullId)) {
    console.error(`Stack not installed: ${stackId}`);
    console.error(`Install with: rudi install ${stackId}`);
    process.exit(1);
  }
  const packagePath = getPackagePath(fullId);
  let manifest;
  try {
    const manifestPath = findStackManifest(packagePath);
    if (manifestPath) {
      manifest = parseStackManifest(manifestPath);
    } else {
      const jsonPath = import_path12.default.join(packagePath, "manifest.json");
      if (import_fs12.default.existsSync(jsonPath)) {
        manifest = JSON.parse(import_fs12.default.readFileSync(jsonPath, "utf-8"));
      }
    }
  } catch (error) {
    console.error(`Failed to read manifest: ${error.message}`);
    process.exit(1);
  }
  if (!manifest) {
    console.error(`No manifest found for ${stackId}`);
    process.exit(1);
  }
  console.log(`Running: ${manifest.name || stackId}`);
  const requiredSecrets = manifest.requires?.secrets || [];
  if (requiredSecrets.length > 0) {
    const { satisfied, missing } = checkSecrets2(requiredSecrets);
    if (!satisfied) {
      console.error(`
Missing required secrets:`);
      for (const name of missing) {
        console.error(`  - ${name}`);
      }
      console.error(`
Set with: rudi secrets set <name>`);
      process.exit(1);
    }
  }
  let inputs = {};
  if (flags.input) {
    try {
      inputs = JSON.parse(flags.input);
    } catch {
      console.error("Invalid --input JSON");
      process.exit(1);
    }
  }
  const startTime = Date.now();
  try {
    const result = await runStack(fullId, {
      inputs,
      cwd: flags.cwd || process.cwd(),
      onStdout: (data) => process.stdout.write(data),
      onStderr: (data) => process.stderr.write(data)
    });
    const duration = Date.now() - startTime;
    console.log();
    if (result.exitCode === 0) {
      console.log(`\u2713 Completed in ${formatDuration2(duration)}`);
    } else {
      console.log(`\u2717 Exited with code ${result.exitCode}`);
      process.exit(result.exitCode);
    }
  } catch (error) {
    console.error(`
Run failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
function formatDuration2(ms) {
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  const mins = Math.floor(ms / 6e4);
  const secs = Math.floor(ms % 6e4 / 1e3);
  return `${mins}m ${secs}s`;
}

// src/commands/list.js
init_src3();
function pluralizeKind2(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
function headingForKind2(kind) {
  return kind === "binary" ? "BINARIES" : `${kind.toUpperCase()}S`;
}
async function cmdList(args, flags) {
  let kind = args[0];
  if (kind) {
    if (kind === "stacks") kind = "stack";
    if (kind === "prompts") kind = "prompt";
    if (kind === "runtimes") kind = "runtime";
    if (kind === "binaries") kind = "binary";
    if (kind === "tools") kind = "binary";
    if (kind === "agents") kind = "agent";
    if (!["stack", "prompt", "runtime", "binary", "agent"].includes(kind)) {
      console.error(`Invalid kind: ${kind}`);
      console.error(`Valid kinds: stack, prompt, runtime, binary, agent`);
      process.exit(1);
    }
  }
  if (flags.detected && kind === "agent") {
    const installedAgents = getInstalledAgents();
    const summary = getMcpServerSummary();
    if (flags.json) {
      console.log(JSON.stringify({ installedAgents, summary }, null, 2));
      return;
    }
    console.log(`
DETECTED AI AGENTS (${installedAgents.length}/${AGENT_CONFIGS.length}):`);
    console.log("\u2500".repeat(50));
    for (const agent of AGENT_CONFIGS) {
      const installed = installedAgents.find((a) => a.id === agent.id);
      const serverCount = summary[agent.id]?.serverCount || 0;
      if (installed) {
        console.log(`  \u2713 ${agent.name}`);
        console.log(`    ${serverCount} MCP server(s)`);
        console.log(`    ${installed.configFile}`);
      } else {
        console.log(`  \u25CB ${agent.name} (not installed)`);
      }
    }
    console.log(`
Installed: ${installedAgents.length} of ${AGENT_CONFIGS.length} agents`);
    return;
  }
  if (flags.detected && kind === "stack") {
    const servers = detectAllMcpServers();
    if (flags.json) {
      console.log(JSON.stringify(servers, null, 2));
      return;
    }
    if (servers.length === 0) {
      console.log("No MCP servers detected in agent configs.");
      console.log("\nChecked these agents:");
      for (const agent of AGENT_CONFIGS) {
        console.log(`  - ${agent.name}`);
      }
      return;
    }
    const byAgent = {};
    for (const server of servers) {
      if (!byAgent[server.agent]) byAgent[server.agent] = [];
      byAgent[server.agent].push(server);
    }
    console.log(`
DETECTED MCP SERVERS (${servers.length}):`);
    console.log("\u2500".repeat(50));
    for (const [agentId, agentServers] of Object.entries(byAgent)) {
      const agentName = agentServers[0]?.agentName || agentId;
      console.log(`
  ${agentName.toUpperCase()} (${agentServers.length}):`);
      for (const server of agentServers) {
        console.log(`    \u{1F4E6} ${server.name}`);
        console.log(`       ${server.command} ${server.cwd ? `(${server.cwd})` : ""}`);
      }
    }
    console.log(`
Total: ${servers.length} MCP server(s) configured`);
    return;
  }
  try {
    let packages = await listInstalled(kind);
    const categoryFilter = flags.category;
    if (categoryFilter) {
      packages = packages.filter((p) => p.category === categoryFilter);
    }
    if (flags.json) {
      console.log(JSON.stringify(packages, null, 2));
      return;
    }
    if (packages.length === 0) {
      if (categoryFilter) {
        console.log(`No ${pluralizeKind2(kind)} found in category: ${categoryFilter}`);
      } else if (kind) {
        console.log(`No ${pluralizeKind2(kind)} installed.`);
      } else {
        console.log("No packages installed.");
      }
      console.log(`
Install with: rudi install <package>`);
      return;
    }
    if (kind === "prompt" && !categoryFilter) {
      const byCategory = {};
      for (const pkg of packages) {
        const cat = pkg.category || "general";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(pkg);
      }
      console.log(`
PROMPTS (${packages.length}):`);
      console.log("\u2500".repeat(50));
      for (const [category, prompts] of Object.entries(byCategory).sort()) {
        console.log(`
  ${category.toUpperCase()} (${prompts.length}):`);
        for (const pkg of prompts) {
          const icon = pkg.icon ? `${pkg.icon} ` : "";
          console.log(`    ${icon}${pkg.id || `prompt:${pkg.name}`}`);
          if (pkg.description) {
            console.log(`      ${pkg.description}`);
          }
          if (pkg.tags && pkg.tags.length > 0) {
            console.log(`      Tags: ${pkg.tags.join(", ")}`);
          }
        }
      }
      console.log(`
Total: ${packages.length} prompt(s)`);
      console.log(`
Filter by category: rudi list prompts --category=coding`);
      return;
    }
    const grouped = {
      stack: packages.filter((p) => p.kind === "stack"),
      prompt: packages.filter((p) => p.kind === "prompt"),
      runtime: packages.filter((p) => p.kind === "runtime"),
      binary: packages.filter((p) => p.kind === "binary"),
      agent: packages.filter((p) => p.kind === "agent")
    };
    let total = 0;
    for (const [pkgKind, pkgs] of Object.entries(grouped)) {
      if (pkgs.length === 0) continue;
      if (kind && kind !== pkgKind) continue;
      console.log(`
${headingForKind2(pkgKind)} (${pkgs.length}):`);
      console.log("\u2500".repeat(50));
      for (const pkg of pkgs) {
        const icon = pkg.icon ? `${pkg.icon} ` : "";
        console.log(`  ${icon}${pkg.id || `${pkgKind}:${pkg.name}`}`);
        console.log(`    Version: ${pkg.version || "unknown"}`);
        if (pkg.description) {
          console.log(`    ${pkg.description}`);
        }
        if (pkg.category) {
          console.log(`    Category: ${pkg.category}`);
        }
        if (pkg.tags && pkg.tags.length > 0) {
          console.log(`    Tags: ${pkg.tags.join(", ")}`);
        }
        if (pkg.installedAt) {
          console.log(`    Installed: ${new Date(pkg.installedAt).toLocaleDateString()}`);
        }
        total++;
      }
    }
    console.log(`
Total: ${total} package(s)`);
  } catch (error) {
    console.error(`Failed to list packages: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/remove.js
init_src3();
function pluralizeKind3(kind) {
  if (!kind) return "packages";
  return kind === "binary" ? "binaries" : `${kind}s`;
}
async function cmdRemove(args, flags) {
  if (flags.all) {
    return await removeBulk(args[0], flags);
  }
  const pkgId = args[0];
  if (!pkgId) {
    console.error("Usage: rudi remove <package>");
    console.error("       rudi remove --all                           (remove all packages)");
    console.error("       rudi remove stacks --all                    (remove all stacks)");
    console.error("       rudi remove <package> --agent=claude        (unregister from Claude only)");
    console.error("       rudi remove <package> --agent=claude,codex  (unregister from specific agents)");
    console.error("Example: rudi remove pdf-creator");
    process.exit(1);
  }
  let targetAgents = null;
  if (flags.agent) {
    const validAgents = ["claude", "codex", "gemini"];
    targetAgents = flags.agent.split(",").map((a) => a.trim()).filter((a) => validAgents.includes(a));
    if (targetAgents.length === 0) {
      console.error(`Invalid --agent value. Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
  }
  const fullId = pkgId.includes(":") ? pkgId : `stack:${pkgId}`;
  if (!isPackageInstalled(fullId)) {
    console.error(`Package not installed: ${pkgId}`);
    process.exit(1);
  }
  if (!flags.force && !flags.y) {
    console.log(`This will remove: ${fullId}`);
    console.log(`Run with --force to confirm.`);
    process.exit(0);
  }
  console.log(`Removing ${fullId}...`);
  try {
    const result = await uninstallPackage(fullId);
    if (result.success) {
      const stackId = fullId.replace(/^stack:/, "");
      await unregisterMcpAll(stackId, targetAgents);
      console.log(`\u2713 Removed ${fullId}`);
    } else {
      console.error(`\u2717 Failed to remove: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Remove failed: ${error.message}`);
    process.exit(1);
  }
}
async function removeBulk(kind, flags) {
  let targetAgents = null;
  if (flags.agent) {
    const validAgents = ["claude", "codex", "gemini"];
    targetAgents = flags.agent.split(",").map((a) => a.trim()).filter((a) => validAgents.includes(a));
    if (targetAgents.length === 0) {
      console.error(`Invalid --agent value. Valid agents: ${validAgents.join(", ")}`);
      process.exit(1);
    }
  }
  if (kind) {
    if (kind === "stacks") kind = "stack";
    if (kind === "prompts") kind = "prompt";
    if (kind === "runtimes") kind = "runtime";
    if (kind === "binaries") kind = "binary";
    if (kind === "tools") kind = "binary";
    if (kind === "agents") kind = "agent";
    if (!["stack", "prompt", "runtime", "binary", "agent"].includes(kind)) {
      console.error(`Invalid kind: ${kind}`);
      console.error(`Valid kinds: stack, prompt, runtime, binary, agent`);
      process.exit(1);
    }
  }
  try {
    const packages = await listInstalled(kind);
    if (packages.length === 0) {
      console.log(kind ? `No ${pluralizeKind3(kind)} installed.` : "No packages installed.");
      return;
    }
    console.log(kind ? `
Found ${packages.length} ${pluralizeKind3(kind)} to remove:` : `
Found ${packages.length} package(s) to remove:`);
    for (const pkg of packages) {
      console.log(`  - ${pkg.id}`);
    }
    if (!flags.force && !flags.y) {
      console.log(`
Run with --force to confirm removal.`);
      process.exit(0);
    }
    console.log(`
Removing packages...`);
    let succeeded = 0;
    let failed = 0;
    for (const pkg of packages) {
      try {
        const result = await uninstallPackage(pkg.id);
        if (result.success) {
          if (pkg.kind === "stack") {
            const stackId = pkg.id.replace(/^stack:/, "");
            await unregisterMcpAll(stackId, targetAgents);
          }
          console.log(`  \u2713 Removed ${pkg.id}`);
          succeeded++;
        } else {
          console.error(`  \u2717 Failed to remove ${pkg.id}: ${result.error}`);
          failed++;
        }
      } catch (error) {
        console.error(`  \u2717 Failed to remove ${pkg.id}: ${error.message}`);
        failed++;
      }
    }
    console.log(`
Removal complete: ${succeeded} succeeded, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`Bulk removal failed: ${error.message}`);
    process.exit(1);
  }
}

// src/commands/secrets.js
var import_readline = __toESM(require("readline"), 1);
async function cmdSecrets(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "set":
      await secretsSet(args.slice(1), flags);
      break;
    case "get":
      await secretsGet(args.slice(1), flags);
      break;
    case "list":
    case "ls":
      await secretsList(flags);
      break;
    case "remove":
    case "rm":
    case "delete":
      await secretsRemove(args.slice(1), flags);
      break;
    case "info":
      secretsInfo();
      break;
    default:
      console.log(`
rudi secrets - Manage secrets (stored in ${getStorageInfo().backend})

COMMANDS
  set <name>       Set a secret (prompts for value securely)
  get <name>       Get a secret value (for scripts)
  list             List configured secrets (values masked)
  remove <name>    Remove a secret
  info             Show storage backend info

EXAMPLES
  rudi secrets set SLACK_BOT_TOKEN
  rudi secrets list
  rudi secrets remove GITHUB_TOKEN

SECURITY
  Secrets are stored in macOS Keychain when available.
  Fallback uses encrypted JSON at ~/.rudi/secrets.json
`);
  }
}
async function secretsSet(args, flags) {
  const name = args[0];
  const valueArg = args[1];
  if (!name) {
    console.error("Usage: rudi secrets set <name> [value]");
    console.error("");
    console.error("Examples:");
    console.error("  rudi secrets set SLACK_BOT_TOKEN              # Interactive prompt");
    console.error('  rudi secrets set SLACK_BOT_TOKEN "xoxb-..."   # Direct value');
    process.exit(1);
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
    console.error("Secret name should be UPPER_SNAKE_CASE");
    console.error("Example: SLACK_BOT_TOKEN, GITHUB_API_KEY");
    process.exit(1);
  }
  const exists = await hasSecret(name);
  if (exists && !flags.force) {
    console.log(`Secret ${name} already exists.`);
    console.log("Use --force to overwrite.");
    process.exit(0);
  }
  let value = valueArg;
  if (!value) {
    if (process.stdin.isTTY) {
      value = await promptSecret(`Enter value for ${name}: `);
    } else {
      console.error("No value provided.");
      console.error("Usage: rudi secrets set <name> <value>");
      process.exit(1);
    }
  }
  if (!value) {
    console.error("No value provided");
    process.exit(1);
  }
  await setSecret(name, value);
  const info = getStorageInfo();
  console.log(`\u2713 Secret ${name} saved (${info.backend})`);
}
async function secretsGet(args, flags) {
  const name = args[0];
  if (!name) {
    console.error("Usage: rudi secrets get <name>");
    process.exit(1);
  }
  const value = await getSecret(name);
  if (value) {
    process.stdout.write(value);
  } else {
    process.exit(1);
  }
}
async function secretsList(flags) {
  const names = await listSecrets();
  if (names.length === 0) {
    console.log("No secrets configured.");
    console.log("\nSet with: rudi secrets set <name>");
    return;
  }
  if (flags.json) {
    const masked2 = await getMaskedSecrets();
    console.log(JSON.stringify(masked2, null, 2));
    return;
  }
  const masked = await getMaskedSecrets();
  const info = getStorageInfo();
  const pending = Object.values(masked).filter((v) => v === "(pending)").length;
  const configured = names.length - pending;
  console.log(`
Secrets (${info.backend}):`);
  console.log("\u2500".repeat(50));
  for (const name of names) {
    const status = masked[name] === "(pending)" ? "\u25CB" : "\u2713";
    console.log(`  ${status} ${name.padEnd(28)} ${masked[name]}`);
  }
  console.log("\u2500".repeat(50));
  if (pending > 0) {
    console.log(`  ${configured} configured, ${pending} pending`);
    console.log(`
  Set pending: rudi secrets set <name> "<value>"`);
  } else {
    console.log(`  ${configured} configured`);
  }
}
async function secretsRemove(args, flags) {
  const name = args[0];
  if (!name) {
    console.error("Usage: rudi secrets remove <name>");
    process.exit(1);
  }
  const allNames = await listSecrets();
  if (!allNames.includes(name)) {
    console.error(`Secret not found: ${name}`);
    process.exit(1);
  }
  if (!flags.force && !flags.y) {
    console.log(`This will remove secret: ${name}`);
    console.log("Run with --force to confirm.");
    process.exit(0);
  }
  await removeSecret(name);
  console.log(`\u2713 Secret ${name} removed`);
}
function secretsInfo() {
  const info = getStorageInfo();
  console.log("\nSecrets Storage:");
  console.log("\u2500".repeat(50));
  console.log(`  Backend: ${info.backend}`);
  console.log(`  File: ${info.file}`);
  console.log(`  Permissions: ${info.permissions}`);
  console.log("");
  console.log("  Security: File permissions (0600) protect secrets.");
  console.log("  Same approach as AWS CLI, SSH, GitHub CLI.");
}
function promptSecret(prompt) {
  return new Promise((resolve) => {
    const rl = import_readline.default.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    process.stdout.write(prompt);
    let input = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\n" || char === "\r") {
        process.stdin.setRawMode(false);
        process.stdin.removeListener("data", onData);
        console.log();
        rl.close();
        resolve(input);
      } else if (char === "") {
        process.exit(0);
      } else if (char === "\x7F") {
        if (input.length > 0) {
          input = input.slice(0, -1);
        }
      } else {
        input += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

// src/commands/db.js
var import_fs14 = require("fs");
var import_path14 = require("path");

// packages/db/src/index.js
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path13 = __toESM(require("path"), 1);
var import_fs13 = __toESM(require("fs"), 1);
init_src();

// packages/db/src/schema.js
var SCHEMA_VERSION = 5;
var SCHEMA_SQL = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

-- =============================================================================
-- SESSIONS/CONVERSATIONS (existing)
-- =============================================================================

-- Projects (provider-scoped groupings)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('claude', 'codex', 'gemini', 'ollama')),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  cross_project_id TEXT,
  session_count INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_at TEXT NOT NULL,

  UNIQUE(provider, name)
);

CREATE INDEX IF NOT EXISTS idx_projects_provider ON projects(provider);

-- Sessions (conversation containers)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('claude', 'codex', 'gemini', 'ollama')),
  provider_session_id TEXT,
  project_id TEXT,

  -- Origin tracking
  origin TEXT NOT NULL CHECK (origin IN ('rudi', 'provider-import', 'mixed')),
  origin_imported_at TEXT,
  origin_native_file TEXT,

  -- Display
  title TEXT,
  snippet TEXT,

  -- State
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  model TEXT,

  -- Context
  cwd TEXT,
  dir_scope TEXT DEFAULT 'project',
  git_branch TEXT,
  native_storage_path TEXT,

  -- Claude-specific metadata
  inherit_project_prompt INTEGER DEFAULT 1,
  is_warmup INTEGER DEFAULT 0,
  parent_session_id TEXT,
  agent_id TEXT,
  is_sidechain INTEGER DEFAULT 0,
  session_type TEXT DEFAULT 'task',
  version TEXT,
  user_type TEXT DEFAULT 'external',

  -- Timestamps
  created_at TEXT NOT NULL,
  last_active_at TEXT NOT NULL,
  deleted_at TEXT,

  -- Aggregates (denormalized for performance)
  turn_count INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_provider ON sessions(provider);
CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_provider_session ON sessions(provider, provider_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_cwd ON sessions(cwd);

-- Turns (individual user->assistant exchanges)
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_session_id TEXT,

  -- Sequence
  turn_number INTEGER NOT NULL,

  -- Content
  user_message TEXT,
  assistant_response TEXT,
  thinking TEXT,

  -- Config at time of turn
  model TEXT,
  permission_mode TEXT,

  -- Metrics
  cost REAL,
  duration_ms INTEGER,
  duration_api_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cache_read_tokens INTEGER,
  cache_creation_tokens INTEGER,

  -- Completion
  finish_reason TEXT,
  error TEXT,

  -- Rich metadata (JSON)
  tools_used TEXT,

  -- Timestamps
  ts TEXT NOT NULL,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_ts ON turns(ts DESC);
CREATE INDEX IF NOT EXISTS idx_turns_model ON turns(model);
CREATE INDEX IF NOT EXISTS idx_turns_session_number ON turns(session_id, turn_number);

-- Full-text search on turns
CREATE VIRTUAL TABLE IF NOT EXISTS turns_fts USING fts5(
  user_message,
  assistant_response,
  content='turns',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS turns_ai AFTER INSERT ON turns BEGIN
  INSERT INTO turns_fts(rowid, user_message, assistant_response)
  VALUES (NEW.rowid, NEW.user_message, NEW.assistant_response);
END;

CREATE TRIGGER IF NOT EXISTS turns_ad AFTER DELETE ON turns BEGIN
  INSERT INTO turns_fts(turns_fts, rowid, user_message, assistant_response)
  VALUES ('delete', OLD.rowid, OLD.user_message, OLD.assistant_response);
END;

CREATE TRIGGER IF NOT EXISTS turns_au AFTER UPDATE ON turns BEGIN
  INSERT INTO turns_fts(turns_fts, rowid, user_message, assistant_response)
  VALUES ('delete', OLD.rowid, OLD.user_message, OLD.assistant_response);
  INSERT INTO turns_fts(rowid, user_message, assistant_response)
  VALUES (NEW.rowid, NEW.user_message, NEW.assistant_response);
END;

-- Tags (many-to-many with sessions)
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS session_tags (
  session_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (session_id, tag_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Model pricing (for cost calculation)
CREATE TABLE IF NOT EXISTS model_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL CHECK (provider IN ('claude', 'codex', 'gemini', 'openai', 'ollama')),
  model_pattern TEXT NOT NULL,
  display_name TEXT,
  input_cost_per_mtok REAL NOT NULL,
  output_cost_per_mtok REAL NOT NULL,
  cache_read_cost_per_mtok REAL DEFAULT 0,
  cache_write_cost_per_mtok REAL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_until TEXT,
  notes TEXT,

  UNIQUE(provider, model_pattern, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
CREATE INDEX IF NOT EXISTS idx_model_pricing_pattern ON model_pricing(model_pattern);

-- =============================================================================
-- PACKAGES (stacks, prompts, runtimes, binaries, agents)
-- =============================================================================

-- Installed packages
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,              -- e.g., 'stack:pdf-creator', 'binary:ffmpeg', 'agent:claude'
  kind TEXT NOT NULL CHECK (kind IN ('stack', 'prompt', 'runtime', 'binary', 'tool', 'agent')),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,

  -- Source
  source TEXT NOT NULL CHECK (source IN ('registry', 'local', 'bundled')),
  source_url TEXT,

  -- Installation
  install_path TEXT NOT NULL,
  installed_at TEXT NOT NULL,
  updated_at TEXT,

  -- Metadata (JSON)
  manifest_json TEXT,

  -- State
  status TEXT DEFAULT 'installed' CHECK (status IN ('installed', 'disabled', 'broken'))
);

CREATE INDEX IF NOT EXISTS idx_packages_kind ON packages(kind);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

-- Package dependencies
CREATE TABLE IF NOT EXISTS package_deps (
  package_id TEXT NOT NULL,
  depends_on TEXT NOT NULL,         -- e.g., 'runtime:python'
  version_constraint TEXT,          -- e.g., '>=3.10'
  PRIMARY KEY (package_id, depends_on),
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- Stack runs
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  package_version TEXT NOT NULL,

  -- Inputs/outputs (JSON)
  inputs_json TEXT,
  outputs_json TEXT,

  -- Secrets used (names only, not values)
  secrets_used TEXT,                -- JSON array of secret names

  -- Execution
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
  exit_code INTEGER,
  error TEXT,

  -- Context
  cwd TEXT,

  -- Timestamps
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_ms INTEGER,

  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_runs_package ON runs(package_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(started_at DESC);

-- Run artifacts (files produced by runs)
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,

  -- File info
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,

  -- Metadata
  created_at TEXT NOT NULL,

  FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifacts(run_id);

-- Lockfiles (for reproducibility)
CREATE TABLE IF NOT EXISTS lockfiles (
  package_id TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,       -- Full lockfile content
  created_at TEXT NOT NULL,
  updated_at TEXT,

  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- =============================================================================
-- SECRETS (metadata only - actual values stored elsewhere)
-- =============================================================================

CREATE TABLE IF NOT EXISTS secrets_meta (
  name TEXT PRIMARY KEY,            -- e.g., 'VERCEL_TOKEN'
  description TEXT,
  hint TEXT,                        -- e.g., 'Starts with vcel_'
  link TEXT,                        -- URL for setup help
  added_at TEXT NOT NULL,
  last_used_at TEXT
);
`;
function initSchema() {
  const db2 = getDb();
  const hasVersionTable = db2.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
  `).get();
  if (!hasVersionTable) {
    console.log("Initializing database schema...");
    db2.exec(SCHEMA_SQL);
    db2.prepare("INSERT INTO schema_version (version, applied_at) VALUES (?, ?)").run(SCHEMA_VERSION, (/* @__PURE__ */ new Date()).toISOString());
    seedModelPricing(db2);
    console.log(`Database initialized at schema version ${SCHEMA_VERSION}`);
    return { version: SCHEMA_VERSION, migrated: false };
  }
  const currentVersion = db2.prepare("SELECT MAX(version) as v FROM schema_version").get().v || 0;
  if (currentVersion < SCHEMA_VERSION) {
    runMigrations(db2, currentVersion, SCHEMA_VERSION);
    return { version: SCHEMA_VERSION, migrated: true, from: currentVersion };
  }
  return { version: currentVersion, migrated: false };
}
function runMigrations(db2, from, to) {
  console.log(`Migrating database from v${from} to v${to}...`);
  const migrations = {
    // Version 2: Add model_pricing table
    2: (db3) => {
      db3.exec(`
        CREATE TABLE IF NOT EXISTS model_pricing (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL CHECK (provider IN ('claude', 'codex', 'gemini', 'openai', 'ollama')),
          model_pattern TEXT NOT NULL,
          display_name TEXT,
          input_cost_per_mtok REAL NOT NULL,
          output_cost_per_mtok REAL NOT NULL,
          cache_read_cost_per_mtok REAL DEFAULT 0,
          cache_write_cost_per_mtok REAL DEFAULT 0,
          effective_from TEXT NOT NULL,
          effective_until TEXT,
          notes TEXT,
          UNIQUE(provider, model_pattern, effective_from)
        );
        CREATE INDEX IF NOT EXISTS idx_model_pricing_provider ON model_pricing(provider);
        CREATE INDEX IF NOT EXISTS idx_model_pricing_pattern ON model_pricing(model_pattern);
      `);
      seedModelPricing(db3);
    },
    // Version 3: Add packages, runs, artifacts, lockfiles, secrets_meta tables
    3: (db3) => {
      db3.exec(`
        CREATE TABLE IF NOT EXISTS packages (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('stack', 'prompt', 'runtime', 'binary', 'tool', 'agent')),
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          description TEXT,
          source TEXT NOT NULL CHECK (source IN ('registry', 'local', 'bundled')),
          source_url TEXT,
          install_path TEXT NOT NULL,
          installed_at TEXT NOT NULL,
          updated_at TEXT,
          manifest_json TEXT,
          status TEXT DEFAULT 'installed' CHECK (status IN ('installed', 'disabled', 'broken'))
        );
        CREATE INDEX IF NOT EXISTS idx_packages_kind ON packages(kind);
        CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

        CREATE TABLE IF NOT EXISTS package_deps (
          package_id TEXT NOT NULL,
          depends_on TEXT NOT NULL,
          version_constraint TEXT,
          PRIMARY KEY (package_id, depends_on),
          FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          package_id TEXT NOT NULL,
          package_version TEXT NOT NULL,
          inputs_json TEXT,
          outputs_json TEXT,
          secrets_used TEXT,
          status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled')),
          exit_code INTEGER,
          error TEXT,
          cwd TEXT,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          duration_ms INTEGER,
          FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_runs_package ON runs(package_id);
        CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
        CREATE INDEX IF NOT EXISTS idx_runs_started ON runs(started_at DESC);

        CREATE TABLE IF NOT EXISTS artifacts (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          path TEXT NOT NULL,
          mime_type TEXT,
          size_bytes INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_artifacts_run ON artifacts(run_id);

        CREATE TABLE IF NOT EXISTS lockfiles (
          package_id TEXT PRIMARY KEY,
          content_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS secrets_meta (
          name TEXT PRIMARY KEY,
          description TEXT,
          hint TEXT,
          link TEXT,
          added_at TEXT NOT NULL,
          last_used_at TEXT
        );
      `);
    },
    // Version 4: Allow binary kind in packages (rename tool -> binary)
    4: (db3) => {
      db3.exec(`
        PRAGMA foreign_keys=OFF;

        CREATE TABLE IF NOT EXISTS packages_new (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('stack', 'prompt', 'runtime', 'binary', 'tool', 'agent')),
          name TEXT NOT NULL,
          version TEXT NOT NULL,
          description TEXT,
          source TEXT NOT NULL CHECK (source IN ('registry', 'local', 'bundled')),
          source_url TEXT,
          install_path TEXT NOT NULL,
          installed_at TEXT NOT NULL,
          updated_at TEXT,
          manifest_json TEXT,
          status TEXT DEFAULT 'installed' CHECK (status IN ('installed', 'disabled', 'broken'))
        );

        INSERT INTO packages_new (
          id,
          kind,
          name,
          version,
          description,
          source,
          source_url,
          install_path,
          installed_at,
          updated_at,
          manifest_json,
          status
        )
        SELECT
          id,
          CASE WHEN kind = 'tool' THEN 'binary' ELSE kind END,
          name,
          version,
          description,
          source,
          source_url,
          install_path,
          installed_at,
          updated_at,
          manifest_json,
          status
        FROM packages;

        DROP TABLE packages;
        ALTER TABLE packages_new RENAME TO packages;

        CREATE INDEX IF NOT EXISTS idx_packages_kind ON packages(kind);
        CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

        PRAGMA foreign_keys=ON;
      `);
    },
    // Version 5: Add session metadata columns for Claude import
    5: (db3) => {
      db3.exec(`
        ALTER TABLE sessions ADD COLUMN dir_scope TEXT DEFAULT 'project';
        ALTER TABLE sessions ADD COLUMN inherit_project_prompt INTEGER DEFAULT 1;
        ALTER TABLE sessions ADD COLUMN is_warmup INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN parent_session_id TEXT;
        ALTER TABLE sessions ADD COLUMN agent_id TEXT;
        ALTER TABLE sessions ADD COLUMN is_sidechain INTEGER DEFAULT 0;
        ALTER TABLE sessions ADD COLUMN session_type TEXT DEFAULT 'task';
        ALTER TABLE sessions ADD COLUMN version TEXT;
        ALTER TABLE sessions ADD COLUMN user_type TEXT DEFAULT 'external';
      `);
    }
  };
  for (let v = from + 1; v <= to; v++) {
    if (migrations[v]) {
      console.log(`  Applying migration v${v}...`);
      const applyMigration = () => {
        migrations[v](db2);
        db2.prepare("INSERT INTO schema_version (version, applied_at) VALUES (?, ?)").run(v, (/* @__PURE__ */ new Date()).toISOString());
      };
      if (v === 4) {
        applyMigration();
      } else {
        db2.transaction(applyMigration)();
      }
    }
  }
  console.log("Migrations complete.");
}
function seedModelPricing(db2) {
  const insert = db2.prepare(`
    INSERT OR REPLACE INTO model_pricing
    (provider, model_pattern, display_name, input_cost_per_mtok, output_cost_per_mtok, cache_read_cost_per_mtok, cache_write_cost_per_mtok, effective_from, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const pricingData = [
    // Claude models (Anthropic)
    ["claude", "claude-opus-4-5-%", "Claude Opus 4.5", 15, 75, 1.5, 18.75, "2025-01-01", "Most capable"],
    ["claude", "claude-sonnet-4-5-%", "Claude Sonnet 4.5", 3, 15, 0.3, 3.75, "2025-01-01", "Best balance"],
    ["claude", "claude-haiku-4-5-%", "Claude Haiku 4.5", 0.8, 4, 0.08, 1, "2025-01-01", "Fastest"],
    ["claude", "claude-opus-4-1-%", "Claude Opus 4.1", 15, 75, 1.5, 18.75, "2025-01-01", "Previous gen"],
    ["claude", "claude-3-5-haiku-%", "Claude 3.5 Haiku", 0.8, 4, 0.08, 1, "2024-10-01", "Legacy"],
    ["claude", "claude-3-5-sonnet-%", "Claude 3.5 Sonnet", 3, 15, 0.3, 3.75, "2024-06-01", "Legacy"],
    // Codex/OpenAI models
    ["codex", "gpt-5.1-codex-max", "Codex Max", 10, 30, 0, 0, "2025-01-01", "Most capable"],
    ["codex", "gpt-5.1-codex-mini", "Codex Mini", 1.5, 6, 0, 0, "2025-01-01", "Fastest"],
    ["codex", "gpt-5.1-codex", "Codex Standard", 5, 15, 0, 0, "2025-01-01", "Default"],
    ["codex", "gpt-5-codex", "Codex 5", 5, 15, 0, 0, "2025-01-01", "Previous gen"],
    ["codex", "gpt-4o", "GPT-4o", 5, 15, 0, 0, "2024-05-01", "Multimodal"],
    ["codex", "gpt-4o-mini", "GPT-4o Mini", 0.15, 0.6, 0, 0, "2024-07-01", "Fast/cheap"],
    ["codex", "o1", "o1", 15, 60, 0, 0, "2024-12-01", "Reasoning"],
    ["codex", "o1-mini", "o1 Mini", 3, 12, 0, 0, "2024-09-01", "Reasoning light"],
    ["codex", "o3-mini", "o3 Mini", 1.1, 4.4, 0, 0, "2025-01-01", "Latest reasoning"],
    // Gemini models
    ["gemini", "gemini-2.5-pro%", "Gemini 2.5 Pro", 1.25, 5, 0, 0, "2025-01-01", "Most capable"],
    ["gemini", "gemini-2.5-flash%", "Gemini 2.5 Flash", 0.075, 0.3, 0, 0, "2025-01-01", "Fast/cheap"],
    ["gemini", "gemini-2.0-flash%", "Gemini 2.0 Flash", 0.1, 0.4, 0, 0, "2024-12-01", "Previous flash"],
    ["gemini", "gemini-1.5-pro%", "Gemini 1.5 Pro", 1.25, 5, 0, 0, "2024-05-01", "Legacy pro"],
    ["gemini", "gemini-1.5-flash%", "Gemini 1.5 Flash", 0.075, 0.3, 0, 0, "2024-05-01", "Legacy flash"],
    ["gemini", "gemini%", "Gemini (default)", 0.1, 0.4, 0, 0, "2024-01-01", "Fallback"],
    // Ollama (local - free)
    ["ollama", "%", "Local Model", 0, 0, 0, 0, "2024-01-01", "Free local inference"]
  ];
  for (const row of pricingData) {
    insert.run(...row);
  }
  console.log(`  Seeded ${pricingData.length} model pricing entries`);
}

// packages/db/src/search.js
function search(query, options = {}) {
  const { limit = 20, provider, sessionId, offset = 0 } = options;
  const db2 = getDb();
  const ftsQuery = prepareFtsQuery(query);
  let sql = `
    SELECT
      t.id,
      t.session_id,
      t.turn_number,
      t.user_message,
      t.assistant_response,
      t.model,
      t.ts,
      s.title as session_title,
      s.provider,
      s.cwd,
      highlight(turns_fts, 0, '>>>', '<<<') as user_highlighted,
      highlight(turns_fts, 1, '>>>', '<<<') as assistant_highlighted,
      bm25(turns_fts) as rank
    FROM turns_fts
    JOIN turns t ON turns_fts.rowid = t.rowid
    JOIN sessions s ON t.session_id = s.id
    WHERE turns_fts MATCH ?
  `;
  const params = [ftsQuery];
  if (provider) {
    sql += " AND s.provider = ?";
    params.push(provider);
  }
  if (sessionId) {
    sql += " AND t.session_id = ?";
    params.push(sessionId);
  }
  sql += ` ORDER BY rank LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  try {
    return db2.prepare(sql).all(...params);
  } catch (err) {
    return searchFallback(query, options);
  }
}
function prepareFtsQuery(query) {
  let cleaned = query.replace(/['"]/g, "").replace(/[()]/g, "").replace(/[-]/g, " ").replace(/[*]/g, "").trim();
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) {
    return '""';
  }
  if (words.length === 1) {
    return `"${words[0]}"*`;
  }
  return words.map((w) => `"${w}"*`).join(" ");
}
function searchFallback(query, options = {}) {
  const { limit = 20, provider, sessionId, offset = 0 } = options;
  const db2 = getDb();
  let sql = `
    SELECT
      t.id,
      t.session_id,
      t.turn_number,
      t.user_message,
      t.assistant_response,
      t.model,
      t.ts,
      s.title as session_title,
      s.provider,
      s.cwd
    FROM turns t
    JOIN sessions s ON t.session_id = s.id
    WHERE (t.user_message LIKE ? OR t.assistant_response LIKE ?)
  `;
  const likeQuery = `%${query}%`;
  const params = [likeQuery, likeQuery];
  if (provider) {
    sql += " AND s.provider = ?";
    params.push(provider);
  }
  if (sessionId) {
    sql += " AND t.session_id = ?";
    params.push(sessionId);
  }
  sql += ` ORDER BY t.ts DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  return db2.prepare(sql).all(...params);
}

// packages/db/src/stats.js
function getStats() {
  const db2 = getDb();
  const totals = db2.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(turn_count) as total_turns,
      SUM(total_cost) as total_cost,
      SUM(total_input_tokens) as total_input_tokens,
      SUM(total_output_tokens) as total_output_tokens,
      SUM(total_duration_ms) as total_duration_ms
    FROM sessions
    WHERE status != 'deleted'
  `).get();
  const byProvider = db2.prepare(`
    SELECT
      provider,
      COUNT(*) as sessions,
      SUM(turn_count) as turns,
      SUM(total_cost) as cost,
      SUM(total_input_tokens) as input_tokens,
      SUM(total_output_tokens) as output_tokens
    FROM sessions
    WHERE status != 'deleted'
    GROUP BY provider
    ORDER BY cost DESC
  `).all();
  const byModel = db2.prepare(`
    SELECT
      model,
      COUNT(*) as turns,
      SUM(cost) as cost,
      SUM(input_tokens) as input_tokens,
      SUM(output_tokens) as output_tokens
    FROM turns
    WHERE model IS NOT NULL
    GROUP BY model
    ORDER BY cost DESC
    LIMIT 10
  `).all();
  const recentActivity = db2.prepare(`
    SELECT
      DATE(last_active_at) as date,
      COUNT(*) as sessions,
      SUM(total_cost) as cost,
      SUM(turn_count) as turns
    FROM sessions
    WHERE last_active_at > datetime('now', '-30 days')
      AND status != 'deleted'
    GROUP BY DATE(last_active_at)
    ORDER BY date DESC
  `).all();
  const topSessions = db2.prepare(`
    SELECT
      id,
      title,
      provider,
      turn_count,
      total_cost,
      last_active_at
    FROM sessions
    WHERE status != 'deleted'
    ORDER BY turn_count DESC
    LIMIT 10
  `).all();
  const toolsUsage = getToolsUsage(db2);
  return {
    totalSessions: totals.total_sessions || 0,
    totalTurns: totals.total_turns || 0,
    totalCost: totals.total_cost || 0,
    totalInputTokens: totals.total_input_tokens || 0,
    totalOutputTokens: totals.total_output_tokens || 0,
    totalDurationMs: totals.total_duration_ms || 0,
    byProvider: byProvider.reduce((acc, row) => {
      acc[row.provider] = {
        sessions: row.sessions,
        turns: row.turns || 0,
        cost: row.cost || 0,
        inputTokens: row.input_tokens || 0,
        outputTokens: row.output_tokens || 0
      };
      return acc;
    }, {}),
    byModel,
    recentActivity,
    topSessions,
    toolsUsage
  };
}
function getToolsUsage(db2) {
  if (!db2) db2 = getDb();
  const turns = db2.prepare(`
    SELECT tools_used FROM turns WHERE tools_used IS NOT NULL
  `).all();
  const toolCounts = {};
  for (const turn of turns) {
    try {
      const tools = JSON.parse(turn.tools_used);
      for (const tool of tools) {
        toolCounts[tool] = (toolCounts[tool] || 0) + 1;
      }
    } catch {
    }
  }
  return Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));
}

// packages/db/src/logs.js
function queryLogs(options = {}) {
  const db2 = getDb();
  const {
    limit = 50,
    offset = 0,
    since,
    until,
    source,
    level,
    type,
    provider,
    sessionId,
    terminalId,
    search: search2,
    slowOnly = false,
    slowThreshold = 1e3
  } = options;
  let query = "SELECT * FROM logs WHERE 1=1";
  const params = [];
  if (since) {
    query += " AND timestamp >= ?";
    params.push(since);
  }
  if (until) {
    query += " AND timestamp <= ?";
    params.push(until);
  }
  if (source) {
    query += " AND source = ?";
    params.push(source);
  }
  if (level) {
    query += " AND level = ?";
    params.push(level);
  }
  if (type) {
    query += " AND type = ?";
    params.push(type);
  }
  if (provider) {
    query += " AND provider = ?";
    params.push(provider);
  }
  if (sessionId) {
    query += " AND session_id = ?";
    params.push(sessionId);
  }
  if (terminalId !== void 0) {
    query += " AND terminal_id = ?";
    params.push(terminalId);
  }
  if (search2) {
    query += " AND data_json LIKE ?";
    params.push(`%${search2}%`);
  }
  if (slowOnly) {
    query += " AND duration_ms >= ?";
    params.push(slowThreshold);
  }
  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return db2.prepare(query).all(...params);
}
function getLogStats(options = {}) {
  const db2 = getDb();
  const { since, until, search: search2 } = options;
  let whereClause = "1=1";
  const params = [];
  if (since) {
    whereClause += " AND timestamp >= ?";
    params.push(since);
  }
  if (until) {
    whereClause += " AND timestamp <= ?";
    params.push(until);
  }
  if (search2) {
    whereClause += " AND data_json LIKE ?";
    params.push(`%${search2}%`);
  }
  const total = db2.prepare(`SELECT COUNT(*) as count FROM logs WHERE ${whereClause}`).get(...params);
  const bySource = db2.prepare(`
    SELECT source, COUNT(*) as count
    FROM logs
    WHERE ${whereClause}
    GROUP BY source
    ORDER BY count DESC
  `).all(...params);
  const byLevel = db2.prepare(`
    SELECT level, COUNT(*) as count
    FROM logs
    WHERE ${whereClause}
    GROUP BY level
    ORDER BY
      CASE level
        WHEN 'error' THEN 1
        WHEN 'warn' THEN 2
        WHEN 'info' THEN 3
        WHEN 'debug' THEN 4
      END
  `).all(...params);
  const byProvider = db2.prepare(`
    SELECT provider, COUNT(*) as count
    FROM logs
    WHERE ${whereClause} AND provider IS NOT NULL
    GROUP BY provider
    ORDER BY count DESC
  `).all(...params);
  const slowest = db2.prepare(`
    SELECT type, source,
      AVG(duration_ms) as avg_duration,
      MAX(duration_ms) as max_duration,
      MIN(duration_ms) as min_duration,
      COUNT(*) as count
    FROM logs
    WHERE ${whereClause} AND duration_ms IS NOT NULL
    GROUP BY type, source
    HAVING count >= 3
    ORDER BY avg_duration DESC
    LIMIT 10
  `).all(...params);
  return {
    total: total.count,
    bySource: bySource.reduce((acc, r) => ({ ...acc, [r.source]: r.count }), {}),
    byLevel: byLevel.reduce((acc, r) => ({ ...acc, [r.level]: r.count }), {}),
    byProvider: byProvider.reduce((acc, r) => ({ ...acc, [r.provider]: r.count }), {}),
    slowest: slowest.map((r) => ({
      operation: `${r.source}:${r.type}`,
      avgMs: Math.round(r.avg_duration),
      maxMs: r.max_duration,
      minMs: r.min_duration,
      count: r.count
    }))
  };
}
function getRecentLogs(ms = 6e4) {
  const since = Date.now() - ms;
  return queryLogs({ since, limit: 100 });
}
function getBeforeCrashLogs() {
  return getRecentLogs(3e4);
}

// packages/db/src/import.js
init_src();
var RUDI_HOME2 = PATHS.home;

// packages/db/src/index.js
var DB_PATH = PATHS.dbFile;
var db = null;
function getDb(options = {}) {
  if (!db) {
    const dbDir = import_path13.default.dirname(DB_PATH);
    if (!import_fs13.default.existsSync(dbDir)) {
      import_fs13.default.mkdirSync(dbDir, { recursive: true });
    }
    db = new import_better_sqlite3.default(DB_PATH, {
      readonly: options.readonly || false
    });
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("synchronous = NORMAL");
    db.pragma("cache_size = -64000");
  }
  return db;
}
function isDatabaseInitialized() {
  if (!import_fs13.default.existsSync(DB_PATH)) {
    return false;
  }
  try {
    const testDb = new import_better_sqlite3.default(DB_PATH, { readonly: true });
    const result = testDb.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='schema_version'
    `).get();
    testDb.close();
    return !!result;
  } catch {
    return false;
  }
}
function getDbPath() {
  return DB_PATH;
}
function getDbSize() {
  try {
    const stats = import_fs13.default.statSync(DB_PATH);
    return stats.size;
  } catch {
    return null;
  }
}

// src/commands/db.js
async function cmdDb(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "stats":
      dbStats(flags);
      break;
    case "search":
      dbSearch(args.slice(1), flags);
      break;
    case "init":
      dbInit(flags);
      break;
    case "path":
      console.log(getDbPath());
      break;
    case "reset":
      await dbReset(flags);
      break;
    case "vacuum":
      dbVacuum(flags);
      break;
    case "backup":
      dbBackup(args.slice(1), flags);
      break;
    case "prune":
      dbPrune(args.slice(1), flags);
      break;
    case "tables":
      dbTables(flags);
      break;
    default:
      console.log(`
rudi db - Database operations

COMMANDS
  stats              Show usage statistics
  search <query>     Search conversation history
  init               Initialize or migrate database
  path               Show database file path
  reset              Delete all data (requires --force)
  vacuum             Compact database and reclaim space
  backup [file]      Create database backup
  prune [days]       Delete sessions older than N days (default: 90)
  tables             Show table row counts

OPTIONS
  --force            Required for destructive operations
  --dry-run          Preview without making changes

EXAMPLES
  rudi db stats
  rudi db search "authentication bug"
  rudi db init
  rudi db reset --force
  rudi db vacuum
  rudi db backup ~/backups/rudi-backup.db
  rudi db prune 30 --dry-run
`);
  }
}
function dbStats(flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    console.log("Run: rudi db init");
    return;
  }
  try {
    const stats = getStats();
    if (flags.json) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }
    console.log("\nDatabase Statistics");
    console.log("\u2550".repeat(50));
    console.log("\nOVERVIEW");
    console.log("\u2500".repeat(30));
    console.log(`  Total Sessions:     ${stats.totalSessions}`);
    console.log(`  Total Turns:        ${stats.totalTurns}`);
    console.log(`  Total Cost:         $${(stats.totalCost || 0).toFixed(4)}`);
    console.log(`  Total Tokens:       ${formatNumber(stats.totalInputTokens + stats.totalOutputTokens)}`);
    if (stats.totalDurationMs > 0) {
      console.log(`  Total Time:         ${formatDuration(stats.totalDurationMs)}`);
    }
    if (Object.keys(stats.byProvider).length > 0) {
      console.log("\nBY PROVIDER");
      console.log("\u2500".repeat(30));
      for (const [provider, data] of Object.entries(stats.byProvider)) {
        console.log(`  ${provider}:`);
        console.log(`    Sessions: ${data.sessions}, Turns: ${data.turns}, Cost: $${(data.cost || 0).toFixed(4)}`);
      }
    }
    if (stats.byModel?.length > 0) {
      console.log("\nTOP MODELS");
      console.log("\u2500".repeat(30));
      for (const model of stats.byModel.slice(0, 5)) {
        console.log(`  ${model.model || "unknown"}: ${model.turns} turns, $${(model.cost || 0).toFixed(4)}`);
      }
    }
    const dbSize = getDbSize();
    if (dbSize) {
      console.log("\nDATABASE");
      console.log("\u2500".repeat(30));
      console.log(`  Size: ${formatBytes(dbSize)}`);
      console.log(`  Path: ${getDbPath()}`);
    }
  } catch (error) {
    console.error(`Failed to get stats: ${error.message}`);
    process.exit(1);
  }
}
function dbSearch(args, flags) {
  const query = args.join(" ");
  if (!query) {
    console.error("Usage: rudi db search <query>");
    process.exit(1);
  }
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  try {
    const results = search(query, {
      limit: flags.limit ? parseInt(flags.limit) : 20,
      provider: flags.provider
    });
    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
      return;
    }
    if (results.length === 0) {
      console.log("No results found.");
      return;
    }
    console.log(`
Found ${results.length} result(s):
`);
    for (const result of results) {
      console.log(`\u2500`.repeat(60));
      console.log(`Session: ${result.session_title || result.session_id}`);
      console.log(`Turn #${result.turn_number} | ${result.provider} | ${result.ts}`);
      if (result.user_highlighted) {
        console.log(`
User: ${truncate(stripHighlight(result.user_highlighted), 200)}`);
      }
      if (result.assistant_highlighted) {
        console.log(`
Assistant: ${truncate(stripHighlight(result.assistant_highlighted), 200)}`);
      }
      console.log();
    }
  } catch (error) {
    console.error(`Search failed: ${error.message}`);
    process.exit(1);
  }
}
function dbInit(flags) {
  console.log("Initializing database...");
  try {
    const result = initSchema();
    if (result.migrated) {
      console.log(`\u2713 Migrated from v${result.from} to v${result.version}`);
    } else {
      console.log(`\u2713 Database at v${result.version}`);
    }
    console.log(`  Path: ${getDbPath()}`);
  } catch (error) {
    console.error(`Failed to initialize: ${error.message}`);
    process.exit(1);
  }
}
function formatNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function truncate(str, len) {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}
function stripHighlight(str) {
  return str.replace(/>>>/g, "").replace(/<<</g, "");
}
async function dbReset(flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  if (!flags.force) {
    console.error("This will delete ALL data from the database.");
    console.error("Use --force to confirm.");
    process.exit(1);
  }
  const db2 = getDb();
  const dbPath = getDbPath();
  const tables = ["sessions", "turns", "tool_calls", "projects"];
  const counts = {};
  for (const table of tables) {
    try {
      const row = db2.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      counts[table] = row.count;
    } catch (e) {
      counts[table] = 0;
    }
  }
  console.log("Deleting all data...");
  console.log("\u2500".repeat(40));
  const deleteOrder = ["tool_calls", "turns", "sessions", "projects"];
  for (const table of deleteOrder) {
    try {
      db2.prepare(`DELETE FROM ${table}`).run();
      console.log(`  ${table}: ${counts[table]} rows deleted`);
    } catch (e) {
    }
  }
  try {
    db2.prepare("DELETE FROM turns_fts").run();
    console.log("  turns_fts: cleared");
  } catch (e) {
  }
  console.log("\u2500".repeat(40));
  console.log("Database reset complete.");
  console.log(`Path: ${dbPath}`);
}
function dbVacuum(flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  const dbPath = getDbPath();
  const sizeBefore = getDbSize();
  console.log("Compacting database...");
  console.log(`  Before: ${formatBytes(sizeBefore)}`);
  const db2 = getDb();
  db2.exec("VACUUM");
  const sizeAfter = getDbSize();
  const saved = sizeBefore - sizeAfter;
  console.log(`  After:  ${formatBytes(sizeAfter)}`);
  if (saved > 0) {
    console.log(`  Saved:  ${formatBytes(saved)} (${(saved / sizeBefore * 100).toFixed(1)}%)`);
  } else {
    console.log("  No space reclaimed.");
  }
}
function dbBackup(args, flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  const dbPath = getDbPath();
  let backupPath = args[0];
  if (!backupPath) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    backupPath = (0, import_path14.join)((0, import_path14.dirname)(dbPath), `rudi-backup-${timestamp}.db`);
  }
  if (backupPath.startsWith("~")) {
    backupPath = (0, import_path14.join)(process.env.HOME || "", backupPath.slice(1));
  }
  if ((0, import_fs14.existsSync)(backupPath) && !flags.force) {
    console.error(`Backup file already exists: ${backupPath}`);
    console.error("Use --force to overwrite.");
    process.exit(1);
  }
  console.log("Creating backup...");
  console.log(`  Source: ${dbPath}`);
  console.log(`  Dest:   ${backupPath}`);
  try {
    const db2 = getDb();
    db2.exec("VACUUM INTO ?", [backupPath]);
  } catch (e) {
    (0, import_fs14.copyFileSync)(dbPath, backupPath);
  }
  const size = getDbSize();
  console.log(`  Size:   ${formatBytes(size)}`);
  console.log("Backup complete.");
}
function dbPrune(args, flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  const days = parseInt(args[0]) || 90;
  const dryRun = flags["dry-run"] || flags.dryRun;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString();
  const db2 = getDb();
  const toDelete = db2.prepare(`
    SELECT COUNT(*) as count FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).get(cutoffDate, cutoffDate);
  const total = db2.prepare("SELECT COUNT(*) as count FROM sessions").get();
  console.log(`Sessions older than ${days} days: ${toDelete.count}`);
  console.log(`Total sessions: ${total.count}`);
  console.log(`Cutoff date: ${cutoffDate.slice(0, 10)}`);
  if (toDelete.count === 0) {
    console.log("\nNo sessions to prune.");
    return;
  }
  if (dryRun) {
    console.log("\n(Dry run - no changes made)");
    return;
  }
  if (!flags.force) {
    console.error(`
This will delete ${toDelete.count} sessions and their turns.`);
    console.error("Use --force to confirm, or --dry-run to preview.");
    process.exit(1);
  }
  console.log("\nDeleting old sessions...");
  const sessionIds = db2.prepare(`
    SELECT id FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).all(cutoffDate, cutoffDate).map((r) => r.id);
  let turnsDeleted = 0;
  let toolCallsDeleted = 0;
  for (const sessionId of sessionIds) {
    const turnIds = db2.prepare("SELECT id FROM turns WHERE session_id = ?").all(sessionId).map((r) => r.id);
    for (const turnId of turnIds) {
      const result = db2.prepare("DELETE FROM tool_calls WHERE turn_id = ?").run(turnId);
      toolCallsDeleted += result.changes;
    }
    const turnResult = db2.prepare("DELETE FROM turns WHERE session_id = ?").run(sessionId);
    turnsDeleted += turnResult.changes;
  }
  const sessionResult = db2.prepare(`
    DELETE FROM sessions
    WHERE last_active_at < ? OR (last_active_at IS NULL AND created_at < ?)
  `).run(cutoffDate, cutoffDate);
  console.log(`  Sessions deleted: ${sessionResult.changes}`);
  console.log(`  Turns deleted: ${turnsDeleted}`);
  console.log(`  Tool calls deleted: ${toolCallsDeleted}`);
  console.log('\nPrune complete. Run "rudi db vacuum" to reclaim disk space.');
}
function dbTables(flags) {
  if (!isDatabaseInitialized()) {
    console.log("Database not initialized.");
    return;
  }
  const db2 = getDb();
  const tables = db2.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  if (flags.json) {
    const result = {};
    for (const { name } of tables) {
      try {
        const row = db2.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
        result[name] = row.count;
      } catch (e) {
        result[name] = -1;
      }
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log("\nDatabase Tables");
  console.log("\u2550".repeat(40));
  let totalRows = 0;
  for (const { name } of tables) {
    try {
      const row = db2.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
      console.log(`  ${name.padEnd(25)} ${row.count.toLocaleString().padStart(10)}`);
      totalRows += row.count;
    } catch (e) {
      console.log(`  ${name.padEnd(25)} ${"error".padStart(10)}`);
    }
  }
  console.log("\u2500".repeat(40));
  console.log(`  ${"Total".padEnd(25)} ${totalRows.toLocaleString().padStart(10)}`);
  console.log(`
  Size: ${formatBytes(getDbSize())}`);
}

// src/commands/import.js
var import_fs15 = require("fs");
var import_path15 = require("path");
var import_os4 = require("os");
var import_crypto = require("crypto");
var PROVIDERS = {
  claude: {
    name: "Claude Code",
    baseDir: (0, import_path15.join)((0, import_os4.homedir)(), ".claude", "projects"),
    pattern: /\.jsonl$/
  },
  codex: {
    name: "Codex",
    baseDir: (0, import_path15.join)((0, import_os4.homedir)(), ".codex", "sessions"),
    pattern: /\.jsonl$/
  },
  gemini: {
    name: "Gemini",
    baseDir: (0, import_path15.join)((0, import_os4.homedir)(), ".gemini", "sessions"),
    pattern: /\.jsonl$/
  }
};
async function cmdImport(args, flags) {
  const subcommand = args[0];
  switch (subcommand) {
    case "sessions":
      await importSessions(args.slice(1), flags);
      break;
    case "status":
      showImportStatus(flags);
      break;
    default:
      console.log(`
rudi import - Import data from AI agent providers

COMMANDS
  sessions [provider]  Import sessions from provider (claude, codex, gemini, or all)
  status               Show import status for all providers

OPTIONS
  --dry-run            Show what would be imported without making changes
  --max-age=DAYS       Only import sessions newer than N days
  --verbose            Show detailed progress

EXAMPLES
  rudi import sessions              # Import from all providers
  rudi import sessions claude       # Import only Claude sessions
  rudi import sessions --dry-run    # Preview without importing
  rudi import status                # Check what's available to import
`);
  }
}
async function importSessions(args, flags) {
  const providerArg = args[0] || "all";
  const dryRun = flags["dry-run"] || flags.dryRun;
  const verbose = flags.verbose;
  const maxAgeDays = flags["max-age"] ? parseInt(flags["max-age"]) : null;
  if (!isDatabaseInitialized()) {
    console.log("Initializing database...");
    initSchema();
  }
  const db2 = getDb();
  const providers = providerArg === "all" ? Object.keys(PROVIDERS) : [providerArg];
  for (const p of providers) {
    if (!PROVIDERS[p]) {
      console.error(`Unknown provider: ${p}`);
      console.error(`Available: ${Object.keys(PROVIDERS).join(", ")}`);
      process.exit(1);
    }
  }
  console.log("\u2550".repeat(60));
  console.log("RUDI Session Import");
  console.log("\u2550".repeat(60));
  console.log(`Providers:  ${providers.join(", ")}`);
  console.log(`Database:   ${getDbPath()}`);
  console.log(`Max age:    ${maxAgeDays ? `${maxAgeDays} days` : "all"}`);
  console.log(`Dry run:    ${dryRun ? "yes" : "no"}`);
  console.log("\u2550".repeat(60));
  let totalImported = 0;
  let totalSkipped = 0;
  for (const providerKey of providers) {
    const provider = PROVIDERS[providerKey];
    console.log(`
\u25B6 ${provider.name}`);
    console.log(`  Source: ${provider.baseDir}`);
    if (!(0, import_fs15.existsSync)(provider.baseDir)) {
      console.log(`  \u26A0 Directory not found, skipping`);
      continue;
    }
    const existingIds = /* @__PURE__ */ new Set();
    try {
      const rows = db2.prepare(
        "SELECT provider_session_id FROM sessions WHERE provider = ? AND provider_session_id IS NOT NULL"
      ).all(providerKey);
      for (const row of rows) {
        existingIds.add(row.provider_session_id);
      }
    } catch (e) {
    }
    console.log(`  Existing: ${existingIds.size} sessions`);
    const files = findSessionFiles(provider.baseDir, provider.pattern);
    console.log(`  Found: ${files.length} session files`);
    const insertStmt = db2.prepare(`
      INSERT INTO sessions (
        id, provider, provider_session_id, project_id,
        origin, origin_imported_at, origin_native_file,
        title, snippet, status, model,
        inherit_project_prompt,
        cwd, dir_scope, native_storage_path,
        created_at, last_active_at,
        turn_count, total_cost, total_input_tokens, total_output_tokens, total_duration_ms,
        is_warmup, parent_session_id, agent_id, is_sidechain, session_type, version, user_type
      ) VALUES (
        ?, ?, ?, NULL,
        'provider-import', ?, ?,
        ?, '', 'active', ?,
        1,
        ?, 'project', ?,
        ?, ?,
        0, 0, 0, 0, 0,
        0, ?, ?, ?, ?, '2.0.76', 'external'
      )
    `);
    let imported = 0;
    let skipped = { existing: 0, empty: 0, old: 0, error: 0 };
    const now = Date.now();
    const maxAgeMs = maxAgeDays ? maxAgeDays * 24 * 60 * 60 * 1e3 : null;
    for (const filepath of files) {
      const sessionId = (0, import_path15.basename)(filepath, ".jsonl");
      if (existingIds.has(sessionId)) {
        skipped.existing++;
        continue;
      }
      let stat;
      try {
        stat = (0, import_fs15.statSync)(filepath);
      } catch (e) {
        skipped.error++;
        continue;
      }
      if (stat.size === 0) {
        skipped.empty++;
        continue;
      }
      if (maxAgeMs && now - stat.mtimeMs > maxAgeMs) {
        skipped.old++;
        continue;
      }
      const session = parseSessionFile(filepath, providerKey);
      if (!session) {
        skipped.error++;
        continue;
      }
      if (dryRun) {
        if (verbose || imported < 5) {
          console.log(`  [would import] ${sessionId}: ${session.title.slice(0, 40)}`);
        }
        imported++;
        continue;
      }
      try {
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        insertStmt.run(
          (0, import_crypto.randomUUID)(),
          providerKey,
          sessionId,
          nowIso,
          filepath,
          session.title,
          session.model || "unknown",
          session.cwd,
          filepath,
          session.createdAt,
          session.lastActiveAt,
          session.parentSessionId,
          session.agentId,
          session.isAgent ? 1 : 0,
          session.sessionType
        );
        imported++;
        if (verbose) {
          console.log(`  \u2713 ${sessionId}: ${session.title.slice(0, 40)}`);
        } else if (imported % 100 === 0) {
          console.log(`  Imported ${imported}...`);
        }
      } catch (e) {
        skipped.error++;
        if (verbose) {
          console.log(`  \u2717 ${sessionId}: ${e.message}`);
        }
      }
    }
    console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    console.log(`  Imported: ${imported}`);
    console.log(`  Skipped:  ${skipped.existing} existing, ${skipped.empty} empty, ${skipped.old} old, ${skipped.error} errors`);
    totalImported += imported;
    totalSkipped += skipped.existing + skipped.empty + skipped.old + skipped.error;
  }
  console.log("\n" + "\u2550".repeat(60));
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total skipped:  ${totalSkipped}`);
  console.log("\u2550".repeat(60));
  if (dryRun) {
    console.log("\n(Dry run - no changes made)");
  }
  if (!dryRun && totalImported > 0) {
    const count = db2.prepare("SELECT COUNT(*) as count FROM sessions").get();
    console.log(`
Total sessions in database: ${count.count}`);
  }
}
function showImportStatus(flags) {
  console.log("\u2550".repeat(60));
  console.log("Import Status");
  console.log("\u2550".repeat(60));
  if (!isDatabaseInitialized()) {
    console.log("\nDatabase: Not initialized");
    console.log("Run: rudi db init");
  } else {
    const db2 = getDb();
    const stats = db2.prepare(`
      SELECT provider, COUNT(*) as count
      FROM sessions
      WHERE status = 'active'
      GROUP BY provider
    `).all();
    console.log("\nDatabase sessions:");
    for (const row of stats) {
      console.log(`  ${row.provider}: ${row.count}`);
    }
  }
  console.log("\nProvider directories:");
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const exists = (0, import_fs15.existsSync)(provider.baseDir);
    let count = 0;
    if (exists) {
      const files = findSessionFiles(provider.baseDir, provider.pattern);
      count = files.length;
    }
    console.log(`  ${provider.name}:`);
    console.log(`    Path: ${provider.baseDir}`);
    console.log(`    Status: ${exists ? `${count} session files` : "not found"}`);
  }
  console.log("\n" + "\u2550".repeat(60));
  console.log("To import: rudi import sessions [provider]");
}
function findSessionFiles(dir, pattern, files = []) {
  if (!(0, import_fs15.existsSync)(dir)) return files;
  try {
    for (const entry of (0, import_fs15.readdirSync)(dir, { withFileTypes: true })) {
      const fullPath = (0, import_path15.join)(dir, entry.name);
      if (entry.isDirectory()) {
        findSessionFiles(fullPath, pattern, files);
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (e) {
  }
  return files;
}
function parseSessionFile(filepath, provider) {
  try {
    const stat = (0, import_fs15.statSync)(filepath);
    const content = (0, import_fs15.readFileSync)(filepath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;
    const sessionId = (0, import_path15.basename)(filepath, ".jsonl");
    const isAgent = sessionId.startsWith("agent-");
    let title = null;
    let cwd = null;
    let createdAt = null;
    let model = null;
    let parentSessionId = null;
    let agentId = isAgent ? sessionId.replace("agent-", "") : null;
    for (const line of lines.slice(0, 50)) {
      try {
        const data = JSON.parse(line);
        if (!cwd && data.cwd) cwd = data.cwd;
        if (!createdAt && data.timestamp) createdAt = data.timestamp;
        if (!model && data.model) model = data.model;
        if (!parentSessionId && (data.parentSessionId || data.parentUuid)) {
          parentSessionId = data.parentSessionId || data.parentUuid;
        }
        if (!agentId && data.agentId) agentId = data.agentId;
        if (!title) {
          const msg = data.message?.content || data.userMessage || (data.type === "user" ? data.message?.content : null);
          if (msg && msg.length > 2) {
            title = msg.split("\n")[0].slice(0, 50).trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    if (!title || title.length < 3) {
      title = isAgent ? "Agent Session" : "Imported Session";
    }
    if (!cwd) {
      const parentDir = (0, import_path15.basename)((0, import_path15.dirname)(filepath));
      if (parentDir.startsWith("-")) {
        cwd = parentDir.replace(/-/g, "/").replace(/^\//, "/");
      } else {
        cwd = (0, import_os4.homedir)();
      }
    }
    return {
      title,
      cwd,
      createdAt: createdAt || stat.birthtime.toISOString(),
      lastActiveAt: stat.mtime.toISOString(),
      model,
      isAgent,
      agentId,
      parentSessionId,
      sessionType: isAgent ? "agent" : "main"
    };
  } catch (e) {
    return null;
  }
}

// src/commands/doctor.js
init_src3();
var import_fs16 = __toESM(require("fs"), 1);
async function cmdDoctor(args, flags) {
  console.log("RUDI Health Check");
  console.log("\u2550".repeat(50));
  const issues = [];
  const fixes = [];
  console.log("\n\u{1F4C1} Directories");
  const dirs = [
    { path: PATHS.home, name: "Home" },
    { path: PATHS.stacks, name: "Stacks" },
    { path: PATHS.prompts, name: "Prompts" },
    { path: PATHS.runtimes, name: "Runtimes" },
    { path: PATHS.binaries, name: "Binaries" },
    { path: PATHS.agents, name: "Agents" },
    { path: PATHS.db, name: "Database" },
    { path: PATHS.cache, name: "Cache" }
  ];
  for (const dir of dirs) {
    const exists = import_fs16.default.existsSync(dir.path);
    const status = exists ? "\u2713" : "\u2717";
    console.log(`  ${status} ${dir.name}: ${dir.path}`);
    if (!exists) {
      issues.push(`Missing directory: ${dir.name}`);
      fixes.push(() => import_fs16.default.mkdirSync(dir.path, { recursive: true }));
    }
  }
  console.log("\n\u{1F4BE} Database");
  const dbInitialized = isDatabaseInitialized();
  console.log(`  ${dbInitialized ? "\u2713" : "\u2717"} Initialized: ${dbInitialized}`);
  if (!dbInitialized) {
    issues.push("Database not initialized");
    fixes.push(() => initSchema());
  }
  console.log("\n\u{1F4E6} Packages");
  try {
    const stacks = getInstalledPackages("stack");
    const prompts = getInstalledPackages("prompt");
    const runtimes = getInstalledPackages("runtime");
    console.log(`  \u2713 Stacks: ${stacks.length}`);
    console.log(`  \u2713 Prompts: ${prompts.length}`);
    console.log(`  \u2713 Runtimes: ${runtimes.length}`);
  } catch (error) {
    console.log(`  \u2717 Error reading packages: ${error.message}`);
    issues.push("Cannot read packages");
  }
  console.log("\n\u{1F510} Secrets");
  try {
    const secrets = listSecretNames();
    console.log(`  \u2713 Configured: ${secrets.length}`);
    if (secrets.length > 0) {
      for (const name of secrets.slice(0, 5)) {
        console.log(`    - ${name}`);
      }
      if (secrets.length > 5) {
        console.log(`    ... and ${secrets.length - 5} more`);
      }
    }
  } catch (error) {
    console.log(`  \u2717 Error reading secrets: ${error.message}`);
  }
  console.log("\n\u2699\uFE0F  Runtimes");
  try {
    const { runtimes, binaries } = flags.all ? await getAllDepsFromRegistry() : getAvailableDeps();
    for (const rt of runtimes) {
      const icon = rt.available ? "\u2713" : "\u25CB";
      const version = rt.version ? `v${rt.version}` : "";
      const source = rt.available ? `(${rt.source})` : flags.all ? "available" : "not found";
      console.log(`  ${icon} ${rt.name}: ${version} ${source}`);
    }
    console.log("\n\u{1F527} Binaries");
    for (const bin of binaries) {
      const icon = bin.available ? "\u2713" : "\u25CB";
      const version = bin.version ? `v${bin.version}` : "";
      const managed = bin.managed === false ? " (external)" : "";
      const source = bin.available ? `(${bin.source})` : flags.all ? `available${managed}` : "not found";
      console.log(`  ${icon} ${bin.name}: ${version} ${source}`);
    }
    if (flags.all) {
      const availableRuntimes = runtimes.filter((r) => !r.available).length;
      const availableBinaries = binaries.filter((b) => !b.available && b.managed !== false).length;
      if (availableRuntimes + availableBinaries > 0) {
        console.log(`
  Install with: rudi install runtime:<name> or rudi install binary:<name>`);
      }
    }
  } catch (error) {
    console.log(`  \u2717 Error checking dependencies: ${error.message}`);
  }
  console.log("\n\u{1F4CD} Environment");
  const nodeVersion = process.version;
  const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
  console.log(`  ${nodeOk ? "\u2713" : "\u2717"} Node.js: ${nodeVersion} ${nodeOk ? "" : "(requires >=18)"}`);
  console.log(`  \u2713 Platform: ${process.platform}-${process.arch}`);
  console.log(`  \u2713 RUDI Home: ${PATHS.home}`);
  if (!nodeOk) {
    issues.push("Node.js version too old (requires >=18)");
  }
  console.log("\n" + "\u2500".repeat(50));
  if (issues.length === 0) {
    console.log("\u2713 All checks passed!");
  } else {
    console.log(`Found ${issues.length} issue(s):
`);
    for (const issue of issues) {
      console.log(`  \u2022 ${issue}`);
    }
    if (flags.fix && fixes.length > 0) {
      console.log("\nAttempting fixes...");
      for (const fix of fixes) {
        try {
          fix();
        } catch (error) {
          console.error(`  Fix failed: ${error.message}`);
        }
      }
      console.log("Done. Run doctor again to verify.");
    } else if (fixes.length > 0) {
      console.log("\nRun with --fix to attempt automatic fixes.");
    }
  }
}

// src/commands/home.js
var import_fs17 = __toESM(require("fs"), 1);
var import_path16 = __toESM(require("path"), 1);
init_src3();
function formatBytes2(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function getDirSize(dir) {
  if (!import_fs17.default.existsSync(dir)) return 0;
  let size = 0;
  try {
    const entries = import_fs17.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = import_path16.default.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += import_fs17.default.statSync(fullPath).size;
      }
    }
  } catch {
  }
  return size;
}
function countItems(dir) {
  if (!import_fs17.default.existsSync(dir)) return 0;
  try {
    return import_fs17.default.readdirSync(dir).filter((f) => !f.startsWith(".")).length;
  } catch {
    return 0;
  }
}
async function cmdHome(args, flags) {
  console.log("\u2550".repeat(60));
  console.log("RUDI Home: " + PATHS.home);
  console.log("\u2550".repeat(60));
  if (flags.json) {
    const data = {
      home: PATHS.home,
      directories: {},
      packages: {},
      database: {}
    };
    const dirs2 = [
      { key: "stacks", path: PATHS.stacks },
      { key: "prompts", path: PATHS.prompts },
      { key: "runtimes", path: PATHS.runtimes },
      { key: "binaries", path: PATHS.binaries },
      { key: "agents", path: PATHS.agents },
      { key: "cache", path: PATHS.cache }
    ];
    for (const dir of dirs2) {
      data.directories[dir.key] = {
        path: dir.path,
        exists: import_fs17.default.existsSync(dir.path),
        items: countItems(dir.path),
        size: getDirSize(dir.path)
      };
    }
    for (const kind of ["stack", "prompt", "runtime", "binary", "agent"]) {
      data.packages[kind] = getInstalledPackages(kind).length;
    }
    data.database = {
      initialized: isDatabaseInitialized(),
      size: getDbSize() || 0
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  console.log("\n\u{1F4C1} Directory Structure\n");
  const dirs = [
    { name: "stacks", path: PATHS.stacks, icon: "\u{1F4E6}", desc: "MCP server stacks" },
    { name: "prompts", path: PATHS.prompts, icon: "\u{1F4DD}", desc: "Prompt templates" },
    { name: "runtimes", path: PATHS.runtimes, icon: "\u2699\uFE0F", desc: "Node, Python, Deno, Bun" },
    { name: "binaries", path: PATHS.binaries, icon: "\u{1F527}", desc: "ffmpeg, ripgrep, etc." },
    { name: "agents", path: PATHS.agents, icon: "\u{1F916}", desc: "Claude, Codex, Gemini CLIs" },
    { name: "cache", path: PATHS.cache, icon: "\u{1F4BE}", desc: "Registry cache" }
  ];
  for (const dir of dirs) {
    const exists = import_fs17.default.existsSync(dir.path);
    const count = countItems(dir.path);
    const size = getDirSize(dir.path);
    console.log(`${dir.icon} ${dir.name}/`);
    console.log(`   ${dir.desc}`);
    if (exists) {
      console.log(`   ${count} items, ${formatBytes2(size)}`);
    } else {
      console.log(`   (not created)`);
    }
    console.log();
  }
  console.log("\u{1F4BE} Database");
  const dbPath = import_path16.default.join(PATHS.home, "rudi.db");
  if (import_fs17.default.existsSync(dbPath)) {
    const dbSize = getDbSize() || import_fs17.default.statSync(dbPath).size;
    console.log(`   ${formatBytes2(dbSize)}`);
    console.log(`   ${dbPath}`);
  } else {
    console.log(`   Not initialized`);
  }
  console.log();
  console.log("\u2550".repeat(60));
  console.log("Installed Packages");
  console.log("\u2550".repeat(60));
  const kinds = ["stack", "prompt", "runtime", "binary", "agent"];
  let total = 0;
  for (const kind of kinds) {
    const packages = getInstalledPackages(kind);
    const label = kind === "binary" ? "Binaries" : `${kind.charAt(0).toUpperCase() + kind.slice(1)}s`;
    console.log(`  ${label.padEnd(12)} ${packages.length}`);
    if (packages.length > 0 && flags.verbose) {
      for (const pkg of packages.slice(0, 3)) {
        console.log(`    - ${pkg.name || pkg.id}`);
      }
      if (packages.length > 3) {
        console.log(`    ... and ${packages.length - 3} more`);
      }
    }
    total += packages.length;
  }
  console.log("\u2500".repeat(30));
  console.log(`  ${"Total".padEnd(12)} ${total}`);
  console.log("\n\u{1F4CB} Quick Commands");
  console.log("\u2500".repeat(30));
  console.log("  rudi list stacks      Show installed stacks");
  console.log("  rudi list runtimes    Show installed runtimes");
  console.log("  rudi list binaries    Show installed binaries");
  console.log("  rudi doctor --all     Check system dependencies");
  console.log("  rudi db stats         Database statistics");
}

// src/commands/init.js
var import_fs20 = __toESM(require("fs"), 1);
var import_path19 = __toESM(require("path"), 1);
var import_promises = require("stream/promises");
var import_fs21 = require("fs");
var import_child_process6 = require("child_process");

// packages/env/src/index.js
var import_path17 = __toESM(require("path"), 1);
var import_os5 = __toESM(require("os"), 1);
var import_fs18 = __toESM(require("fs"), 1);
var RUDI_HOME3 = import_path17.default.join(import_os5.default.homedir(), ".rudi");
var PATHS2 = {
  // Root
  home: RUDI_HOME3,
  // Installed packages - shared with Studio for unified discovery
  packages: import_path17.default.join(RUDI_HOME3, "packages"),
  stacks: import_path17.default.join(RUDI_HOME3, "stacks"),
  // Shared with Studio
  prompts: import_path17.default.join(RUDI_HOME3, "prompts"),
  // Shared with Studio
  // Runtimes (interpreters: node, python, deno, bun)
  runtimes: import_path17.default.join(RUDI_HOME3, "runtimes"),
  // Binaries (utility CLIs: ffmpeg, imagemagick, ripgrep, etc.)
  binaries: import_path17.default.join(RUDI_HOME3, "binaries"),
  // Agents (AI CLI tools: claude, codex, gemini, copilot, ollama)
  agents: import_path17.default.join(RUDI_HOME3, "agents"),
  // Runtime binaries (content-addressed)
  store: import_path17.default.join(RUDI_HOME3, "store"),
  // Shims (symlinks to store/)
  bins: import_path17.default.join(RUDI_HOME3, "bins"),
  // Lockfiles
  locks: import_path17.default.join(RUDI_HOME3, "locks"),
  // Secrets (OS Keychain preferred, encrypted file fallback)
  vault: import_path17.default.join(RUDI_HOME3, "vault"),
  // Database (shared with Studio)
  db: RUDI_HOME3,
  dbFile: import_path17.default.join(RUDI_HOME3, "rudi.db"),
  // Cache
  cache: import_path17.default.join(RUDI_HOME3, "cache"),
  registryCache: import_path17.default.join(RUDI_HOME3, "cache", "registry.json"),
  // Config
  config: import_path17.default.join(RUDI_HOME3, "config.json"),
  // Logs
  logs: import_path17.default.join(RUDI_HOME3, "logs")
};
function getPlatformArch2() {
  const platform = import_os5.default.platform();
  const arch = import_os5.default.arch();
  const normalizedArch = arch === "x64" ? "x64" : arch === "arm64" ? "arm64" : arch;
  return `${platform}-${normalizedArch}`;
}
function ensureDirectories2() {
  const dirs = [
    PATHS2.stacks,
    // MCP servers (google-ai, notion-workspace, etc.)
    PATHS2.prompts,
    // Reusable prompts
    PATHS2.runtimes,
    // Language runtimes (node, python, bun, deno)
    PATHS2.binaries,
    // Utility binaries (ffmpeg, git, jq, etc.)
    PATHS2.agents,
    // AI CLI agents (claude, codex, gemini, copilot)
    PATHS2.bins,
    // Shims directory (Studio only)
    PATHS2.locks,
    // Lock files
    PATHS2.db,
    // Database directory
    PATHS2.cache
    // Registry cache
  ];
  for (const dir of dirs) {
    if (!import_fs18.default.existsSync(dir)) {
      import_fs18.default.mkdirSync(dir, { recursive: true });
    }
  }
}
var PACKAGE_KINDS3 = ["stack", "prompt", "runtime", "binary", "agent"];
function parsePackageId2(id) {
  const match = id.match(/^(stack|prompt|runtime|binary|agent|npm):(.+)$/);
  if (!match) {
    throw new Error(`Invalid package ID: ${id} (expected format: kind:name, where kind is one of: ${PACKAGE_KINDS3.join(", ")}, npm)`);
  }
  return [match[1], match[2]];
}
function getPackagePath2(id) {
  const [kind, name] = parsePackageId2(id);
  switch (kind) {
    case "stack":
      return import_path17.default.join(PATHS2.stacks, name);
    case "prompt":
      return import_path17.default.join(PATHS2.prompts, `${name}.md`);
    case "runtime":
      return import_path17.default.join(PATHS2.runtimes, name);
    case "binary":
      return import_path17.default.join(PATHS2.binaries, name);
    case "agent":
      return import_path17.default.join(PATHS2.agents, name);
    case "npm":
      const sanitized = name.replace(/\//g, "__").replace(/^@/, "");
      return import_path17.default.join(PATHS2.binaries, "npm", sanitized);
    default:
      throw new Error(`Unknown package kind: ${kind}`);
  }
}

// src/commands/init.js
init_src4();
var RELEASES_BASE = "https://github.com/learn-rudi/registry/releases/download/v1.0.0";
var BUNDLED_RUNTIMES = ["node", "python"];
var ESSENTIAL_BINARIES = ["sqlite", "ripgrep"];
async function cmdInit(args, flags) {
  const force = flags.force || false;
  const skipDownloads = flags["skip-downloads"] || false;
  const quiet = flags.quiet || false;
  if (!quiet) {
    console.log("\u2550".repeat(60));
    console.log("RUDI Initialization");
    console.log("\u2550".repeat(60));
    console.log(`Home: ${PATHS2.home}`);
    console.log();
  }
  const actions = { created: [], skipped: [], failed: [] };
  if (!quiet) console.log("1. Checking directory structure...");
  ensureDirectories2();
  const dirs = [
    PATHS2.stacks,
    PATHS2.prompts,
    PATHS2.runtimes,
    PATHS2.binaries,
    PATHS2.agents,
    PATHS2.cache,
    import_path19.default.join(PATHS2.home, "shims")
  ];
  for (const dir of dirs) {
    const dirName = import_path19.default.basename(dir);
    if (!import_fs20.default.existsSync(dir)) {
      import_fs20.default.mkdirSync(dir, { recursive: true });
      actions.created.push(`dir:${dirName}`);
      if (!quiet) console.log(`   + ${dirName}/ (created)`);
    } else {
      actions.skipped.push(`dir:${dirName}`);
      if (!quiet) console.log(`   \u2713 ${dirName}/ (exists)`);
    }
  }
  if (!skipDownloads) {
    if (!quiet) console.log("\n2. Checking runtimes...");
    const index = await fetchIndex2();
    const platform = getPlatformArch2();
    for (const runtimeName of BUNDLED_RUNTIMES) {
      const runtime = index.packages?.runtimes?.official?.find(
        (r) => r.id === `runtime:${runtimeName}` || r.id === runtimeName
      );
      if (!runtime) {
        actions.failed.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u26A0 ${runtimeName}: not found in registry`);
        continue;
      }
      const destPath = import_path19.default.join(PATHS2.runtimes, runtimeName);
      if (import_fs20.default.existsSync(destPath) && !force) {
        actions.skipped.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u2713 ${runtimeName}: already installed`);
        continue;
      }
      try {
        await downloadRuntime3(runtime, runtimeName, destPath, platform);
        actions.created.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   + ${runtimeName}: installed`);
      } catch (error) {
        actions.failed.push(`runtime:${runtimeName}`);
        if (!quiet) console.log(`   \u2717 ${runtimeName}: ${error.message}`);
      }
    }
    if (!quiet) console.log("\n3. Checking essential binaries...");
    for (const binaryName of ESSENTIAL_BINARIES) {
      const binary = index.packages?.binaries?.official?.find(
        (b) => b.id === `binary:${binaryName}` || b.id === binaryName || b.name?.toLowerCase() === binaryName
      );
      if (!binary) {
        actions.failed.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u26A0 ${binaryName}: not found in registry`);
        continue;
      }
      const destPath = import_path19.default.join(PATHS2.binaries, binaryName);
      if (import_fs20.default.existsSync(destPath) && !force) {
        actions.skipped.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u2713 ${binaryName}: already installed`);
        continue;
      }
      try {
        await downloadBinary(binary, binaryName, destPath, platform);
        actions.created.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   + ${binaryName}: installed`);
      } catch (error) {
        actions.failed.push(`binary:${binaryName}`);
        if (!quiet) console.log(`   \u2717 ${binaryName}: ${error.message}`);
      }
    }
  } else {
    if (!quiet) console.log("\n2-3. Skipping downloads (--skip-downloads)");
  }
  if (!quiet) console.log("\n4. Updating shims...");
  const shimsDir = import_path19.default.join(PATHS2.home, "shims");
  const shimCount = await createShims(shimsDir, quiet);
  if (shimCount > 0) {
    actions.created.push(`shims:${shimCount}`);
  }
  if (!quiet) console.log("\n5. Checking database...");
  const dbPath = import_path19.default.join(PATHS2.home, "rudi.db");
  const dbExists = import_fs20.default.existsSync(dbPath);
  try {
    const result = initSchema();
    if (dbExists) {
      actions.skipped.push("database");
      if (!quiet) console.log(`   \u2713 Database exists (v${result.version})`);
    } else {
      actions.created.push("database");
      if (!quiet) console.log(`   + Database created (v${result.version})`);
    }
  } catch (error) {
    actions.failed.push("database");
    if (!quiet) console.log(`   \u2717 Database error: ${error.message}`);
  }
  if (!quiet) console.log("\n6. Checking settings...");
  const settingsPath = import_path19.default.join(PATHS2.home, "settings.json");
  if (!import_fs20.default.existsSync(settingsPath)) {
    const settings = {
      version: "1.0.0",
      initialized: (/* @__PURE__ */ new Date()).toISOString(),
      theme: "system"
    };
    import_fs20.default.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    actions.created.push("settings");
    if (!quiet) console.log("   + settings.json created");
  } else {
    actions.skipped.push("settings");
    if (!quiet) console.log("   \u2713 settings.json exists");
  }
  if (!quiet) {
    console.log("\n" + "\u2550".repeat(60));
    if (actions.created.length > 0) {
      console.log(`\u2713 RUDI initialized! (${actions.created.length} items created, ${actions.skipped.length} already existed)`);
    } else {
      console.log("\u2713 RUDI is up to date! (all items already existed)");
    }
    console.log("\u2550".repeat(60));
    if (actions.created.includes("settings")) {
      const shimsPath = import_path19.default.join(PATHS2.home, "shims");
      console.log("\nAdd to your shell profile (~/.zshrc or ~/.bashrc):");
      console.log(`  export PATH="${shimsPath}:$PATH"`);
      console.log("\nThen run:");
      console.log("  rudi home     # View your setup");
      console.log("  rudi doctor   # Check health");
    }
  }
  return actions;
}
async function downloadRuntime3(runtime, name, destPath, platform) {
  let url;
  if (runtime.upstream?.[platform]) {
    url = runtime.upstream[platform];
  } else if (runtime.download?.[platform]) {
    url = `${RELEASES_BASE}/${runtime.download[platform]}`;
  } else {
    throw new Error(`No download for ${platform}`);
  }
  await downloadAndExtract(url, destPath, name);
}
async function downloadBinary(binary, name, destPath, platform) {
  let url;
  if (binary.upstream?.[platform]) {
    url = binary.upstream[platform];
  } else if (binary.download?.[platform]) {
    url = `${RELEASES_BASE}/${binary.download[platform]}`;
  } else {
    throw new Error(`No download for ${platform}`);
  }
  await downloadAndExtract(url, destPath, name, binary.extract);
}
async function downloadAndExtract(url, destPath, name, extractConfig) {
  const tempFile = import_path19.default.join(PATHS2.cache, `${name}-download.tar.gz`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (!import_fs20.default.existsSync(destPath)) {
    import_fs20.default.mkdirSync(destPath, { recursive: true });
  }
  const fileStream = (0, import_fs21.createWriteStream)(tempFile);
  await (0, import_promises.pipeline)(response.body, fileStream);
  try {
    (0, import_child_process6.execSync)(`tar -xzf "${tempFile}" -C "${destPath}" --strip-components=1`, {
      stdio: "pipe"
    });
  } catch {
    (0, import_child_process6.execSync)(`tar -xzf "${tempFile}" -C "${destPath}"`, { stdio: "pipe" });
  }
  import_fs20.default.unlinkSync(tempFile);
}
async function createShims(shimsDir, quiet = false) {
  const shims = [];
  const runtimeShims = {
    node: "runtimes/node/bin/node",
    npm: "runtimes/node/bin/npm",
    npx: "runtimes/node/bin/npx",
    python: "runtimes/python/bin/python3",
    python3: "runtimes/python/bin/python3",
    pip: "runtimes/python/bin/pip3",
    pip3: "runtimes/python/bin/pip3"
  };
  const binaryShims = {
    sqlite3: "binaries/sqlite/sqlite3",
    rg: "binaries/ripgrep/rg",
    ripgrep: "binaries/ripgrep/rg"
  };
  for (const [shimName, targetPath] of Object.entries(runtimeShims)) {
    const fullTarget = import_path19.default.join(PATHS2.home, targetPath);
    const shimPath = import_path19.default.join(shimsDir, shimName);
    if (import_fs20.default.existsSync(fullTarget)) {
      createShim(shimPath, fullTarget);
      shims.push(shimName);
    }
  }
  for (const [shimName, targetPath] of Object.entries(binaryShims)) {
    const fullTarget = import_path19.default.join(PATHS2.home, targetPath);
    const shimPath = import_path19.default.join(shimsDir, shimName);
    if (import_fs20.default.existsSync(fullTarget)) {
      createShim(shimPath, fullTarget);
      shims.push(shimName);
    }
  }
  if (!quiet) {
    if (shims.length > 0) {
      console.log(`   \u2713 ${shims.length} shims: ${shims.join(", ")}`);
    } else {
      console.log("   \u26A0 No shims (runtimes/binaries not installed)");
    }
  }
  return shims.length;
}
function createShim(shimPath, targetPath) {
  if (import_fs20.default.existsSync(shimPath)) {
    import_fs20.default.unlinkSync(shimPath);
  }
  import_fs20.default.symlinkSync(targetPath, shimPath);
}

// src/commands/update.js
var import_fs22 = __toESM(require("fs"), 1);
var import_path20 = __toESM(require("path"), 1);
var import_child_process7 = require("child_process");
init_src4();
async function cmdUpdate(args, flags) {
  const pkgId = args[0];
  if (!pkgId) {
    return updateAll2(flags);
  }
  const fullId = pkgId.includes(":") ? pkgId : `runtime:${pkgId}`;
  try {
    const result = await updatePackage2(fullId, flags);
    if (result.success) {
      console.log(`Updated ${fullId}${result.version ? ` to v${result.version}` : ""}`);
    } else {
      console.error(`Failed to update ${fullId}: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Update failed: ${error.message}`);
    process.exit(1);
  }
}
async function updatePackage2(pkgId, flags) {
  const [kind, name] = parsePackageId2(pkgId);
  const installPath = getPackagePath2(pkgId);
  if (!import_fs22.default.existsSync(installPath)) {
    return { success: false, error: "Package not installed" };
  }
  const pkg = await getPackage2(pkgId);
  if (!pkg) {
    return { success: false, error: "Package not found in registry" };
  }
  console.log(`Updating ${pkgId}...`);
  if (pkg.npmPackage) {
    try {
      (0, import_child_process7.execSync)(`npm install ${pkg.npmPackage}@latest`, {
        cwd: installPath,
        stdio: flags.verbose ? "inherit" : "pipe"
      });
      const version = getInstalledVersion(installPath, pkg.npmPackage);
      updateRuntimeMetadata(installPath, { version, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { success: true, version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (pkg.pipPackage) {
    try {
      const venvPip = import_path20.default.join(installPath, "venv", "bin", "pip");
      (0, import_child_process7.execSync)(`"${venvPip}" install --upgrade ${pkg.pipPackage}`, {
        stdio: flags.verbose ? "inherit" : "pipe"
      });
      const versionOutput = (0, import_child_process7.execSync)(`"${venvPip}" show ${pkg.pipPackage} | grep Version`, {
        encoding: "utf-8"
      });
      const version = versionOutput.split(":")[1]?.trim();
      updateRuntimeMetadata(installPath, { version, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      return { success: true, version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  if (kind === "runtime" && !pkg.npmPackage && !pkg.pipPackage) {
    try {
      const { downloadRuntime: downloadRuntime4 } = await Promise.resolve().then(() => (init_src4(), src_exports2));
      import_fs22.default.rmSync(installPath, { recursive: true, force: true });
      await downloadRuntime4(name, pkg.version || "latest", installPath, {
        onProgress: (p) => {
          if (flags.verbose) console.log(`  ${p.phase}...`);
        }
      });
      return { success: true, version: pkg.version };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: "Unknown package type" };
}
async function updateAll2(flags) {
  console.log("Checking for updates...");
  const kinds = ["runtime", "stack", "prompt"];
  let updated = 0;
  let failed = 0;
  for (const kind of kinds) {
    const dir = kind === "runtime" ? PATHS2.runtimes : kind === "stack" ? PATHS2.stacks : PATHS2.prompts;
    if (!import_fs22.default.existsSync(dir)) continue;
    const entries = import_fs22.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const pkgId = `${kind}:${entry.name}`;
      const result = await updatePackage2(pkgId, flags);
      if (result.success) {
        console.log(`  \u2713 ${pkgId}${result.version ? ` \u2192 v${result.version}` : ""}`);
        updated++;
      } else if (result.error !== "Package not found in registry") {
        console.log(`  \u2717 ${pkgId}: ${result.error}`);
        failed++;
      }
    }
  }
  console.log(`
Updated ${updated} package(s)${failed > 0 ? `, ${failed} failed` : ""}`);
}
function getInstalledVersion(installPath, npmPackage) {
  try {
    const pkgJsonPath = import_path20.default.join(installPath, "node_modules", npmPackage.replace("@", "").split("/")[0], "package.json");
    if (import_fs22.default.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(import_fs22.default.readFileSync(pkgJsonPath, "utf-8"));
      return pkgJson.version;
    }
    const rootPkgPath = import_path20.default.join(installPath, "package.json");
    if (import_fs22.default.existsSync(rootPkgPath)) {
      const rootPkg = JSON.parse(import_fs22.default.readFileSync(rootPkgPath, "utf-8"));
      const dep = rootPkg.dependencies?.[npmPackage];
      if (dep) return dep.replace(/[\^~]/, "");
    }
  } catch {
  }
  return null;
}
function updateRuntimeMetadata(installPath, updates) {
  const metaPath = import_path20.default.join(installPath, "runtime.json");
  try {
    let meta = {};
    if (import_fs22.default.existsSync(metaPath)) {
      meta = JSON.parse(import_fs22.default.readFileSync(metaPath, "utf-8"));
    }
    meta = { ...meta, ...updates };
    import_fs22.default.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {
  }
}

// src/commands/logs.js
var import_fs23 = __toESM(require("fs"), 1);
function parseTimeAgo(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const [, num, unit] = match;
  const value = parseInt(num);
  const multipliers = {
    s: 1e3,
    m: 60 * 1e3,
    h: 60 * 60 * 1e3,
    d: 24 * 60 * 60 * 1e3
  };
  return value * multipliers[unit];
}
function parseTimestamp(str) {
  if (!str) return null;
  const relative = parseTimeAgo(str);
  if (relative) {
    return Date.now() - relative;
  }
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }
  return null;
}
function formatTimestamp(ts) {
  const date = new Date(ts);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
function formatLogEvent(event, options = {}) {
  const { verbose = false, json = false } = options;
  if (json) {
    const parsed2 = JSON.parse(event.data_json);
    return JSON.stringify({
      timestamp: event.timestamp,
      source: event.source,
      level: event.level,
      type: event.type,
      ...parsed2
    });
  }
  const time = formatTimestamp(event.timestamp);
  const source = event.source.padEnd(10);
  const level = event.level.toUpperCase().padEnd(5);
  const parsed = JSON.parse(event.data_json);
  const message = parsed.message || parsed.channel || event.type;
  let output = `\x1B[90m${time}\x1B[0m \x1B[36m[${source}]\x1B[0m ${message}`;
  if (event.duration_ms) {
    output += ` \x1B[33m(${event.duration_ms}ms)\x1B[0m`;
  }
  if (verbose) {
    output += `
  Type: ${event.type}`;
    if (event.provider) output += ` | Provider: ${event.provider}`;
    if (event.cid) output += ` | CID: ${event.cid}`;
  }
  return output;
}
function exportLogs(logs, filepath, format) {
  let content;
  switch (format) {
    case "ndjson":
      content = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        return JSON.stringify({
          timestamp: e.timestamp,
          source: e.source,
          level: e.level,
          type: e.type,
          ...parsed
        });
      }).join("\n");
      break;
    case "csv":
      const headers = "timestamp,source,level,type,message,duration_ms\n";
      const rows = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        const message = (parsed.message || parsed.channel || e.type).replace(/"/g, '""');
        return `${e.timestamp},${e.source},${e.level},${e.type},"${message}",${e.duration_ms || ""}`;
      }).join("\n");
      content = headers + rows;
      break;
    case "json":
    default:
      const formatted = logs.map((e) => {
        const parsed = JSON.parse(e.data_json);
        return {
          timestamp: e.timestamp,
          source: e.source,
          level: e.level,
          type: e.type,
          ...parsed
        };
      });
      content = JSON.stringify(formatted, null, 2);
  }
  import_fs23.default.writeFileSync(filepath, content, "utf-8");
  return filepath;
}
function printStats(stats) {
  console.log("\n\x1B[1mLog Statistics\x1B[0m\n");
  console.log(`Total events: ${stats.total}`);
  if (Object.keys(stats.bySource).length > 0) {
    console.log("\n\x1B[1mBy Source:\x1B[0m");
    Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).forEach(([source, count]) => {
      console.log(`  ${source.padEnd(15)} ${count} events`);
    });
  }
  if (Object.keys(stats.byLevel).length > 0) {
    console.log("\n\x1B[1mBy Level:\x1B[0m");
    const levelColors = {
      error: "\x1B[31m",
      warn: "\x1B[33m",
      info: "\x1B[36m",
      debug: "\x1B[90m"
    };
    Object.entries(stats.byLevel).forEach(([level, count]) => {
      const color = levelColors[level] || "";
      console.log(`  ${color}${level.padEnd(8)}\x1B[0m ${count} events`);
    });
  }
  if (Object.keys(stats.byProvider).length > 0) {
    console.log("\n\x1B[1mBy Provider:\x1B[0m");
    Object.entries(stats.byProvider).sort((a, b) => b[1] - a[1]).forEach(([provider, count]) => {
      console.log(`  ${provider.padEnd(12)} ${count} events`);
    });
  }
  if (stats.slowest.length > 0) {
    console.log("\n\x1B[1mSlowest Operations:\x1B[0m");
    stats.slowest.forEach((op, i) => {
      console.log(`  ${i + 1}. ${op.operation.padEnd(30)} ${op.avgMs}ms avg (${op.count} calls, max: ${op.maxMs}ms)`);
    });
  }
  console.log("");
}
async function handleLogsCommand(args, flags) {
  const {
    limit,
    last,
    since,
    until,
    filter,
    source,
    level,
    type,
    provider,
    "session-id": sessionId,
    "terminal-id": terminalId,
    "slow-only": slowOnly,
    "slow-threshold": slowThreshold,
    "before-crash": beforeCrash,
    stats,
    export: exportPath,
    format = "json",
    verbose,
    json
  } = flags;
  if (stats) {
    const options2 = {};
    if (last) options2.since = Date.now() - parseTimeAgo(last);
    if (since) options2.since = parseTimestamp(since);
    if (until) options2.until = parseTimestamp(until);
    if (filter) options2.search = filter;
    const statsData = getLogStats(options2);
    printStats(statsData);
    return;
  }
  const options = {
    limit: parseInt(limit) || 50,
    source,
    level,
    type,
    provider,
    sessionId,
    terminalId: terminalId ? parseInt(terminalId) : void 0,
    slowOnly: !!slowOnly,
    slowThreshold: slowThreshold ? parseInt(slowThreshold) : 1e3
  };
  if (beforeCrash) {
    const crashLogs = getBeforeCrashLogs();
    console.log(`
\x1B[33mLast ${crashLogs.length} events before crash:\x1B[0m
`);
    crashLogs.forEach((e) => console.log(formatLogEvent(e, { verbose, json })));
    return;
  }
  if (last) {
    options.since = Date.now() - parseTimeAgo(last);
  }
  if (since) {
    options.since = parseTimestamp(since);
  }
  if (until) {
    options.until = parseTimestamp(until);
  }
  if (filter) {
    if (Array.isArray(filter)) {
      options.search = filter.join(" ");
    } else {
      options.search = filter;
    }
  }
  const logs = queryLogs(options);
  if (exportPath) {
    const filepath = exportLogs(logs, exportPath, format);
    console.log(`
\u2705 Exported ${logs.length} logs to: ${filepath}
`);
    return;
  }
  if (logs.length === 0) {
    console.log("\nNo logs found matching filters.\n");
    return;
  }
  console.log(`
\x1B[90mShowing ${logs.length} logs:\x1B[0m
`);
  logs.forEach((e) => console.log(formatLogEvent(e, { verbose, json })));
  console.log("");
}

// src/commands/which.js
var fs26 = __toESM(require("fs/promises"), 1);
var path26 = __toESM(require("path"), 1);
var import_child_process8 = require("child_process");
init_src3();
async function cmdWhich(args, flags) {
  const stackId = args[0];
  if (!stackId) {
    console.error("Usage: rudi which <stack-id>");
    console.error("Example: rudi which google-workspace");
    process.exit(1);
  }
  try {
    const packages = await listInstalled("stack");
    const stack = packages.find((p) => {
      const pId = p.id || "";
      const pName = p.name || "";
      if (pId === stackId || pId === `stack:${stackId}`) return true;
      if (pName === stackId || pName === `stack:${stackId}`) return true;
      if (pId.replace("stack:", "") === stackId) return true;
      return false;
    });
    if (!stack) {
      console.error(`Stack not found: ${stackId}`);
      console.error(`
Installed stacks:`);
      packages.forEach((p) => console.error(`  - ${p.id}`));
      process.exit(1);
    }
    const stackPath = stack.path;
    const runtimeInfo = await detectRuntime(stackPath);
    const authStatus = await checkAuth(stackPath, runtimeInfo.runtime);
    const isRunning = checkIfRunning(stack.name || stack.id.replace("stack:", ""));
    console.log("");
    console.log("\u2550".repeat(60));
    console.log(`  ${stack.name || stack.id}`);
    console.log("\u2550".repeat(60));
    console.log("");
    console.log(`Stack:      ${stack.id}`);
    console.log(`Version:    ${stack.version || "unknown"}`);
    if (stack.description) {
      console.log(`About:      ${stack.description}`);
    }
    console.log("");
    console.log(`Runtime:    ${runtimeInfo.runtime || "unknown"}`);
    console.log(`Path:       ${stackPath}`);
    if (runtimeInfo.entry) {
      console.log(`Entry:      ${runtimeInfo.entry}`);
    }
    console.log("");
    const authIcon = authStatus.configured ? "\u2713" : "\u2717";
    const authColor = authStatus.configured ? "\x1B[32m" : "\x1B[31m";
    const resetColor = "\x1B[0m";
    console.log(`Auth:       ${authColor}${authIcon}${resetColor} ${authStatus.message}`);
    if (authStatus.files.length > 0) {
      authStatus.files.forEach((file) => {
        console.log(`            - ${file}`);
      });
    }
    console.log("");
    const runIcon = isRunning ? "\u2713" : "\u25CB";
    const runColor = isRunning ? "\x1B[32m" : "\x1B[90m";
    const runStatus = isRunning ? "Running" : "Not running";
    console.log(`Status:     ${runColor}${runIcon}${resetColor} ${runStatus}`);
    console.log("");
    console.log("Commands:");
    console.log(`  rudi run ${stack.id}          Test the stack`);
    console.log(`  rudi secrets ${stack.id}      Configure secrets`);
    if (runtimeInfo.entry) {
      console.log("");
      console.log("Run MCP server directly:");
      const entryPath = path26.join(stackPath, runtimeInfo.entry);
      if (runtimeInfo.runtime === "node") {
        console.log(`  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node ${entryPath}`);
      } else if (runtimeInfo.runtime === "python") {
        console.log(`  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | python3 ${entryPath}`);
      }
    }
    console.log("");
  } catch (error) {
    console.error(`Failed to get stack info: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
async function detectRuntime(stackPath) {
  const runtimes = ["node", "python"];
  for (const runtime of runtimes) {
    const runtimePath = path26.join(stackPath, runtime);
    try {
      await fs26.access(runtimePath);
      if (runtime === "node") {
        const distEntry = path26.join(runtimePath, "dist", "index.js");
        const srcEntry = path26.join(runtimePath, "src", "index.ts");
        try {
          await fs26.access(distEntry);
          return { runtime: "node", entry: `${runtime}/dist/index.js` };
        } catch {
          try {
            await fs26.access(srcEntry);
            return { runtime: "node", entry: `${runtime}/src/index.ts` };
          } catch {
            return { runtime: "node", entry: null };
          }
        }
      } else if (runtime === "python") {
        const entry = path26.join(runtimePath, "src", "index.py");
        try {
          await fs26.access(entry);
          return { runtime: "python", entry: `${runtime}/src/index.py` };
        } catch {
          return { runtime: "python", entry: null };
        }
      }
    } catch {
      continue;
    }
  }
  return { runtime: null, entry: null };
}
async function checkAuth(stackPath, runtime) {
  const authFiles = [];
  let configured = false;
  if (runtime === "node" || runtime === "python") {
    const runtimePath = path26.join(stackPath, runtime);
    const tokenPath = path26.join(runtimePath, "token.json");
    try {
      await fs26.access(tokenPath);
      authFiles.push(`${runtime}/token.json`);
      configured = true;
    } catch {
      const accountsPath = path26.join(runtimePath, "accounts");
      try {
        const accounts = await fs26.readdir(accountsPath);
        for (const account of accounts) {
          if (account.startsWith(".")) continue;
          const accountTokenPath = path26.join(accountsPath, account, "token.json");
          try {
            await fs26.access(accountTokenPath);
            authFiles.push(`${runtime}/accounts/${account}/token.json`);
            configured = true;
          } catch {
          }
        }
      } catch {
      }
    }
  }
  const envPath = path26.join(stackPath, ".env");
  try {
    const envContent = await fs26.readFile(envPath, "utf-8");
    const hasValues = envContent.split("\n").some((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return false;
      const [key, value] = trimmed.split("=");
      return value && value.trim() && !value.includes("YOUR_") && !value.includes("your_");
    });
    if (hasValues) {
      authFiles.push(".env");
      configured = true;
    }
  } catch {
  }
  if (configured) {
    return {
      configured: true,
      message: "Configured",
      files: authFiles
    };
  } else {
    return {
      configured: false,
      message: "Not configured",
      files: []
    };
  }
}
function checkIfRunning(stackName) {
  try {
    const result = (0, import_child_process8.execSync)(`ps aux | grep "${stackName}" | grep -v grep || true`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
      // Suppress stderr
    });
    const lines = result.trim().split("\n").filter((line) => {
      return line && line.includes("index.ts") || line.includes("index.js") || line.includes("index.py");
    });
    return lines.length > 0;
  } catch {
    return false;
  }
}

// src/commands/auth.js
var fs27 = __toESM(require("fs/promises"), 1);
var path27 = __toESM(require("path"), 1);
var import_child_process9 = require("child_process");
init_src3();
var net = __toESM(require("net"), 1);
async function findAvailablePort(basePort = 3456) {
  for (let port = basePort; port < basePort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${basePort}-${basePort + 10}`);
}
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}
async function detectRuntime2(stackPath) {
  const runtimes = ["node", "python"];
  for (const runtime of runtimes) {
    const runtimePath = path27.join(stackPath, runtime);
    try {
      await fs27.access(runtimePath);
      if (runtime === "node") {
        const authTs = path27.join(runtimePath, "src", "auth.ts");
        const authJs = path27.join(runtimePath, "dist", "auth.js");
        try {
          await fs27.access(authTs);
          return { runtime: "node", authScript: authTs, useTsx: true };
        } catch {
          try {
            await fs27.access(authJs);
            return { runtime: "node", authScript: authJs, useTsx: false };
          } catch {
          }
        }
      } else if (runtime === "python") {
        const authPy = path27.join(runtimePath, "src", "auth.py");
        try {
          await fs27.access(authPy);
          return { runtime: "python", authScript: authPy, useTsx: false };
        } catch {
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}
async function cmdAuth(args, flags) {
  const stackId = args[0];
  const accountEmail = args[1];
  if (!stackId) {
    console.error("Usage: rudi auth <stack-id> [account-email]");
    console.error("Example: rudi auth google-workspace user@gmail.com");
    process.exit(1);
  }
  try {
    const packages = await listInstalled("stack");
    const stack = packages.find((p) => {
      const pId = p.id || "";
      const pName = p.name || "";
      return pId === stackId || pId === `stack:${stackId}` || pName === stackId;
    });
    if (!stack) {
      console.error(`Stack not found: ${stackId}`);
      console.error(`
Installed stacks:`);
      packages.forEach((p) => console.error(`  - ${p.id}`));
      process.exit(1);
    }
    const stackPath = stack.path;
    const authInfo = await detectRuntime2(stackPath);
    if (!authInfo) {
      console.error(`No authentication script found for ${stackId}`);
      console.error(`This stack may not support OAuth authentication.`);
      process.exit(1);
    }
    console.log("");
    console.log("\u2550".repeat(60));
    console.log(`  Authenticating ${stack.name || stackId}`);
    console.log("\u2550".repeat(60));
    console.log("");
    console.log("Finding available port for OAuth callback...");
    const port = await findAvailablePort(3456);
    console.log(`Using port: ${port}`);
    console.log("");
    let cmd;
    const cwd = path27.dirname(authInfo.authScript);
    if (authInfo.runtime === "node") {
      const distAuth = path27.join(cwd, "..", "dist", "auth.js");
      let useBuiltInPort = false;
      let tempAuthScript = null;
      try {
        await fs27.access(distAuth);
        const distContent = await fs27.readFile(distAuth, "utf-8");
        if (distContent.includes("findAvailablePort")) {
          console.log("Using compiled authentication script...");
          cmd = `node ${distAuth}${accountEmail ? ` ${accountEmail}` : ""}`;
          useBuiltInPort = true;
        }
      } catch {
      }
      if (!useBuiltInPort) {
        const authContent = await fs27.readFile(authInfo.authScript, "utf-8");
        const tempExt = authInfo.useTsx ? ".ts" : ".mjs";
        tempAuthScript = path27.join(cwd, "..", `auth-temp${tempExt}`);
        const modifiedContent = authContent.replace(/localhost:3456/g, `localhost:${port}`).replace(/server\.listen\(3456/g, `server.listen(${port}`);
        await fs27.writeFile(tempAuthScript, modifiedContent);
        if (authInfo.useTsx) {
          cmd = `npx tsx ${tempAuthScript}${accountEmail ? ` ${accountEmail}` : ""}`;
        } else {
          cmd = `node ${tempAuthScript}${accountEmail ? ` ${accountEmail}` : ""}`;
        }
      }
      console.log("Starting OAuth flow...");
      console.log("");
      try {
        (0, import_child_process9.execSync)(cmd, {
          cwd,
          stdio: "inherit"
        });
        if (tempAuthScript) {
          await fs27.unlink(tempAuthScript);
        }
      } catch (error) {
        if (tempAuthScript) {
          try {
            await fs27.unlink(tempAuthScript);
          } catch {
          }
        }
        throw error;
      }
    } else if (authInfo.runtime === "python") {
      cmd = `python3 ${authInfo.authScript}${accountEmail ? ` ${accountEmail}` : ""}`;
      console.log("Starting OAuth flow...");
      console.log("");
      (0, import_child_process9.execSync)(cmd, {
        cwd,
        stdio: "inherit",
        env: {
          ...process.env,
          OAUTH_PORT: port.toString()
        }
      });
    }
    console.log("");
    console.log("\u2713 Authentication complete!");
    console.log("");
  } catch (error) {
    console.error(`Authentication failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// src/commands/mcp.js
var fs28 = __toESM(require("fs"), 1);
var path28 = __toESM(require("path"), 1);
var import_child_process10 = require("child_process");
function getBundledRuntime(runtime) {
  const platform = process.platform;
  if (runtime === "node") {
    const nodePath = platform === "win32" ? path28.join(PATHS2.runtimes, "node", "node.exe") : path28.join(PATHS2.runtimes, "node", "bin", "node");
    if (fs28.existsSync(nodePath)) {
      return nodePath;
    }
  }
  if (runtime === "python") {
    const pythonPath = platform === "win32" ? path28.join(PATHS2.runtimes, "python", "python.exe") : path28.join(PATHS2.runtimes, "python", "bin", "python3");
    if (fs28.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  return null;
}
function getBundledNpx() {
  const platform = process.platform;
  const npxPath = platform === "win32" ? path28.join(PATHS2.runtimes, "node", "npx.cmd") : path28.join(PATHS2.runtimes, "node", "bin", "npx");
  if (fs28.existsSync(npxPath)) {
    return npxPath;
  }
  return null;
}
function loadManifest2(stackPath) {
  const manifestPath = path28.join(stackPath, "manifest.json");
  if (!fs28.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs28.readFileSync(manifestPath, "utf-8"));
}
function getRequiredSecrets(manifest) {
  const secrets = manifest?.requires?.secrets || manifest?.secrets || [];
  return secrets.map((s) => ({
    name: typeof s === "string" ? s : s.name || s.key,
    required: typeof s === "object" ? s.required !== false : true
  }));
}
async function buildEnv(manifest) {
  const env = { ...process.env };
  const requiredSecrets = getRequiredSecrets(manifest);
  const missing = [];
  for (const secret of requiredSecrets) {
    const value = await getSecret(secret.name);
    if (value) {
      env[secret.name] = value;
    } else if (secret.required) {
      missing.push(secret.name);
    }
  }
  return { env, missing };
}
async function cmdMcp(args, flags) {
  const stackName = args[0];
  if (!stackName) {
    console.error("Usage: rudi mcp <stack>");
    console.error("");
    console.error("This command is typically called by agent shims, not directly.");
    console.error("");
    console.error("Example: rudi mcp slack");
    process.exit(1);
  }
  const stackPath = path28.join(PATHS2.stacks, stackName);
  if (!fs28.existsSync(stackPath)) {
    console.error(`Stack not found: ${stackName}`);
    console.error(`Expected at: ${stackPath}`);
    console.error("");
    console.error(`Install with: rudi install ${stackName}`);
    process.exit(1);
  }
  const manifest = loadManifest2(stackPath);
  if (!manifest) {
    console.error(`No manifest.json found in stack: ${stackName}`);
    process.exit(1);
  }
  const { env, missing } = await buildEnv(manifest);
  if (missing.length > 0 && !flags.force) {
    console.error(`Missing required secrets for ${stackName}:`);
    for (const name of missing) {
      console.error(`  - ${name}`);
    }
    console.error("");
    console.error(`Set with: rudi secrets set ${missing[0]}`);
    process.exit(1);
  }
  let command = manifest.command;
  if (!command || command.length === 0) {
    if (manifest.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }
  if (!command || command.length === 0) {
    console.error(`No command defined in manifest for: ${stackName}`);
    process.exit(1);
  }
  const runtime = manifest.runtime || manifest.mcp?.runtime || "node";
  const resolvedCommand = command.map((part, i) => {
    if (i === 0) {
      if (part === "node") {
        const bundledNode = getBundledRuntime("node");
        if (bundledNode) return bundledNode;
      } else if (part === "npx") {
        const bundledNpx = getBundledNpx();
        if (bundledNpx) return bundledNpx;
      } else if (part === "python" || part === "python3") {
        const bundledPython = getBundledRuntime("python");
        if (bundledPython) return bundledPython;
      }
      return part;
    }
    if (part.startsWith("./") || part.startsWith("../") || !path28.isAbsolute(part)) {
      const resolved = path28.join(stackPath, part);
      if (fs28.existsSync(resolved)) {
        return resolved;
      }
    }
    return part;
  });
  const [cmd, ...cmdArgs] = resolvedCommand;
  const bundledNodeBin = path28.join(PATHS2.runtimes, "node", "bin");
  const bundledPythonBin = path28.join(PATHS2.runtimes, "python", "bin");
  if (fs28.existsSync(bundledNodeBin) || fs28.existsSync(bundledPythonBin)) {
    const runtimePaths = [];
    if (fs28.existsSync(bundledNodeBin)) runtimePaths.push(bundledNodeBin);
    if (fs28.existsSync(bundledPythonBin)) runtimePaths.push(bundledPythonBin);
    env.PATH = runtimePaths.join(path28.delimiter) + path28.delimiter + (env.PATH || "");
  }
  if (flags.debug) {
    console.error(`[rudi mcp] Stack: ${stackName}`);
    console.error(`[rudi mcp] Path: ${stackPath}`);
    console.error(`[rudi mcp] Runtime: ${runtime}`);
    console.error(`[rudi mcp] Command: ${cmd} ${cmdArgs.join(" ")}`);
    console.error(`[rudi mcp] Secrets loaded: ${getRequiredSecrets(manifest).length - missing.length}`);
    if (getBundledRuntime(runtime)) {
      console.error(`[rudi mcp] Using bundled ${runtime} runtime`);
    } else {
      console.error(`[rudi mcp] Using system ${runtime} (no bundled runtime found)`);
    }
  }
  const child = (0, import_child_process10.spawn)(cmd, cmdArgs, {
    cwd: stackPath,
    env,
    stdio: "inherit"
    // MCP uses stdio for communication
  });
  child.on("error", (err) => {
    console.error(`Failed to start MCP server: ${err.message}`);
    process.exit(1);
  });
  child.on("exit", (code) => {
    process.exit(code || 0);
  });
}

// src/commands/integrate.js
var fs29 = __toESM(require("fs"), 1);
var path29 = __toESM(require("path"), 1);
var import_os6 = __toESM(require("os"), 1);
var HOME2 = import_os6.default.homedir();
var ROUTER_SHIM_PATH = path29.join(PATHS2.home, "shims", "rudi-router");
function checkRouterShim() {
  if (!fs29.existsSync(ROUTER_SHIM_PATH)) {
    throw new Error(
      `Router shim not found at ${ROUTER_SHIM_PATH}
Run: npm install -g @learnrudi/cli@latest`
    );
  }
  return ROUTER_SHIM_PATH;
}
function backupConfig(configPath) {
  if (!fs29.existsSync(configPath)) return null;
  const backupPath = configPath + ".backup." + Date.now();
  fs29.copyFileSync(configPath, backupPath);
  return backupPath;
}
function readJsonConfig(configPath) {
  if (!fs29.existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(fs29.readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}
function writeJsonConfig(configPath, config) {
  const dir = path29.dirname(configPath);
  if (!fs29.existsSync(dir)) {
    fs29.mkdirSync(dir, { recursive: true });
  }
  fs29.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
function buildRouterEntry(agentId) {
  const base = {
    command: ROUTER_SHIM_PATH,
    args: []
  };
  if (agentId === "claude-desktop" || agentId === "claude-code") {
    return { type: "stdio", ...base };
  }
  return base;
}
async function integrateAgent(agentId, flags) {
  const agentConfig = AGENT_CONFIGS.find((a) => a.id === agentId);
  if (!agentConfig) {
    console.error(`Unknown agent: ${agentId}`);
    return { success: false, error: "Unknown agent" };
  }
  const configPath = findAgentConfig(agentConfig);
  const targetPath = configPath || path29.join(HOME2, agentConfig.paths[process.platform]?.[0] || agentConfig.paths.darwin[0]);
  console.log(`
${agentConfig.name}:`);
  console.log(`  Config: ${targetPath}`);
  if (fs29.existsSync(targetPath)) {
    const backup = backupConfig(targetPath);
    if (backup && flags.verbose) {
      console.log(`  Backup: ${backup}`);
    }
  }
  const config = readJsonConfig(targetPath);
  const key = agentConfig.key;
  if (!config[key]) {
    config[key] = {};
  }
  const rudiMcpShimPath = path29.join(PATHS2.home, "shims", "rudi-mcp");
  const removedEntries = [];
  for (const [serverName, serverConfig] of Object.entries(config[key])) {
    if (serverConfig.command === rudiMcpShimPath) {
      delete config[key][serverName];
      removedEntries.push(serverName);
    }
  }
  if (removedEntries.length > 0) {
    console.log(`  Removed old entries: ${removedEntries.join(", ")}`);
  }
  const routerEntry = buildRouterEntry(agentId);
  const existing = config[key]["rudi"];
  let action = "none";
  if (!existing) {
    config[key]["rudi"] = routerEntry;
    action = "added";
  } else if (existing.command !== routerEntry.command || JSON.stringify(existing.args) !== JSON.stringify(routerEntry.args)) {
    config[key]["rudi"] = routerEntry;
    action = "updated";
  }
  if (action !== "none" || removedEntries.length > 0) {
    writeJsonConfig(targetPath, config);
    if (action !== "none") {
      console.log(`  ${action === "added" ? "\u2713 Added" : "\u2713 Updated"} rudi router`);
    }
  } else {
    console.log(`  \u2713 Already configured`);
  }
  return { success: true, action, removed: removedEntries };
}
async function cmdIntegrate(args, flags) {
  const target = args[0];
  if (flags.list || target === "list") {
    const installed = getInstalledAgents();
    console.log("\nDetected agents:");
    for (const agent of installed) {
      console.log(`  \u2713 ${agent.name}`);
      console.log(`    ${agent.configFile}`);
    }
    if (installed.length === 0) {
      console.log("  (none detected)");
    }
    return;
  }
  if (!target) {
    console.log(`
rudi integrate - Wire RUDI router into agent configs

USAGE
  rudi integrate <agent>     Integrate with specific agent
  rudi integrate all         Integrate with all detected agents
  rudi integrate --list      Show detected agents

AGENTS
  claude       Claude Desktop + Claude Code
  cursor       Cursor IDE
  windsurf     Windsurf IDE
  vscode       VS Code / GitHub Copilot
  gemini       Gemini CLI
  codex        OpenAI Codex CLI
  zed          Zed Editor

OPTIONS
  --verbose    Show detailed output
  --dry-run    Show what would be done without making changes

EXAMPLES
  rudi integrate claude
  rudi integrate all
`);
    return;
  }
  try {
    checkRouterShim();
  } catch (err) {
    console.error(err.message);
    return;
  }
  console.log(`
Wiring up RUDI router...`);
  let targetAgents = [];
  if (target === "all") {
    targetAgents = getInstalledAgents().map((a) => a.id);
    if (targetAgents.length === 0) {
      console.log("No agents detected.");
      return;
    }
  } else if (target === "claude") {
    targetAgents = ["claude-desktop", "claude-code"].filter((id) => {
      const agent = AGENT_CONFIGS.find((a) => a.id === id);
      return agent && findAgentConfig(agent);
    });
    if (targetAgents.length === 0) {
      targetAgents = ["claude-code"];
    }
  } else {
    const idMap = {
      "cursor": "cursor",
      "windsurf": "windsurf",
      "vscode": "vscode",
      "gemini": "gemini",
      "codex": "codex",
      "zed": "zed",
      "cline": "cline"
    };
    const agentId = idMap[target] || target;
    targetAgents = [agentId];
  }
  if (flags["dry-run"]) {
    console.log("\nDry run - would add RUDI router to:");
    for (const agentId of targetAgents) {
      const agent = AGENT_CONFIGS.find((a) => a.id === agentId);
      console.log(`  ${agent?.name || agentId}`);
    }
    return;
  }
  const results = [];
  for (const agentId of targetAgents) {
    const result = await integrateAgent(agentId, flags);
    results.push({ agent: agentId, ...result });
  }
  const successful = results.filter((r) => r.success);
  console.log(`
\u2713 Integrated with ${successful.length} agent(s)`);
  console.log("\nRestart your agent(s) to access all installed stacks.");
  console.log("\nManage stacks:");
  console.log("  rudi install <stack>   # Install a new stack");
  console.log("  rudi index             # Rebuild tool cache");
}

// src/commands/migrate.js
var fs30 = __toESM(require("fs"), 1);
var path30 = __toESM(require("path"), 1);
var import_os7 = __toESM(require("os"), 1);
var HOME3 = import_os7.default.homedir();
var OLD_PROMPT_STACK = path30.join(HOME3, ".prompt-stack");
var SHIM_PATH = path30.join(PATHS2.home, "shims", "rudi-mcp");
function getOldStacks() {
  const stacksDir = path30.join(OLD_PROMPT_STACK, "stacks");
  if (!fs30.existsSync(stacksDir)) return [];
  return fs30.readdirSync(stacksDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).filter((d) => {
    const hasManifest = fs30.existsSync(path30.join(stacksDir, d.name, "manifest.json"));
    const hasPackage = fs30.existsSync(path30.join(stacksDir, d.name, "package.json"));
    return hasManifest || hasPackage;
  }).map((d) => d.name);
}
function copyStack(stackName) {
  const oldPath = path30.join(OLD_PROMPT_STACK, "stacks", stackName);
  const newPath = path30.join(PATHS2.stacks, stackName);
  if (!fs30.existsSync(oldPath)) {
    return { success: false, error: "Source not found" };
  }
  if (fs30.existsSync(newPath)) {
    return { success: true, skipped: true, reason: "Already exists" };
  }
  if (!fs30.existsSync(PATHS2.stacks)) {
    fs30.mkdirSync(PATHS2.stacks, { recursive: true });
  }
  copyRecursive(oldPath, newPath);
  return { success: true, copied: true };
}
function copyRecursive(src, dest) {
  const stat = fs30.statSync(src);
  if (stat.isDirectory()) {
    fs30.mkdirSync(dest, { recursive: true });
    for (const child of fs30.readdirSync(src)) {
      copyRecursive(path30.join(src, child), path30.join(dest, child));
    }
  } else {
    fs30.copyFileSync(src, dest);
  }
}
function ensureShim() {
  const shimsDir = path30.dirname(SHIM_PATH);
  if (!fs30.existsSync(shimsDir)) {
    fs30.mkdirSync(shimsDir, { recursive: true });
  }
  const shimContent = `#!/usr/bin/env bash
set -euo pipefail
if command -v rudi &> /dev/null; then
  exec rudi mcp "$1"
else
  exec npx --yes @learnrudi/cli mcp "$1"
fi
`;
  fs30.writeFileSync(SHIM_PATH, shimContent, { mode: 493 });
}
function buildNewEntry(stackName, agentId) {
  const base = {
    command: SHIM_PATH,
    args: [stackName]
  };
  if (agentId === "claude-desktop" || agentId === "claude-code") {
    return { type: "stdio", ...base };
  }
  return base;
}
function isOldEntry(entry) {
  if (!entry) return false;
  const command = entry.command || "";
  const args = entry.args || [];
  const cwd = entry.cwd || "";
  return command.includes(".prompt-stack") || args.some((a) => typeof a === "string" && a.includes(".prompt-stack")) || cwd.includes(".prompt-stack");
}
function migrateAgentConfig(agentConfig, installedStacks, flags) {
  const configPath = findAgentConfig(agentConfig);
  if (!configPath) return { skipped: true, reason: "Config not found" };
  let config;
  try {
    config = JSON.parse(fs30.readFileSync(configPath, "utf-8"));
  } catch {
    return { skipped: true, reason: "Could not parse config" };
  }
  const key = agentConfig.key;
  const mcpServers = config[key] || {};
  let updated = 0;
  let removed = 0;
  const changes = [];
  for (const [name, entry] of Object.entries(mcpServers)) {
    if (isOldEntry(entry)) {
      if (installedStacks.includes(name)) {
        const newEntry = buildNewEntry(name, agentConfig.id);
        mcpServers[name] = newEntry;
        updated++;
        changes.push({ name, action: "updated" });
      } else if (flags.removeOrphans) {
        delete mcpServers[name];
        removed++;
        changes.push({ name, action: "removed (not installed)" });
      } else {
        changes.push({ name, action: "skipped (not installed in .rudi)" });
      }
    }
  }
  if (updated > 0 || removed > 0) {
    const backupPath = configPath + ".backup." + Date.now();
    fs30.copyFileSync(configPath, backupPath);
    config[key] = mcpServers;
    fs30.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
  return { updated, removed, changes };
}
async function cmdMigrate(args, flags) {
  const subcommand = args[0];
  if (!subcommand || subcommand === "help") {
    console.log(`
rudi migrate - Migrate from .prompt-stack to .rudi

USAGE
  rudi migrate status         Show what needs to be migrated
  rudi migrate stacks         Copy stacks from .prompt-stack to .rudi
  rudi migrate configs        Update agent configs to use new shim
  rudi migrate all            Do everything

OPTIONS
  --remove-orphans    Remove entries for stacks not installed in .rudi
  --dry-run           Show what would be done without making changes
`);
    return;
  }
  if (subcommand === "status") {
    await migrateStatus();
    return;
  }
  if (subcommand === "stacks") {
    await migrateStacks(flags);
    return;
  }
  if (subcommand === "configs") {
    await migrateConfigs(flags);
    return;
  }
  if (subcommand === "all") {
    await migrateStacks(flags);
    console.log("");
    await migrateConfigs(flags);
    return;
  }
  console.error(`Unknown subcommand: ${subcommand}`);
  console.error("Run: rudi migrate help");
}
async function migrateStatus() {
  console.log("\n=== Migration Status ===\n");
  const oldStacks = getOldStacks();
  console.log(`Old .prompt-stack stacks: ${oldStacks.length}`);
  if (oldStacks.length > 0) {
    for (const name of oldStacks) {
      const existsInRudi = fs30.existsSync(path30.join(PATHS2.stacks, name));
      const status = existsInRudi ? "\u2713 (already in .rudi)" : "\u25CB (needs migration)";
      console.log(`  ${status} ${name}`);
    }
  }
  const newStacksDir = PATHS2.stacks;
  let newStacks = [];
  if (fs30.existsSync(newStacksDir)) {
    newStacks = fs30.readdirSync(newStacksDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name);
  }
  console.log(`
New .rudi stacks: ${newStacks.length}`);
  if (newStacks.length > 0) {
    for (const name of newStacks) {
      console.log(`  \u2713 ${name}`);
    }
  }
  console.log("\n=== Agent Configs ===\n");
  for (const agentConfig of AGENT_CONFIGS) {
    const configPath = findAgentConfig(agentConfig);
    if (!configPath) continue;
    let config;
    try {
      config = JSON.parse(fs30.readFileSync(configPath, "utf-8"));
    } catch {
      continue;
    }
    const mcpServers = config[agentConfig.key] || {};
    const entries = Object.entries(mcpServers);
    const oldEntries = entries.filter(([_, e]) => isOldEntry(e));
    const newEntries = entries.filter(([_, e]) => !isOldEntry(e));
    if (entries.length === 0) continue;
    console.log(`${agentConfig.name}:`);
    console.log(`  Config: ${configPath}`);
    console.log(`  Old entries: ${oldEntries.length}`);
    console.log(`  New entries: ${newEntries.length}`);
    if (oldEntries.length > 0) {
      console.log("  Needs update:");
      for (const [name] of oldEntries) {
        const installed = newStacks.includes(name);
        const status = installed ? "(ready)" : "(not in .rudi)";
        console.log(`    - ${name} ${status}`);
      }
    }
    console.log("");
  }
  console.log("Run: rudi migrate all");
}
async function migrateStacks(flags) {
  console.log("=== Migrating Stacks ===\n");
  const oldStacks = getOldStacks();
  if (oldStacks.length === 0) {
    console.log("No stacks found in .prompt-stack");
    return;
  }
  console.log(`Found ${oldStacks.length} stack(s) in .prompt-stack
`);
  for (const name of oldStacks) {
    if (flags.dryRun) {
      const exists = fs30.existsSync(path30.join(PATHS2.stacks, name));
      console.log(`  [dry-run] ${name}: ${exists ? "would skip (exists)" : "would copy"}`);
    } else {
      const result = copyStack(name);
      if (result.skipped) {
        console.log(`  \u25CB ${name}: skipped (${result.reason})`);
      } else if (result.copied) {
        console.log(`  \u2713 ${name}: copied to .rudi/stacks/`);
      } else {
        console.log(`  \u2717 ${name}: ${result.error}`);
      }
    }
  }
  if (!flags.dryRun) {
    console.log(`
Stacks migrated to: ${PATHS2.stacks}`);
  }
}
async function migrateConfigs(flags) {
  console.log("=== Updating Agent Configs ===\n");
  if (!flags.dryRun) {
    ensureShim();
    console.log(`Shim ready: ${SHIM_PATH}
`);
  }
  let installedStacks = [];
  if (fs30.existsSync(PATHS2.stacks)) {
    installedStacks = fs30.readdirSync(PATHS2.stacks, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name);
  }
  for (const agentConfig of AGENT_CONFIGS) {
    const configPath = findAgentConfig(agentConfig);
    if (!configPath) continue;
    if (flags.dryRun) {
      console.log(`${agentConfig.name}:`);
      console.log(`  [dry-run] Would update entries using .prompt-stack paths`);
      continue;
    }
    const result = migrateAgentConfig(agentConfig, installedStacks, flags);
    if (result.skipped) {
      continue;
    }
    console.log(`${agentConfig.name}:`);
    console.log(`  Config: ${configPath}`);
    if (result.changes && result.changes.length > 0) {
      for (const change of result.changes) {
        console.log(`    ${change.action}: ${change.name}`);
      }
    }
    if (result.updated > 0 || result.removed > 0) {
      console.log(`  Updated: ${result.updated}, Removed: ${result.removed}`);
    } else {
      console.log(`  No changes needed`);
    }
    console.log("");
  }
  console.log("Restart your agents to use the updated configs.");
}

// src/commands/index-tools.js
init_src3();
init_src3();
async function cmdIndex(args, flags) {
  const stackFilter = args.length > 0 ? args : null;
  const forceReindex = flags.force || false;
  const jsonOutput = flags.json || false;
  const config = readRudiConfig();
  if (!config) {
    console.error("Error: rudi.json not found. Run `rudi doctor` to check setup.");
    process.exit(1);
  }
  const installedStacks = Object.keys(config.stacks || {}).filter(
    (id) => config.stacks[id].installed
  );
  if (installedStacks.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log("No installed stacks to index.");
      console.log("\nInstall stacks with: rudi install <stack>");
    }
    return;
  }
  const stacksToIndex = stackFilter ? stackFilter.filter((id) => {
    if (!installedStacks.includes(id)) {
      if (!jsonOutput) {
        console.log(`\u26A0 Stack not installed: ${id}`);
      }
      return false;
    }
    return true;
  }) : installedStacks;
  if (stacksToIndex.length === 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ indexed: 0, failed: 0, stacks: [] }));
    } else {
      console.log("No valid stacks to index.");
    }
    return;
  }
  const existingIndex = readToolIndex();
  if (existingIndex && !forceReindex && !stackFilter) {
    const allCached = stacksToIndex.every((id) => {
      const entry = existingIndex.byStack?.[id];
      return entry && entry.tools && entry.tools.length > 0 && !entry.error;
    });
    if (allCached) {
      const totalTools = stacksToIndex.reduce((sum, id) => {
        return sum + (existingIndex.byStack[id]?.tools?.length || 0);
      }, 0);
      if (jsonOutput) {
        console.log(JSON.stringify({
          indexed: stacksToIndex.length,
          failed: 0,
          cached: true,
          totalTools,
          stacks: stacksToIndex.map((id) => ({
            id,
            tools: existingIndex.byStack[id]?.tools?.length || 0,
            indexedAt: existingIndex.byStack[id]?.indexedAt
          }))
        }));
      } else {
        console.log(`Tool index is up to date (${totalTools} tools from ${stacksToIndex.length} stacks)`);
        console.log(`Last updated: ${existingIndex.updatedAt}`);
        console.log(`
Use --force to re-index.`);
      }
      return;
    }
  }
  if (!jsonOutput) {
    console.log(`Indexing ${stacksToIndex.length} stack(s)...
`);
  }
  const log = jsonOutput ? () => {
  } : console.log;
  try {
    const result = await indexAllStacks({
      stacks: stacksToIndex,
      log,
      timeout: 2e4
      // 20s per stack
    });
    const totalTools = Object.values(result.index.byStack).reduce(
      (sum, entry) => sum + (entry.tools?.length || 0),
      0
    );
    if (jsonOutput) {
      console.log(JSON.stringify({
        indexed: result.indexed,
        failed: result.failed,
        totalTools,
        stacks: stacksToIndex.map((id) => ({
          id,
          tools: result.index.byStack[id]?.tools?.length || 0,
          error: result.index.byStack[id]?.error || null,
          missingSecrets: result.index.byStack[id]?.missingSecrets || null
        }))
      }, null, 2));
    } else {
      console.log(`
${"\u2500".repeat(50)}`);
      console.log(`Indexed: ${result.indexed}/${stacksToIndex.length} stacks`);
      console.log(`Tools discovered: ${totalTools}`);
      console.log(`Cache: ${TOOL_INDEX_PATH}`);
      if (result.failed > 0) {
        console.log(`
\u26A0 ${result.failed} stack(s) failed to index.`);
        const missingSecretStacks = Object.entries(result.index.byStack).filter(([_, entry]) => entry.missingSecrets?.length > 0);
        if (missingSecretStacks.length > 0) {
          console.log(`
Missing secrets:`);
          for (const [stackId, entry] of missingSecretStacks) {
            for (const secret of entry.missingSecrets) {
              console.log(`  rudi secrets set ${secret}`);
            }
          }
          console.log(`
After configuring secrets, run: rudi index`);
        }
      }
    }
  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: error.message }));
    } else {
      console.error(`Index failed: ${error.message}`);
    }
    process.exit(1);
  }
}

// src/commands/status.js
init_src3();
var import_child_process11 = require("child_process");
var import_fs24 = __toESM(require("fs"), 1);
var import_path21 = __toESM(require("path"), 1);
var import_os8 = __toESM(require("os"), 1);
var AGENTS = [
  {
    id: "claude",
    name: "Claude Code",
    npmPackage: "@anthropic-ai/claude-code",
    credentialType: "keychain",
    keychainService: "Claude Code-credentials"
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    npmPackage: "@openai/codex",
    credentialType: "file",
    credentialPath: "~/.codex/auth.json"
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    npmPackage: "@google/gemini-cli",
    credentialType: "file",
    credentialPath: "~/.gemini/google_accounts.json"
  },
  {
    id: "copilot",
    name: "GitHub Copilot",
    npmPackage: "@githubnext/github-copilot-cli",
    credentialType: "file",
    credentialPath: "~/.config/github-copilot/hosts.json"
  }
];
var RUNTIMES = [
  { id: "node", name: "Node.js", command: "node", versionFlag: "--version" },
  { id: "python", name: "Python", command: "python3", versionFlag: "--version" },
  { id: "deno", name: "Deno", command: "deno", versionFlag: "--version" },
  { id: "bun", name: "Bun", command: "bun", versionFlag: "--version" }
];
var BINARIES = [
  { id: "ffmpeg", name: "FFmpeg", command: "ffmpeg", versionFlag: "-version" },
  { id: "ripgrep", name: "ripgrep", command: "rg", versionFlag: "--version" },
  { id: "git", name: "Git", command: "git", versionFlag: "--version" },
  { id: "pandoc", name: "Pandoc", command: "pandoc", versionFlag: "--version" },
  { id: "jq", name: "jq", command: "jq", versionFlag: "--version" }
];
function fileExists(filePath) {
  const resolved = filePath.replace("~", import_os8.default.homedir());
  return import_fs24.default.existsSync(resolved);
}
function checkKeychain(service) {
  if (process.platform !== "darwin") return false;
  try {
    (0, import_child_process11.execSync)(`security find-generic-password -s "${service}"`, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function getVersion2(command, versionFlag) {
  try {
    const output = (0, import_child_process11.execSync)(`${command} ${versionFlag} 2>&1`, {
      encoding: "utf-8",
      timeout: 5e3,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const match = output.match(/(\d+\.\d+\.?\d*)/);
    return match ? match[1] : output.trim().split("\n")[0].slice(0, 50);
  } catch {
    return null;
  }
}
function findBinary(command, kind = "binary") {
  const rudiPaths = [
    import_path21.default.join(PATHS.agents, command, "node_modules", ".bin", command),
    import_path21.default.join(PATHS.runtimes, command, "bin", command),
    import_path21.default.join(PATHS.binaries, command, command),
    import_path21.default.join(PATHS.binaries, command)
  ];
  for (const p of rudiPaths) {
    if (import_fs24.default.existsSync(p)) {
      return { found: true, path: p, source: "rudi" };
    }
  }
  try {
    const output = (0, import_child_process11.execSync)(`which ${command} 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 3e3
    });
    const globalPath = output.trim();
    if (globalPath) {
      return { found: true, path: globalPath, source: "global" };
    }
  } catch {
  }
  return { found: false, path: null, source: null };
}
function getAgentStatus(agent) {
  const rudiPath = import_path21.default.join(PATHS.agents, agent.id, "node_modules", ".bin", agent.id);
  const rudiInstalled = import_fs24.default.existsSync(rudiPath);
  let globalPath = null;
  let globalInstalled = false;
  if (!rudiInstalled) {
    try {
      const which2 = (0, import_child_process11.execSync)(`which ${agent.id} 2>/dev/null`, { encoding: "utf-8" }).trim();
      if (which2 && !which2.includes(".rudi/bins") && !which2.includes(".rudi/shims")) {
        globalPath = which2;
        globalInstalled = true;
      }
    } catch {
    }
  }
  const installed = rudiInstalled || globalInstalled;
  const activePath = rudiInstalled ? rudiPath : globalPath;
  const source = rudiInstalled ? "rudi" : globalInstalled ? "global" : null;
  let authenticated = false;
  if (agent.credentialType === "keychain") {
    authenticated = checkKeychain(agent.keychainService);
  } else if (agent.credentialType === "file") {
    authenticated = fileExists(agent.credentialPath);
  }
  let version = null;
  if (installed && activePath) {
    version = getVersion2(activePath, "--version");
  }
  return {
    id: agent.id,
    name: agent.name,
    installed,
    source,
    // 'rudi' | 'global' | null
    authenticated,
    version,
    path: activePath,
    ready: installed && authenticated
  };
}
function getRuntimeStatus(runtime) {
  const location = findBinary(runtime.command, "runtime");
  const version = location.found ? getVersion2(location.path, runtime.versionFlag) : null;
  return {
    id: runtime.id,
    name: runtime.name,
    installed: location.found,
    version,
    path: location.path,
    source: location.source
  };
}
function getBinaryStatus(binary) {
  const location = findBinary(binary.command, "binary");
  const version = location.found ? getVersion2(location.path, binary.versionFlag) : null;
  return {
    id: binary.id,
    name: binary.name,
    installed: location.found,
    version,
    path: location.path,
    source: location.source
  };
}
async function getFullStatus() {
  const agents = AGENTS.map(getAgentStatus);
  const runtimes = RUNTIMES.map(getRuntimeStatus);
  const binaries = BINARIES.map(getBinaryStatus);
  let stacks = [];
  let prompts = [];
  try {
    stacks = getInstalledPackages("stack").map((s) => ({
      id: s.id,
      name: s.name,
      version: s.version
    }));
    prompts = getInstalledPackages("prompt").map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category
    }));
  } catch {
  }
  const directories = {
    home: { path: PATHS.home, exists: import_fs24.default.existsSync(PATHS.home) },
    stacks: { path: PATHS.stacks, exists: import_fs24.default.existsSync(PATHS.stacks) },
    agents: { path: PATHS.agents, exists: import_fs24.default.existsSync(PATHS.agents) },
    runtimes: { path: PATHS.runtimes, exists: import_fs24.default.existsSync(PATHS.runtimes) },
    binaries: { path: PATHS.binaries, exists: import_fs24.default.existsSync(PATHS.binaries) },
    db: { path: PATHS.db, exists: import_fs24.default.existsSync(PATHS.db) }
  };
  const summary = {
    agentsInstalled: agents.filter((a) => a.installed).length,
    agentsReady: agents.filter((a) => a.ready).length,
    agentsTotal: agents.length,
    runtimesInstalled: runtimes.filter((r) => r.installed).length,
    runtimesTotal: runtimes.length,
    binariesInstalled: binaries.filter((b) => b.installed).length,
    binariesTotal: binaries.length,
    stacksInstalled: stacks.length,
    promptsInstalled: prompts.length
  };
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    platform: `${process.platform}-${process.arch}`,
    rudiHome: PATHS.home,
    summary,
    agents,
    runtimes,
    binaries,
    stacks,
    prompts,
    directories
  };
}
function printStatus(status, filter) {
  console.log("RUDI Status");
  console.log("=".repeat(50));
  console.log(`Platform: ${status.platform}`);
  console.log(`RUDI Home: ${status.rudiHome}`);
  console.log("");
  if (!filter || filter === "agents") {
    console.log(`AGENTS (${status.summary.agentsReady}/${status.summary.agentsTotal} ready)`);
    console.log("-".repeat(50));
    for (const agent of status.agents) {
      const installIcon = agent.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
      const version = agent.version ? `v${agent.version}` : "";
      const source = agent.source ? `(${agent.source})` : "";
      console.log(`  ${installIcon} ${agent.name} ${version} ${source}`);
      console.log(`    Installed: ${agent.installed ? "yes" : "no"}, Auth: ${agent.authenticated ? "yes" : "no"}, Ready: ${agent.ready ? "yes" : "no"}`);
    }
    console.log("");
  }
  if (!filter || filter === "runtimes") {
    console.log(`RUNTIMES (${status.summary.runtimesInstalled}/${status.summary.runtimesTotal})`);
    console.log("-".repeat(50));
    for (const rt of status.runtimes) {
      const icon = rt.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[90m\u25CB\x1B[0m";
      const version = rt.version ? `v${rt.version}` : "";
      const source = rt.source ? `(${rt.source})` : "";
      console.log(`  ${icon} ${rt.name} ${version} ${source}`);
    }
    console.log("");
  }
  if (!filter || filter === "binaries") {
    console.log(`BINARIES (${status.summary.binariesInstalled}/${status.summary.binariesTotal})`);
    console.log("-".repeat(50));
    for (const bin of status.binaries) {
      const icon = bin.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[90m\u25CB\x1B[0m";
      const version = bin.version ? `v${bin.version}` : "";
      const source = bin.source ? `(${bin.source})` : "";
      console.log(`  ${icon} ${bin.name} ${version} ${source}`);
    }
    console.log("");
  }
  if (!filter || filter === "stacks") {
    console.log(`STACKS (${status.summary.stacksInstalled})`);
    console.log("-".repeat(50));
    if (status.stacks.length === 0) {
      console.log("  No stacks installed");
    } else {
      for (const stack of status.stacks) {
        console.log(`  ${stack.id} v${stack.version || "?"}`);
      }
    }
    console.log("");
  }
  console.log("SUMMARY");
  console.log("-".repeat(50));
  console.log(`  Agents ready: ${status.summary.agentsReady}/${status.summary.agentsTotal}`);
  console.log(`  Runtimes: ${status.summary.runtimesInstalled}/${status.summary.runtimesTotal}`);
  console.log(`  Binaries: ${status.summary.binariesInstalled}/${status.summary.binariesTotal}`);
  console.log(`  Stacks: ${status.summary.stacksInstalled}`);
  console.log(`  Prompts: ${status.summary.promptsInstalled}`);
}
async function cmdStatus(args, flags) {
  const filter = args[0];
  const status = await getFullStatus();
  if (flags.json) {
    if (filter) {
      const filtered = {
        timestamp: status.timestamp,
        platform: status.platform,
        [filter]: status[filter]
      };
      console.log(JSON.stringify(filtered, null, 2));
    } else {
      console.log(JSON.stringify(status, null, 2));
    }
  } else {
    printStatus(status, filter);
  }
}

// src/commands/check.js
init_src3();
var import_child_process12 = require("child_process");
var import_fs25 = __toESM(require("fs"), 1);
var import_path22 = __toESM(require("path"), 1);
var import_os9 = __toESM(require("os"), 1);
var AGENT_CREDENTIALS = {
  claude: { type: "keychain", service: "Claude Code-credentials" },
  codex: { type: "file", path: "~/.codex/auth.json" },
  gemini: { type: "file", path: "~/.gemini/google_accounts.json" },
  copilot: { type: "file", path: "~/.config/github-copilot/hosts.json" }
};
function fileExists2(filePath) {
  const resolved = filePath.replace("~", import_os9.default.homedir());
  return import_fs25.default.existsSync(resolved);
}
function checkKeychain2(service) {
  if (process.platform !== "darwin") return false;
  try {
    (0, import_child_process12.execSync)(`security find-generic-password -s "${service}"`, {
      stdio: ["pipe", "pipe", "pipe"]
    });
    return true;
  } catch {
    return false;
  }
}
function getVersion3(binaryPath, versionFlag = "--version") {
  try {
    const output = (0, import_child_process12.execSync)(`"${binaryPath}" ${versionFlag} 2>&1`, {
      encoding: "utf-8",
      timeout: 5e3
    });
    const match = output.match(/(\d+\.\d+\.?\d*)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
function detectKindFromFilesystem(name) {
  const agentPath = import_path22.default.join(PATHS.agents, name, "node_modules", ".bin", name);
  if (import_fs25.default.existsSync(agentPath)) return "agent";
  const runtimePath = import_path22.default.join(PATHS.runtimes, name, "bin", name);
  if (import_fs25.default.existsSync(runtimePath)) return "runtime";
  const binaryPath = import_path22.default.join(PATHS.binaries, name, name);
  const binaryPath2 = import_path22.default.join(PATHS.binaries, name);
  if (import_fs25.default.existsSync(binaryPath) || import_fs25.default.existsSync(binaryPath2)) return "binary";
  const stackPath = import_path22.default.join(PATHS.stacks, name);
  if (import_fs25.default.existsSync(stackPath)) return "stack";
  try {
    const globalPath = (0, import_child_process12.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
    if (globalPath) {
      if (globalPath.includes("/node") || globalPath.includes("/python") || globalPath.includes("/deno") || globalPath.includes("/bun")) {
        return "runtime";
      }
      return "binary";
    }
  } catch {
  }
  return "stack";
}
async function cmdCheck(args, flags) {
  const packageId = args[0];
  if (!packageId) {
    console.error("Usage: rudi check <package-id>");
    console.error("Examples:");
    console.error("  rudi check agent:claude");
    console.error("  rudi check runtime:python");
    console.error("  rudi check binary:ffmpeg");
    console.error("  rudi check stack:slack");
    process.exit(1);
  }
  let kind, name;
  if (packageId.includes(":")) {
    [kind, name] = packageId.split(":");
  } else {
    name = packageId;
    kind = detectKindFromFilesystem(name);
  }
  const result = {
    id: `${kind}:${name}`,
    kind,
    name,
    installed: false,
    source: null,
    // 'rudi' | 'global' | null
    authenticated: null,
    // Only for agents
    ready: false,
    path: null,
    version: null
  };
  switch (kind) {
    case "agent": {
      const rudiPath = import_path22.default.join(PATHS.agents, name, "node_modules", ".bin", name);
      const rudiInstalled = import_fs25.default.existsSync(rudiPath);
      let globalPath = null;
      let globalInstalled = false;
      if (!rudiInstalled) {
        try {
          const which2 = (0, import_child_process12.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (which2 && !which2.includes(".rudi/bins") && !which2.includes(".rudi/shims")) {
            globalPath = which2;
            globalInstalled = true;
          }
        } catch {
        }
      }
      result.installed = rudiInstalled || globalInstalled;
      result.path = rudiInstalled ? rudiPath : globalPath;
      result.source = rudiInstalled ? "rudi" : globalInstalled ? "global" : null;
      if (result.installed && result.path) {
        result.version = getVersion3(result.path);
      }
      const cred = AGENT_CREDENTIALS[name];
      if (cred) {
        if (cred.type === "keychain") {
          result.authenticated = checkKeychain2(cred.service);
        } else if (cred.type === "file") {
          result.authenticated = fileExists2(cred.path);
        }
      }
      result.ready = result.installed && result.authenticated;
      break;
    }
    case "runtime": {
      const rudiPath = import_path22.default.join(PATHS.runtimes, name, "bin", name);
      if (import_fs25.default.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
        result.version = getVersion3(rudiPath);
      } else {
        try {
          const globalPath = (0, import_child_process12.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
            result.version = getVersion3(globalPath);
          }
        } catch {
        }
      }
      result.ready = result.installed;
      break;
    }
    case "binary": {
      const rudiPath = import_path22.default.join(PATHS.binaries, name, name);
      if (import_fs25.default.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
      } else {
        try {
          const globalPath = (0, import_child_process12.execSync)(`which ${name} 2>/dev/null`, { encoding: "utf-8" }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
          }
        } catch {
        }
      }
      result.ready = result.installed;
      break;
    }
    case "stack": {
      result.installed = isPackageInstalled(`stack:${name}`);
      if (result.installed) {
        result.path = getPackagePath(`stack:${name}`);
      }
      result.ready = result.installed;
      break;
    }
    default:
      console.error(`Unknown package kind: ${kind}`);
      process.exit(1);
  }
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const installIcon = result.installed ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
    const source = result.source ? `(${result.source})` : "";
    console.log(`${installIcon} ${result.id} ${source}`);
    console.log(`  Installed: ${result.installed}`);
    if (result.source) console.log(`  Source: ${result.source}`);
    if (result.path) console.log(`  Path: ${result.path}`);
    if (result.version) console.log(`  Version: ${result.version}`);
    if (result.authenticated !== null) {
      console.log(`  Authenticated: ${result.authenticated}`);
    }
    console.log(`  Ready: ${result.ready}`);
  }
  if (!result.installed) {
    process.exit(1);
  } else if (result.authenticated === false) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// src/commands/shims.js
init_src3();
var import_fs26 = __toESM(require("fs"), 1);
var import_path23 = __toESM(require("path"), 1);
function listShims2() {
  const binsDir = PATHS.bins;
  if (!import_fs26.default.existsSync(binsDir)) {
    return [];
  }
  const entries = import_fs26.default.readdirSync(binsDir);
  return entries.filter((entry) => {
    const fullPath = import_path23.default.join(binsDir, entry);
    const stat = import_fs26.default.lstatSync(fullPath);
    return stat.isFile() || stat.isSymbolicLink();
  });
}
function getShimType(shimPath) {
  const stat = import_fs26.default.lstatSync(shimPath);
  if (stat.isSymbolicLink()) {
    return "symlink";
  }
  try {
    const content = import_fs26.default.readFileSync(shimPath, "utf8");
    if (content.includes("#!/usr/bin/env bash")) {
      return "wrapper";
    }
  } catch (err) {
  }
  return "unknown";
}
function getShimTarget(name, shimPath, type) {
  if (type === "symlink") {
    try {
      return import_fs26.default.readlinkSync(shimPath);
    } catch (err) {
      return null;
    }
  }
  if (type === "wrapper") {
    try {
      const content = import_fs26.default.readFileSync(shimPath, "utf8");
      const match = content.match(/exec "([^"]+)"/);
      return match ? match[1] : null;
    } catch (err) {
      return null;
    }
  }
  return null;
}
function getPackageFromShim(shimName, target) {
  if (!target) return null;
  const match = target.match(/\/(binaries|runtimes|agents)\/([^\/]+)/);
  if (match) {
    const [, kind, pkgName] = match;
    const kindMap = {
      "binaries": "binary",
      "runtimes": "runtime",
      "agents": "agent"
    };
    return `${kindMap[kind]}:${pkgName}`;
  }
  const manifestDirs = [
    import_path23.default.join(PATHS.binaries),
    import_path23.default.join(PATHS.runtimes),
    import_path23.default.join(PATHS.agents)
  ];
  for (const dir of manifestDirs) {
    if (!import_fs26.default.existsSync(dir)) continue;
    const packages = import_fs26.default.readdirSync(dir);
    for (const pkg of packages) {
      const manifestPath = import_path23.default.join(dir, pkg, "manifest.json");
      if (import_fs26.default.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(import_fs26.default.readFileSync(manifestPath, "utf8"));
          const bins = manifest.bins || manifest.binaries || [manifest.name || pkg];
          if (bins.includes(shimName)) {
            const kind = dir.includes("binaries") ? "binary" : dir.includes("runtimes") ? "runtime" : "agent";
            return `${kind}:${pkg}`;
          }
        } catch (err) {
        }
      }
    }
  }
  return null;
}
function formatShimStatus(shim, flags) {
  const { name, valid, type, target, error, package: pkg } = shim;
  if (flags.json) {
    return JSON.stringify(shim, null, 2);
  }
  const icon = valid ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
  const typeLabel = type === "symlink" ? "\u2192" : "\u21D2";
  let output = `${icon} ${name} ${typeLabel} ${target || "(no target)"}`;
  if (pkg) {
    output += ` \x1B[90m[${pkg}]\x1B[0m`;
  }
  if (!valid && error) {
    output += `
  \x1B[31mError: ${error}\x1B[0m`;
  }
  return output;
}
async function cmdShims(args, flags) {
  const subcommand = args[0] || "list";
  if (!["list", "check", "fix"].includes(subcommand)) {
    console.error("Usage: rudi shims [list|check|fix]");
    process.exit(1);
  }
  const shimNames = listShims2();
  if (shimNames.length === 0) {
    console.log("No shims found in ~/.rudi/bins/");
    process.exit(0);
  }
  if (subcommand === "list" && !flags.verbose) {
    shimNames.forEach((name) => console.log(name));
    process.exit(0);
  }
  const results = [];
  let hasIssues = false;
  for (const name of shimNames) {
    const shimPath = import_path23.default.join(PATHS.bins, name);
    const validation = validateShim(name);
    const type = getShimType(shimPath);
    const target = getShimTarget(name, shimPath, type);
    const pkg = getPackageFromShim(name, target);
    const result = {
      name,
      valid: validation.valid,
      type,
      target: validation.target || target,
      error: validation.error,
      package: pkg
    };
    results.push(result);
    if (!result.valid) {
      hasIssues = true;
    }
  }
  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`
Shims in ~/.rudi/bins/ (${results.length} total):
`);
    if (flags.verbose || subcommand === "check") {
      results.forEach((result) => {
        console.log(formatShimStatus(result, flags));
      });
    } else {
      results.forEach((result) => {
        const icon = result.valid ? "\x1B[32m\u2713\x1B[0m" : "\x1B[31m\u2717\x1B[0m";
        console.log(`${icon} ${result.name}`);
      });
    }
    const valid = results.filter((r) => r.valid).length;
    const broken = results.filter((r) => !r.valid).length;
    console.log(`
${valid} valid, ${broken} broken`);
    if (hasIssues) {
      console.log("\n\x1B[33mTo fix broken shims, reinstall the affected packages:\x1B[0m");
      const brokenPackages = /* @__PURE__ */ new Set();
      results.forEach((r) => {
        if (!r.valid && r.package) {
          brokenPackages.add(r.package);
        }
      });
      brokenPackages.forEach((pkg) => {
        console.log(`  rudi install ${pkg} --force`);
      });
    }
  }
  if (subcommand === "fix") {
    console.log("\n\x1B[33mAttempting to fix broken shims...\x1B[0m\n");
    const brokenWithPkg = results.filter((r) => !r.valid && r.package);
    const orphaned = results.filter((r) => !r.valid && !r.package);
    if (orphaned.length > 0) {
      console.log(`Removing ${orphaned.length} orphaned shims...`);
      for (const shim of orphaned) {
        const shimPath = import_path23.default.join(PATHS.bins, shim.name);
        try {
          import_fs26.default.unlinkSync(shimPath);
          console.log(`  \x1B[32m\u2713\x1B[0m Removed ${shim.name}`);
        } catch (err) {
          console.log(`  \x1B[31m\u2717\x1B[0m Failed to remove ${shim.name}: ${err.message}`);
        }
      }
      console.log("");
    }
    const brokenPackages = new Set(brokenWithPkg.map((r) => r.package));
    if (brokenPackages.size === 0 && orphaned.length === 0) {
      console.log("No broken shims to fix.");
      process.exit(0);
    }
    if (brokenPackages.size > 0) {
      const { installPackage: installPackage2 } = await Promise.resolve().then(() => (init_src3(), src_exports));
      for (const pkg of brokenPackages) {
        console.log(`Reinstalling ${pkg}...`);
        try {
          await installPackage2(pkg, { force: true });
          console.log(`\x1B[32m\u2713\x1B[0m Fixed ${pkg}`);
        } catch (err) {
          console.log(`\x1B[31m\u2717\x1B[0m Failed to fix ${pkg}: ${err.message}`);
        }
      }
    }
    console.log("\n\x1B[32m\u2713\x1B[0m Fix complete");
  }
  process.exit(hasIssues ? 1 : 0);
}

// src/commands/info.js
var import_fs27 = __toESM(require("fs"), 1);
var import_path24 = __toESM(require("path"), 1);
init_src3();
async function cmdInfo(args, flags) {
  const pkgId = args[0];
  if (!pkgId) {
    console.error("Usage: rudi info <package>");
    console.error("Example: rudi info npm:typescript");
    console.error("         rudi info binary:supabase");
    process.exit(1);
  }
  try {
    const [kind, name] = parsePackageId2(pkgId);
    const installPath = getPackagePath2(pkgId);
    if (!import_fs27.default.existsSync(installPath)) {
      console.error(`Package not installed: ${pkgId}`);
      process.exit(1);
    }
    const manifestPath = import_path24.default.join(installPath, "manifest.json");
    let manifest = null;
    if (import_fs27.default.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(import_fs27.default.readFileSync(manifestPath, "utf-8"));
      } catch {
        console.warn("Warning: Could not parse manifest.json");
      }
    }
    console.log(`
Package: ${pkgId}`);
    console.log("\u2500".repeat(50));
    console.log(`  Name:        ${manifest?.name || name}`);
    console.log(`  Kind:        ${kind}`);
    console.log(`  Version:     ${manifest?.version || "unknown"}`);
    console.log(`  Install Dir: ${installPath}`);
    const installType = manifest?.installType || (manifest?.npmPackage ? "npm" : manifest?.pipPackage ? "pip" : kind);
    console.log(`  Install Type: ${installType}`);
    if (manifest?.source) {
      if (typeof manifest.source === "string") {
        console.log(`  Source:      ${manifest.source}`);
      } else {
        console.log(`  Source:      ${manifest.source.type || "unknown"}`);
        if (manifest.source.spec) {
          console.log(`  Spec:        ${manifest.source.spec}`);
        }
      }
    }
    if (manifest?.npmPackage) {
      console.log(`  npm Package: ${manifest.npmPackage}`);
    }
    if (manifest?.pipPackage) {
      console.log(`  pip Package: ${manifest.pipPackage}`);
    }
    if (manifest?.hasInstallScripts !== void 0) {
      console.log(`  Has Install Scripts: ${manifest.hasInstallScripts ? "yes" : "no"}`);
    }
    if (manifest?.scriptsPolicy) {
      console.log(`  Scripts Policy: ${manifest.scriptsPolicy}`);
    }
    if (manifest?.installedAt) {
      console.log(`  Installed:   ${new Date(manifest.installedAt).toLocaleString()}`);
    }
    const bins = manifest?.bins || manifest?.binaries || [];
    if (bins.length > 0) {
      console.log(`
Binaries (${bins.length}):`);
      console.log("\u2500".repeat(50));
      for (const bin of bins) {
        const shimPath = import_path24.default.join(PATHS2.bins, bin);
        const validation = validateShim(bin);
        const ownership = getShimOwner(bin);
        let shimStatus = "\u2717 no shim";
        if (import_fs27.default.existsSync(shimPath)) {
          if (validation.valid) {
            shimStatus = `\u2713 ${validation.target}`;
          } else {
            shimStatus = `\u26A0 broken: ${validation.error}`;
          }
        }
        console.log(`  ${bin}:`);
        console.log(`    Shim: ${shimStatus}`);
        if (ownership) {
          const ownerMatch = ownership.owner === pkgId;
          const ownerStatus = ownerMatch ? "(this package)" : `(owned by ${ownership.owner})`;
          console.log(`    Type: ${ownership.type} ${ownerStatus}`);
        }
      }
    } else {
      console.log(`
Binaries: none`);
    }
    const lockName = name.replace(/\//g, "__").replace(/^@/, "");
    const lockDir = kind === "binary" ? "binaries" : kind === "npm" ? "npms" : kind + "s";
    const lockPath = import_path24.default.join(PATHS2.locks, lockDir, `${lockName}.lock.yaml`);
    if (import_fs27.default.existsSync(lockPath)) {
      console.log(`
Lockfile: ${lockPath}`);
    }
    console.log("");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// src/index.js
var VERSION = "2.0.0";
async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));
  if (flags.version || flags.v) {
    printVersion(VERSION);
    process.exit(0);
  }
  if (flags.help || flags.h) {
    printHelp();
    process.exit(0);
  }
  try {
    switch (command) {
      case "search":
        await cmdSearch(args, flags);
        break;
      case "install":
      case "i":
      case "add":
        await cmdInstall(args, flags);
        break;
      case "run":
      case "exec":
        await cmdRun(args, flags);
        break;
      case "list":
      case "ls":
        await cmdList(args, flags);
        break;
      case "remove":
      case "rm":
      case "uninstall":
        await cmdRemove(args, flags);
        break;
      case "secrets":
      case "secret":
        await cmdSecrets(args, flags);
        break;
      case "db":
      case "database":
        await cmdDb(args, flags);
        break;
      case "import":
        await cmdImport(args, flags);
        break;
      case "doctor":
        await cmdDoctor(args, flags);
        break;
      case "init":
      case "bootstrap":
      case "setup":
        await cmdInit(args, flags);
        break;
      case "update":
      case "upgrade":
        await cmdUpdate(args, flags);
        break;
      case "logs":
        await handleLogsCommand(args, flags);
        break;
      case "which":
      case "info":
      case "show":
        await cmdWhich(args, flags);
        break;
      case "auth":
      case "authenticate":
      case "login":
        await cmdAuth(args, flags);
        break;
      case "mcp":
        await cmdMcp(args, flags);
        break;
      case "integrate":
        await cmdIntegrate(args, flags);
        break;
      case "migrate":
        await cmdMigrate(args, flags);
        break;
      case "index":
        await cmdIndex(args, flags);
        break;
      case "home":
        await cmdHome(args, flags);
        break;
      case "status":
        await cmdStatus(args, flags);
        break;
      case "check":
        await cmdCheck(args, flags);
        break;
      case "shims":
        await cmdShims(args, flags);
        break;
      case "pkg":
      case "package":
        await cmdInfo(args, flags);
        break;
      // Shortcuts for listing specific package types
      case "stacks":
        await cmdList(["stacks"], flags);
        break;
      case "prompts":
        await cmdList(["prompts"], flags);
        break;
      case "runtimes":
        await cmdList(["runtimes"], flags);
        break;
      case "binaries":
      case "bins":
      case "tools":
        await cmdList(["binaries"], flags);
        break;
      case "agents":
        await cmdList(["agents"], flags);
        break;
      case "help":
        printHelp(args[0]);
        break;
      case "version":
        printVersion(VERSION);
        break;
      default:
        if (!command) {
          printHelp();
        } else {
          console.error(`Unknown command: ${command}`);
          console.error(`Run 'rudi help' for usage`);
          process.exit(1);
        }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
main();
