#!/usr/bin/env node
/**
 * Post-install script for @learnrudi/cli
 *
 * Fetches runtime manifests from registry and downloads:
 * 1. Node.js runtime → ~/.rudi/runtimes/node/
 * 2. Python runtime → ~/.rudi/runtimes/python/
 * 3. Creates shims → ~/.rudi/shims/
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const RUDI_HOME = path.join(os.homedir(), '.rudi');
const REGISTRY_BASE = 'https://raw.githubusercontent.com/learn-rudi/registry/main';

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
      return true;
    }

    return await downloadAndExtract(downloadUrl, destDir, manifest.name);
  } catch (error) {
    console.log(`  ⚠ Failed to fetch ${runtimeId} manifest: ${error.message}`);
    return false;
  }
}

// Create the rudi-mcp shim
function createShim() {
  const shimPath = path.join(RUDI_HOME, 'shims', 'rudi-mcp');

  const shimContent = `#!/bin/bash
# RUDI MCP Shim - Routes agent calls to rudi mcp command
# Usage: rudi-mcp <stack-name>
exec rudi mcp "$@"
`;

  fs.writeFileSync(shimPath, shimContent);
  fs.chmodSync(shimPath, 0o755);
  console.log(`  ✓ Created shim at ${shimPath}`);
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
      return true;
    }

    return await downloadAndExtract(upstream, destDir, manifest.name || binaryName);
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
    console.log('  Skipping runtime and binary downloads\n');
    console.log('Run `rudi doctor` to check system health\n');
    return;
  }

  // Create directories
  ensureDirectories();
  console.log('✓ Created ~/.rudi directory structure\n');

  // Download runtimes from registry manifests
  console.log('Installing runtimes...');
  await downloadRuntime('node', platformArch);
  await downloadRuntime('python', platformArch);

  // Download essential binaries
  console.log('\nInstalling essential binaries...');
  await downloadBinary('sqlite', platformArch);
  await downloadBinary('ripgrep', platformArch);

  // Create shim
  console.log('\nSetting up shims...');
  createShim();

  // Initialize secrets
  initSecrets();

  // Initialize database
  console.log('\nInitializing database...');
  initDatabase();

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
