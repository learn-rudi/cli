#!/usr/bin/env node
/**
 * Post-install script for @learnrudi/cli
 *
 * Fetches runtime manifests from registry and downloads:
 * 1. Node.js runtime → ~/.rudi/runtimes/node/
 * 2. Python runtime → ~/.rudi/runtimes/python/
 * 3. Creates shims → ~/.rudi/shims/
 * 4. Initializes rudi.json → ~/.rudi/rudi.json
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const RUDI_HOME = path.join(os.homedir(), '.rudi');
const RUDI_JSON_PATH = path.join(RUDI_HOME, 'rudi.json');
const RUDI_JSON_TMP = path.join(RUDI_HOME, 'rudi.json.tmp');
const REGISTRY_BASE = 'https://raw.githubusercontent.com/learn-rudi/registry/main';

// =============================================================================
// RUDI.JSON CONFIG MANAGEMENT
// =============================================================================

/**
 * Create a new empty RudiConfig
 */
function createRudiConfig() {
  const now = new Date().toISOString();
  return {
    version: '1.0.0',
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

/**
 * Read rudi.json
 */
function readRudiConfig() {
  try {
    const content = fs.readFileSync(RUDI_JSON_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    console.log(`  ⚠ Failed to read rudi.json: ${err.message}`);
    return null;
  }
}

/**
 * Write rudi.json atomically with secure permissions
 */
function writeRudiConfig(config) {
  config.updatedAt = new Date().toISOString();
  const content = JSON.stringify(config, null, 2);

  // Write to temp file
  fs.writeFileSync(RUDI_JSON_TMP, content, { mode: 0o600 });

  // Atomic rename
  fs.renameSync(RUDI_JSON_TMP, RUDI_JSON_PATH);

  // Ensure permissions (rename may not preserve them)
  fs.chmodSync(RUDI_JSON_PATH, 0o600);
}

/**
 * Initialize rudi.json if it doesn't exist
 */
function initRudiConfig() {
  if (fs.existsSync(RUDI_JSON_PATH)) {
    console.log(`  ✓ rudi.json already exists`);
    return readRudiConfig();
  }

  const config = createRudiConfig();
  writeRudiConfig(config);
  console.log(`  ✓ Created rudi.json`);
  return config;
}

/**
 * Update rudi.json with runtime info after successful download
 */
function updateRudiConfigRuntime(runtimeId, runtimePath, version) {
  const config = readRudiConfig() || createRudiConfig();
  const platform = process.platform;

  let bin;
  if (runtimeId === 'node') {
    bin = platform === 'win32' ? 'node.exe' : 'bin/node';
  } else if (runtimeId === 'python') {
    bin = platform === 'win32' ? 'python.exe' : 'bin/python3';
  } else {
    bin = runtimeId;
  }

  config.runtimes[runtimeId] = {
    path: runtimePath,
    bin: path.join(runtimePath, bin),
    version: version
  };

  writeRudiConfig(config);
}

/**
 * Update rudi.json with binary info after successful download
 */
function updateRudiConfigBinary(binaryName, binaryPath, version) {
  const config = readRudiConfig() || createRudiConfig();

  config.binaries[binaryName] = {
    path: binaryPath,
    bin: path.join(binaryPath, binaryName),
    version: version,
    installed: true,
    installedAt: new Date().toISOString()
  };

  writeRudiConfig(config);
}

/**
 * Mark rudi.json as fully installed
 */
function markRudiConfigInstalled() {
  const config = readRudiConfig() || createRudiConfig();
  config.installed = true;
  writeRudiConfig(config);
}

// Detect platform
function getPlatformArch() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  } else if (platform === 'linux') {
    return arch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  } else if (platform === 'win32') {
    return 'win32-x64';
  }
  return null;
}

// Create directory structure
function ensureDirectories() {
  const dirs = [
    RUDI_HOME,
    path.join(RUDI_HOME, 'runtimes'),
    path.join(RUDI_HOME, 'stacks'),
    path.join(RUDI_HOME, 'binaries'),
    path.join(RUDI_HOME, 'shims'),
    path.join(RUDI_HOME, 'cache'),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// Fetch JSON from URL
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

// Download and extract a tarball
async function downloadAndExtract(url, destDir, name) {
  const tempFile = path.join(RUDI_HOME, 'cache', `${name}.tar.gz`);

  console.log(`  Downloading ${name}...`);

  try {
    // Download using curl
    execSync(`curl -fsSL "${url}" -o "${tempFile}"`, { stdio: 'pipe' });

    // Create dest directory
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true });
    }
    fs.mkdirSync(destDir, { recursive: true });

    // Extract - strip first component to avoid nested dirs
    execSync(`tar -xzf "${tempFile}" -C "${destDir}" --strip-components=1`, { stdio: 'pipe' });

    // Clean up
    fs.unlinkSync(tempFile);

    console.log(`  ✓ ${name} installed`);
    return true;
  } catch (error) {
    console.log(`  ⚠ Failed to install ${name}: ${error.message}`);
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    return false;
  }
}

// Download runtime from manifest
async function downloadRuntime(runtimeId, platformArch) {
  const manifestUrl = `${REGISTRY_BASE}/catalog/runtimes/${runtimeId}.json`;

  try {
    const manifest = await fetchJson(manifestUrl);
    const downloadUrl = manifest.download?.[platformArch];

    if (!downloadUrl) {
      console.log(`  ⚠ No ${runtimeId} available for ${platformArch}`);
      return false;
    }

    const destDir = path.join(RUDI_HOME, 'runtimes', runtimeId);
    const binaryPath = path.join(destDir, manifest.binary || `bin/${runtimeId}`);

    // Skip if already installed
    if (fs.existsSync(binaryPath)) {
      console.log(`  ✓ ${manifest.name} already installed`);
      // Still update rudi.json in case it's missing this runtime
      updateRudiConfigRuntime(runtimeId, destDir, manifest.version);
      return true;
    }

    const success = await downloadAndExtract(downloadUrl, destDir, manifest.name);
    if (success) {
      // Update rudi.json with runtime info
      updateRudiConfigRuntime(runtimeId, destDir, manifest.version);
    }
    return success;
  } catch (error) {
    console.log(`  ⚠ Failed to fetch ${runtimeId} manifest: ${error.message}`);
    return false;
  }
}

// Create all shims
function createShims() {
  // Legacy shim for direct stack access: rudi-mcp <stack>
  const mcpShimPath = path.join(RUDI_HOME, 'shims', 'rudi-mcp');
  const mcpShimContent = `#!/bin/bash
# RUDI MCP Shim - Routes agent calls to rudi mcp command
# Usage: rudi-mcp <stack-name>
exec rudi mcp "$@"
`;
  fs.writeFileSync(mcpShimPath, mcpShimContent);
  fs.chmodSync(mcpShimPath, 0o755);
  console.log(`  ✓ Created rudi-mcp shim`);

  // New router shim: Master MCP server that aggregates all stacks
  const routerShimPath = path.join(RUDI_HOME, 'shims', 'rudi-router');
  const routerShimContent = `#!/bin/bash
# RUDI Router - Master MCP server for all installed stacks
# Reads ~/.rudi/rudi.json and proxies tool calls to correct stack
# Usage: Point agent config to this shim (no args needed)

RUDI_HOME="$HOME/.rudi"

# Use bundled Node if available
if [ -x "$RUDI_HOME/runtimes/node/bin/node" ]; then
  exec "$RUDI_HOME/runtimes/node/bin/node" "$RUDI_HOME/router/router-mcp.js" "$@"
else
  exec node "$RUDI_HOME/router/router-mcp.js" "$@"
fi
`;
  fs.writeFileSync(routerShimPath, routerShimContent);
  fs.chmodSync(routerShimPath, 0o755);
  console.log(`  ✓ Created rudi-router shim`);

  // Create router directory for the router-mcp.js file
  const routerDir = path.join(RUDI_HOME, 'router');
  if (!fs.existsSync(routerDir)) {
    fs.mkdirSync(routerDir, { recursive: true });
  }

  // Create package.json for ES module support
  const routerPackageJson = path.join(routerDir, 'package.json');
  fs.writeFileSync(routerPackageJson, JSON.stringify({
    name: 'rudi-router',
    type: 'module',
    private: true
  }, null, 2));

  // Copy router-mcp.js to ~/.rudi/router/
  copyRouterMcp();
}

/**
 * Copy router-mcp.js to ~/.rudi/router/
 * Looks for the file relative to this script's location
 */
function copyRouterMcp() {
  const routerDir = path.join(RUDI_HOME, 'router');
  const destPath = path.join(routerDir, 'router-mcp.js');

  // Try multiple possible source locations
  const possibleSources = [
    // When running from npm install (scripts dir)
    path.join(path.dirname(process.argv[1]), '..', 'src', 'router-mcp.js'),
    // When running from npm link or local dev
    path.join(path.dirname(process.argv[1]), '..', 'dist', 'router-mcp.js'),
    // Relative to this script
    path.resolve(import.meta.url.replace('file://', '').replace('/scripts/postinstall.js', ''), 'src', 'router-mcp.js'),
  ];

  for (const srcPath of possibleSources) {
    try {
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✓ Installed router-mcp.js`);
        return;
      }
    } catch {
      // Try next path
    }
  }

  // Create a minimal placeholder if source not found
  // This will be updated on next CLI update
  const placeholderContent = `#!/usr/bin/env node
// RUDI Router MCP Server - Placeholder
// This file should be replaced by the actual router-mcp.js from @learnrudi/cli
console.error('[rudi-router] Router not properly installed. Run: npm update -g @learnrudi/cli');
process.exit(1);
`;

  fs.writeFileSync(destPath, placeholderContent, { mode: 0o755 });
  console.log(`  ⚠ Created router placeholder (will be updated on next CLI install)`);
}

// Initialize secrets file with secure permissions
function initSecrets() {
  const secretsPath = path.join(RUDI_HOME, 'secrets.json');

  if (!fs.existsSync(secretsPath)) {
    fs.writeFileSync(secretsPath, '{}', { mode: 0o600 });
    console.log(`  ✓ Created secrets store`);
  }
}

// Initialize database
function initDatabase() {
  const dbPath = path.join(RUDI_HOME, 'rudi.db');

  if (fs.existsSync(dbPath)) {
    console.log(`  ✓ Database already exists`);
    return;
  }

  try {
    // Use rudi CLI to init the database (it has the schema)
    execSync('node -e "require(\'@learnrudi/db\').initSchema()"', {
      stdio: 'pipe',
      cwd: path.dirname(process.argv[1])
    });
    console.log(`  ✓ Database initialized`);
  } catch (error) {
    console.log(`  ⚠ Database init deferred (run 'rudi init' later)`);
  }
}

// Download a binary from manifest
async function downloadBinary(binaryName, platformArch) {
  const manifestUrl = `${REGISTRY_BASE}/catalog/binaries/${binaryName}.json`;

  try {
    const manifest = await fetchJson(manifestUrl);
    const upstream = manifest.upstream?.[platformArch];

    if (!upstream) {
      console.log(`  ⚠ No ${binaryName} available for ${platformArch}`);
      return false;
    }

    const destDir = path.join(RUDI_HOME, 'binaries', binaryName);
    const binaryPath = path.join(destDir, manifest.binary || binaryName);

    // Skip if already installed
    if (fs.existsSync(binaryPath)) {
      console.log(`  ✓ ${manifest.name || binaryName} already installed`);
      // Still update rudi.json in case it's missing this binary
      updateRudiConfigBinary(binaryName, destDir, manifest.version);
      return true;
    }

    const success = await downloadAndExtract(upstream, destDir, manifest.name || binaryName);
    if (success) {
      // Update rudi.json with binary info
      updateRudiConfigBinary(binaryName, destDir, manifest.version);
    }
    return success;
  } catch (error) {
    console.log(`  ⚠ Failed to fetch ${binaryName} manifest: ${error.message}`);
    return false;
  }
}

// Check if RUDI is already initialized (by Studio or previous install)
function isRudiInitialized() {
  const nodeBin = path.join(RUDI_HOME, 'runtimes', 'node', 'bin', 'node');
  const pythonBin = path.join(RUDI_HOME, 'runtimes', 'python', 'bin', 'python3');
  const db = path.join(RUDI_HOME, 'rudi.db');

  return fs.existsSync(nodeBin) &&
         fs.existsSync(pythonBin) &&
         fs.existsSync(db);
}

// Main setup
async function setup() {
  console.log('\nSetting up RUDI...\n');

  const platformArch = getPlatformArch();
  if (!platformArch) {
    console.log('⚠ Unsupported platform. Skipping runtime download.');
    console.log('  You can manually install runtimes later with: rudi install runtime:node\n');
    return;
  }

  // Check if already initialized (by Studio or previous install)
  if (isRudiInitialized()) {
    console.log('✓ RUDI already initialized');
    // Still init rudi.json in case it's missing (migration from older version)
    console.log('\nUpdating configuration...');
    initRudiConfig();
    // Ensure shims are up to date
    console.log('\nUpdating shims...');
    createShims();
    console.log('  Skipping runtime and binary downloads\n');
    console.log('Run `rudi doctor` to check system health\n');
    return;
  }

  // Create directories
  ensureDirectories();
  console.log('✓ Created ~/.rudi directory structure\n');

  // Initialize rudi.json (single source of truth)
  console.log('Initializing configuration...');
  initRudiConfig();

  // Download runtimes from registry manifests
  console.log('\nInstalling runtimes...');
  await downloadRuntime('node', platformArch);
  await downloadRuntime('python', platformArch);

  // Download essential binaries
  console.log('\nInstalling essential binaries...');
  await downloadBinary('sqlite', platformArch);
  await downloadBinary('ripgrep', platformArch);

  // Create shims (rudi-mcp for direct access, rudi-router for aggregated MCP)
  console.log('\nSetting up shims...');
  createShims();

  // Initialize secrets
  initSecrets();

  // Initialize database
  console.log('\nInitializing database...');
  initDatabase();

  // Mark config as fully installed
  markRudiConfigInstalled();

  console.log('\n✓ RUDI setup complete!\n');
  console.log('Get started:');
  console.log('  rudi search --all      # See available stacks');
  console.log('  rudi install slack     # Install a stack');
  console.log('  rudi doctor            # Check system health\n');
}

// Run
setup().catch(err => {
  console.error('Setup error:', err.message);
  // Don't fail npm install - user can run rudi doctor later
  process.exit(0);
});
