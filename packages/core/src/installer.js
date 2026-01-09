/**
 * Package installer for RUDI
 * Downloads, extracts, and installs packages
 */

import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { createGunzip } from 'zlib';
import { PATHS, getPackagePath, ensureDirectories, parsePackageId } from '@learnrudi/env';
import { downloadRuntime, downloadPackage, downloadTool } from '@learnrudi/registry-client';
import { resolvePackage, getInstallOrder } from './resolver.js';
import { writeLockfile } from './lockfile.js';
import { createShimsForTool, removeShims } from './shims.js';

/**
 * Auto-discover binaries from installed npm package
 * Reads package.json bin field after npm install completes
 * @param {string} installPath - Installation directory
 * @param {string} packageName - npm package name
 * @returns {string[]} Array of discovered bin names
 */
function discoverNpmBins(installPath, packageName) {
  try {
    const pkgJsonPath = path.join(installPath, 'node_modules', packageName, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) {
      console.warn(`[Installer] Warning: Could not find package.json at ${pkgJsonPath}`);
      return [];
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const bins = [];

    if (typeof pkgJson.bin === 'string') {
      // Single binary - use package name (minus scope)
      const binName = packageName.split('/').pop();
      bins.push(binName);
    } else if (typeof pkgJson.bin === 'object' && pkgJson.bin !== null) {
      // Multiple binaries - use all keys
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

/**
 * Check if package defines install scripts
 * @param {string} installPath - Installation directory
 * @param {string} packageName - npm package name
 * @returns {boolean} True if package has install scripts
 */
function hasInstallScripts(installPath, packageName) {
  try {
    const pkgJsonPath = path.join(installPath, 'node_modules', packageName, 'package.json');

    if (!fs.existsSync(pkgJsonPath)) {
      return false;
    }

    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    const scripts = pkgJson.scripts || {};

    // Check for common install-time scripts
    const installScriptKeys = ['preinstall', 'install', 'postinstall', 'prepare'];
    return installScriptKeys.some(key => scripts[key]);
  } catch (error) {
    return false;
  }
}

/**
 * @typedef {Object} InstallResult
 * @property {boolean} success
 * @property {string} id - Package ID
 * @property {string} path - Install path
 * @property {string} [error] - Error message if failed
 */

/**
 * Install a package and its dependencies
 * @param {string} id - Package ID
 * @param {Object} options
 * @param {boolean} [options.force] - Force reinstall
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<InstallResult>}
 */
export async function installPackage(id, options = {}) {
  const { force = false, allowScripts = false, onProgress } = options;

  // Ensure directories exist
  ensureDirectories();

  // Resolve package and dependencies
  onProgress?.({ phase: 'resolving', package: id });
  const resolved = await resolvePackage(id);

  // Get install order (dependencies first)
  let toInstall = getInstallOrder(resolved);

  // If already installed and not forcing, skip
  if (toInstall.length === 0 && !force) {
    return {
      success: true,
      id: resolved.id,
      path: getPackagePath(resolved.id),
      alreadyInstalled: true
    };
  }

  // If forcing reinstall, add the main package if not already in list
  if (force && !toInstall.find(p => p.id === resolved.id)) {
    toInstall.push(resolved);
  }

  // Install each package in order
  const results = [];
  for (const pkg of toInstall) {
    onProgress?.({ phase: 'installing', package: pkg.id, total: toInstall.length, current: results.length + 1 });

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

  // Write lockfile
  onProgress?.({ phase: 'lockfile', package: resolved.id });
  await writeLockfile(resolved);

  return {
    success: true,
    id: resolved.id,
    path: getPackagePath(resolved.id),
    installed: results.map(r => r.id)
  };
}

/**
 * Install a single package (without dependencies)
 * @param {Object} pkg - Resolved package info
 * @param {Object} options
 * @returns {Promise<InstallResult>}
 */
async function installSinglePackage(pkg, options = {}) {
  const { force = false, allowScripts = false, onProgress } = options;
  const installPath = getPackagePath(pkg.id);

  // Check if already installed
  if (fs.existsSync(installPath) && !force) {
    return { success: true, id: pkg.id, path: installPath, skipped: true };
  }

  // Handle runtimes, binaries, agents - download from GitHub releases or install via npm
  if (pkg.kind === 'runtime' || pkg.kind === 'binary' || pkg.kind === 'agent') {
    const pkgName = pkg.id.replace(/^(runtime|binary|agent):/, '');

    onProgress?.({ phase: 'downloading', package: pkg.id });

    // Handle npm-based packages (agents, cloud CLIs)
    if (pkg.npmPackage) {
      try {
        const { execSync } = await import('child_process');

        if (!fs.existsSync(installPath)) {
          fs.mkdirSync(installPath, { recursive: true });
        }

        onProgress?.({ phase: 'installing', package: pkg.id, message: `npm install ${pkg.npmPackage}` });

        // Use bundled Node's npm if RESOURCES_PATH is set (running from Studio)
        // Otherwise fall back to system npm (CLI standalone use)
        const resourcesPath = process.env.RESOURCES_PATH;
        const npmCmd = resourcesPath
          ? path.join(resourcesPath, 'bundled-runtimes', 'node', 'bin', 'npm')
          : 'npm';

        // Initialize package.json if needed
        if (!fs.existsSync(path.join(installPath, 'package.json'))) {
          execSync(`"${npmCmd}" init -y`, { cwd: installPath, stdio: 'pipe' });
        }

        // Install the npm package with safety flags
        // --ignore-scripts: prevent arbitrary code execution during install (safer default)
        // --no-audit --no-fund: reduce noise
        const shouldIgnoreScripts = pkg.source?.type === 'npm' && !allowScripts;
        const installFlags = shouldIgnoreScripts
          ? '--ignore-scripts --no-audit --no-fund'  // Dynamic npm: safer default
          : '--no-audit --no-fund';  // Curated or --allow-scripts: run scripts

        execSync(`"${npmCmd}" install ${pkg.npmPackage} ${installFlags}`, { cwd: installPath, stdio: 'pipe' });

        // Auto-discover bins if not specified (dynamic npm installs)
        let bins = pkg.bins;
        if (!bins || bins.length === 0) {
          bins = discoverNpmBins(installPath, pkg.npmPackage);
          console.log(`[Installer] Discovered binaries: ${bins.join(', ') || '(none)'}`);
        }

        // Get actual installed version
        let installedVersion = pkg.version || 'latest';
        try {
          const pkgJsonPath = path.join(installPath, 'node_modules', pkg.npmPackage, 'package.json');
          if (fs.existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            installedVersion = pkgJson.version;
          }
        } catch (err) {
          // Use fallback version
        }

        // Run postInstall if specified
        if (pkg.postInstall) {
          onProgress?.({ phase: 'postInstall', package: pkg.id, message: pkg.postInstall });
          // Replace 'npx <cmd>' with direct node_modules/.bin/<cmd> path for reliability
          const postInstallCmd = pkg.postInstall.replace(
            /^npx\s+(\S+)/,
            `"${path.join(installPath, 'node_modules', '.bin', '$1')}"`
          );
          execSync(postInstallCmd, { cwd: installPath, stdio: 'pipe' });
        }

        // Check if package has install scripts
        const scriptsDetected = hasInstallScripts(installPath, pkg.npmPackage);
        const scriptsPolicy = installFlags.includes('--ignore-scripts') ? 'ignore' : 'allow';

        // Warn if scripts were skipped
        if (scriptsDetected && scriptsPolicy === 'ignore') {
          console.warn(`\n⚠️  This package defines install scripts that were skipped for security.`);
          console.warn(`   If the CLI fails to run, reinstall with:`);
          console.warn(`   rudi install ${pkg.id} --allow-scripts\n`);
        }

        // Write package metadata
        const manifest = {
          id: pkg.id,
          kind: pkg.kind,
          name: pkgName,
          version: installedVersion,
          npmPackage: pkg.npmPackage,
          bins: bins,
          hasInstallScripts: scriptsDetected,
          scriptsPolicy: scriptsPolicy,
          postInstall: pkg.postInstall,
          installedAt: new Date().toISOString(),
          source: pkg.source || { type: 'npm' }
        };

        fs.writeFileSync(
          path.join(installPath, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        // Create shims for discovered/specified bins
        if (bins && bins.length > 0) {
          await createShimsForTool({
            id: pkg.id,
            installType: 'npm',
            installDir: installPath,
            bins: bins,
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

    // Handle pip-based packages (aider, etc.)
    if (pkg.pipPackage) {
      try {
        if (!fs.existsSync(installPath)) {
          fs.mkdirSync(installPath, { recursive: true });
        }

        onProgress?.({ phase: 'installing', package: pkg.id, message: `Installing ${pkg.pipPackage}...` });

        // Use uv if available (10-100x faster), fallback to pip
        const { usedUv } = await installPythonPackage(installPath, pkg.pipPackage, (p) => {
          onProgress?.({ ...p, package: pkg.id });
        });

        // Write package metadata
        const manifest = {
          id: pkg.id,
          kind: pkg.kind,
          name: pkgName,
          version: pkg.version || 'latest',
          pipPackage: pkg.pipPackage,
          installedAt: new Date().toISOString(),
          source: usedUv ? 'uv' : 'pip',
          venvPath: path.join(installPath, 'venv')
        };

        fs.writeFileSync(
          path.join(installPath, 'manifest.json'),
          JSON.stringify(manifest, null, 2)
        );

        // Create shims for pip package
        await createShimsForTool({
          id: pkg.id,
          installType: 'pip',
          installDir: installPath,
          bins: pkg.bins || [pkgName],
          name: pkgName
        });

        return { success: true, id: pkg.id, path: installPath };
      } catch (error) {
        throw new Error(`Failed to install ${pkg.pipPackage}: ${error.message}`);
      }
    }

    // Handle binary packages - binaries use upstream URLs, runtimes use GitHub releases
    const version = pkg.version?.replace(/\.x$/, '.0') || '1.0.0';

    try {
      if (pkg.kind === 'binary') {
        // Binaries: use upstream URLs from binary manifests (e.g., evermeet.cx for ffmpeg)
        await downloadTool(pkgName, installPath, {
          onProgress: (p) => onProgress?.({ ...p, package: pkg.id })
        });

        // Read the manifest written by downloadTool
        const manifestPath = path.join(installPath, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Create shims for binary (support both 'bins' and 'binaries' for backward compat)
        await createShimsForTool({
          id: pkg.id,
          installType: 'binary',
          installDir: installPath,
          bins: manifest.bins || manifest.binaries || pkg.bins || [pkgName],
          name: pkgName
        });
      } else {
        // Runtimes and agents: use GitHub releases
        await downloadRuntime(pkgName, version, installPath, {
          onProgress: (p) => onProgress?.({ ...p, package: pkg.id })
        });
      }
      return { success: true, id: pkg.id, path: installPath };
    } catch (error) {
      // If download fails, create placeholder (for development/testing)
      console.warn(`Package download failed: ${error.message}`);
      console.warn(`Creating placeholder for ${pkg.id}`);

      if (!fs.existsSync(installPath)) {
        fs.mkdirSync(installPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(installPath, 'manifest.json'),
        JSON.stringify({
          id: pkg.id,
          kind: pkg.kind,
          name: pkg.name,
          version: pkg.version,
          installedAt: new Date().toISOString(),
          source: 'placeholder',
          error: error.message
        }, null, 2)
      );
      return { success: true, id: pkg.id, path: installPath, placeholder: true };
    }
  }

  // Handle stacks/prompts - download from registry or local
  if (pkg.path) {
    onProgress?.({ phase: 'downloading', package: pkg.id });
    try {
      await downloadPackage(pkg, installPath, { onProgress });

      // Prompts are single .md files, no manifest.json needed
      if (pkg.kind !== 'prompt') {
        // Only write manifest.json if one wasn't downloaded from registry
        const manifestPath = path.join(installPath, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
          // Write minimal manifest as fallback
          fs.writeFileSync(
            manifestPath,
            JSON.stringify({
              id: pkg.id,
              kind: pkg.kind,
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              runtime: pkg.runtime,
              entry: pkg.entry || 'create_pdf.py',  // default entry point
              requires: pkg.requires,
              installedAt: new Date().toISOString(),
              source: 'registry'
            }, null, 2)
          );
        }

        // Install dependencies for stacks with node or python runtime
        if (pkg.kind === 'stack') {
          onProgress?.({ phase: 'installing-deps', package: pkg.id });
          await installStackDependencies(installPath, onProgress);
        }
      }

      onProgress?.({ phase: 'installed', package: pkg.id });
      return { success: true, id: pkg.id, path: installPath };
    } catch (error) {
      throw new Error(`Failed to install ${pkg.id}: ${error.message}`);
    }
  }

  // Fallback: create placeholder
  // For prompts, we can't create a placeholder - they must come from registry
  if (pkg.kind === 'prompt') {
    throw new Error(`Prompt ${pkg.id} not found in registry`);
  }

  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true });
  }
  fs.mkdirSync(installPath, { recursive: true });

  const manifest = {
    id: pkg.id,
    kind: pkg.kind,
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    installedAt: new Date().toISOString(),
    source: 'registry'
  };

  fs.writeFileSync(
    path.join(installPath, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  onProgress?.({ phase: 'installed', package: pkg.id });

  return { success: true, id: pkg.id, path: installPath };
}

/**
 * Uninstall a package
 * @param {string} id - Package ID
 * @returns {Promise<{ success: boolean, error?: string, removedShims?: string[] }>}
 */
export async function uninstallPackage(id) {
  const installPath = getPackagePath(id);
  const [kind, name] = parsePackageId(id);

  if (!fs.existsSync(installPath)) {
    return { success: false, error: `Package not installed: ${id}` };
  }

  try {
    // Read manifest to get bins list for shim cleanup
    let bins = [];
    if (kind !== 'prompt') {
      const manifestPath = path.join(installPath, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          bins = manifest.bins || manifest.binaries || [];
        } catch {
          // Fallback: use package name as bin
          bins = [name];
        }
      }
    }

    // Remove shims BEFORE deleting the package directory
    if (bins.length > 0) {
      removeShims(bins);
    }

    // Prompts are single files, not directories
    if (kind === 'prompt') {
      fs.unlinkSync(installPath);
    } else {
      fs.rmSync(installPath, { recursive: true });
    }

    // Remove lockfile (handle both direct name and sanitized npm names)
    const lockDir = kind === 'binary' ? 'binaries' : kind === 'npm' ? 'npms' : kind + 's';
    const lockName = name.replace(/\//g, '__').replace(/^@/, '');
    const lockPath = path.join(PATHS.locks, lockDir, `${lockName}.lock.yaml`);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }

    return { success: true, removedShims: bins };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Install from a local directory
 * @param {string} dir - Directory containing the package
 * @param {Object} options
 * @returns {Promise<InstallResult>}
 */
export async function installFromLocal(dir, options = {}) {
  ensureDirectories();

  // Read manifest
  const manifestPath = path.join(dir, 'stack.yaml') || path.join(dir, 'manifest.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No manifest found in ${dir}`);
  }

  // Parse manifest (simplified for now)
  const { parse: parseYaml } = await import('yaml');
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = parseYaml(manifestContent);

  // Ensure ID has prefix
  const id = manifest.id.includes(':') ? manifest.id : `stack:${manifest.id}`;
  const installPath = getPackagePath(id);

  // Copy to install location
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true });
  }

  await copyDirectory(dir, installPath);

  // Write install metadata
  const meta = {
    id,
    kind: 'stack',
    name: manifest.name,
    version: manifest.version,
    installedAt: new Date().toISOString(),
    source: 'local',
    sourcePath: dir
  };

  fs.writeFileSync(
    path.join(installPath, '.install-meta.json'),
    JSON.stringify(meta, null, 2)
  );

  return { success: true, id, path: installPath };
}

/**
 * Copy a directory recursively
 */
async function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        await copyDirectory(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * List all installed packages
 * @param {'stack' | 'prompt' | 'runtime' | 'binary' | 'agent'} [kind] - Filter by kind
 * @returns {Promise<Array>}
 */
export async function listInstalled(kind) {
  const kinds = kind ? [kind] : ['stack', 'prompt', 'runtime', 'binary', 'agent'];
  const packages = [];

  for (const k of kinds) {
    const dir = {
      stack: PATHS.stacks,
      prompt: PATHS.prompts,
      runtime: PATHS.runtimes,
      binary: PATHS.binaries,
      agent: PATHS.agents
    }[k];

    if (!dir || !fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Prompts are .md files, not directories
    if (k === 'prompt') {
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name.startsWith('.')) continue;

        const filePath = path.join(dir, entry.name);
        const name = entry.name.replace(/\.md$/, '');

        // Read prompt file to extract frontmatter metadata
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

          let metadata = {};
          if (frontmatterMatch) {
            // Simple YAML parsing for common fields
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

            // Parse tags (YAML list format)
            const tagsSection = yaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);
            if (tagsSection) {
              metadata.tags = tagsSection[1]
                .split('\n')
                .map(line => line.replace(/^\s+-\s+/, '').trim())
                .filter(Boolean);
            }
          }

          packages.push({
            id: `prompt:${name}`,
            kind: 'prompt',
            name: metadata.name || name,
            version: metadata.version || '1.0.0',
            description: metadata.description || `${name} prompt`,
            category: metadata.category || 'general',
            tags: metadata.tags || [],
            icon: metadata.icon || '',
            path: filePath
          });
        } catch {
          // If we can't read the file, still list it
          packages.push({
            id: `prompt:${name}`,
            kind: 'prompt',
            name: name,
            version: '1.0.0',
            description: `${name} prompt`,
            category: 'general',
            tags: [],
            path: filePath
          });
        }
      }
      continue;
    }

    // Other packages are directories
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

      const pkgDir = path.join(dir, entry.name);

      // Check for manifest.json or runtime.json
      const manifestPath = path.join(pkgDir, 'manifest.json');
      const runtimePath = path.join(pkgDir, 'runtime.json');

      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        packages.push({ ...manifest, kind: k, path: pkgDir });
      } else if (fs.existsSync(runtimePath)) {
        // Older format - has runtime.json
        const runtimeMeta = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
        packages.push({
          id: `${k}:${entry.name}`,
          kind: k,
          name: entry.name,
          version: runtimeMeta.version || 'unknown',
          description: `${entry.name} ${k}`,
          installedAt: runtimeMeta.downloadedAt || runtimeMeta.installedAt,
          path: pkgDir
        });
      }
    }
  }

  return packages;
}

/**
 * Update a package to the latest version
 * @param {string} id - Package ID
 * @returns {Promise<InstallResult>}
 */
export async function updatePackage(id) {
  // Force reinstall
  return installPackage(id, { force: true });
}

/**
 * Update all installed packages
 * @param {Object} options
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<InstallResult[]>}
 */
export async function updateAll(options = {}) {
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

/**
 * Install dependencies for a stack (npm install for node, pip install for python)
 * @param {string} stackPath - Path to the installed stack
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<void>}
 */
async function installStackDependencies(stackPath, onProgress) {
  const { execSync } = await import('child_process');

  // Check for node runtime
  const nodePath = path.join(stackPath, 'node');
  if (fs.existsSync(nodePath)) {
    const packageJsonPath = path.join(nodePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      onProgress?.({ phase: 'installing-deps', message: 'Installing Node.js dependencies...' });
      try {
        // Find npm executable (bundled from Studio, or system npm)
        const npmCmd = await findNpmExecutable();
        execSync(`"${npmCmd}" install`, { cwd: nodePath, stdio: 'pipe' });
      } catch (error) {
        console.warn(`Warning: Failed to install Node.js dependencies: ${error.message}`);
        // Don't fail installation if deps fail - stack may still work
      }
    }
  }

  // Check for python runtime
  const pythonPath = path.join(stackPath, 'python');
  if (fs.existsSync(pythonPath)) {
    const requirementsPath = path.join(pythonPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        // Use uv if available (10-100x faster), fallback to pip
        await installPythonRequirements(pythonPath, onProgress);
      } catch (error) {
        console.warn(`Warning: Failed to install Python dependencies: ${error.message}`);
        // Don't fail installation if deps fail - stack may still work
      }
    }
  }
}

/**
 * Find npm executable - prioritize bundled from Studio, fallback to system
 * Matches Studio's RuntimeController.getArchPath() pattern
 * @returns {Promise<string>} Path to npm executable
 */
async function findNpmExecutable() {
  const isWindows = process.platform === 'win32';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const binDir = isWindows ? '' : 'bin';
  const exe = isWindows ? 'npm.cmd' : 'npm';

  // Try bundled npm from Studio (in ~/.prompt/runtimes/node/)
  const bundledNodeBase = path.join(PATHS.runtimes, 'node');

  // Try architecture-specific path first (e.g., node/arm64/bin/npm)
  const archSpecificNpm = path.join(bundledNodeBase, arch, binDir, exe);

  if (fs.existsSync(archSpecificNpm)) {
    return archSpecificNpm;
  }

  // Try flat structure (e.g., node/bin/npm) for backwards compatibility
  const flatNpm = path.join(bundledNodeBase, binDir, exe);

  if (fs.existsSync(flatNpm)) {
    return flatNpm;
  }

  // Fallback to system npm (for CLI users who installed via npm)
  return 'npm';
}

/**
 * Find python executable - prioritize bundled from Studio, fallback to system
 * Matches Studio's RuntimeController.getArchPath() pattern
 * @returns {Promise<string>} Path to python executable
 */
async function findPythonExecutable() {
  const isWindows = process.platform === 'win32';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const binDir = isWindows ? '' : 'bin';
  const exe = isWindows ? 'python.exe' : 'python3';

  // Try bundled python from Studio (in ~/.prompt/runtimes/python/)
  const bundledPythonBase = path.join(PATHS.runtimes, 'python');

  // Try architecture-specific path first (e.g., python/arm64/bin/python3)
  const archSpecificPython = path.join(bundledPythonBase, arch, binDir, exe);

  if (fs.existsSync(archSpecificPython)) {
    return archSpecificPython;
  }

  // Try flat structure (e.g., python/bin/python3) for backwards compatibility
  const flatPython = path.join(bundledPythonBase, binDir, exe);

  if (fs.existsSync(flatPython)) {
    return flatPython;
  }

  // Fallback to system python3
  return 'python3';
}

/**
 * Find uv executable - check if uv is installed in binaries
 * @returns {string|null} Path to uv executable, or null if not found
 */
export function findUvExecutable() {
  const isWindows = process.platform === 'win32';
  const exe = isWindows ? 'uv.exe' : 'uv';

  // Check in ~/.rudi/binaries/uv/
  const uvPath = path.join(PATHS.binaries, 'uv', exe);
  if (fs.existsSync(uvPath)) {
    return uvPath;
  }

  // Check if uv is in system PATH
  try {
    const { execSync } = require('child_process');
    execSync('uv --version', { stdio: 'pipe' });
    return 'uv';
  } catch {
    return null;
  }
}

/**
 * Ensure uv is installed - auto-install if not present
 * Call this before first Python package installation for faster installs
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<string|null>} Path to uv executable, or null if installation failed
 */
export async function ensureUv(onProgress) {
  // Check if already available
  const existing = findUvExecutable();
  if (existing) {
    return existing;
  }

  // Auto-install uv
  onProgress?.({ phase: 'installing', message: 'Installing uv for faster Python package management...' });

  try {
    const result = await installPackage('binary:uv', { onProgress });
    if (result.success) {
      return findUvExecutable();
    }
  } catch (error) {
    console.warn(`Warning: Failed to install uv: ${error.message}`);
    console.warn('Falling back to pip for Python package installation.');
  }

  return null;
}

/**
 * Install Python package using uv (fast) or pip (fallback)
 * @param {string} installPath - Directory to install into
 * @param {string} pipPackage - Package name to install
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<{ usedUv: boolean }>}
 */
async function installPythonPackage(installPath, pipPackage, onProgress) {
  const { execSync } = await import('child_process');
  const uvCmd = findUvExecutable();

  if (uvCmd) {
    // Use uv - 10-100x faster than pip
    onProgress?.({ phase: 'installing', message: `uv pip install ${pipPackage}` });

    // Create venv with uv
    execSync(`"${uvCmd}" venv "${installPath}/venv"`, { stdio: 'pipe' });

    // Install package with uv
    execSync(`"${uvCmd}" pip install --python "${installPath}/venv/bin/python" ${pipPackage}`, { stdio: 'pipe' });

    return { usedUv: true };
  } else {
    // Fallback to pip
    onProgress?.({ phase: 'installing', message: `pip install ${pipPackage}` });

    const pythonCmd = await findPythonExecutable();

    // Create venv with python
    execSync(`"${pythonCmd}" -m venv "${installPath}/venv"`, { stdio: 'pipe' });

    // Install package with pip
    execSync(`"${installPath}/venv/bin/pip" install ${pipPackage}`, { stdio: 'pipe' });

    return { usedUv: false };
  }
}

/**
 * Install Python requirements using uv (fast) or pip (fallback)
 * @param {string} pythonPath - Directory containing requirements.txt
 * @param {Function} [onProgress] - Progress callback
 * @returns {Promise<{ usedUv: boolean }>}
 */
async function installPythonRequirements(pythonPath, onProgress) {
  const { execSync } = await import('child_process');
  const uvCmd = findUvExecutable();
  const isWindows = process.platform === 'win32';
  const venvPython = isWindows
    ? path.join(pythonPath, 'venv', 'Scripts', 'python.exe')
    : path.join(pythonPath, 'venv', 'bin', 'python');

  if (uvCmd) {
    // Use uv - 10-100x faster than pip
    onProgress?.({ phase: 'installing-deps', message: 'Installing Python dependencies with uv...' });

    // Create venv with uv
    execSync(`"${uvCmd}" venv "${pythonPath}/venv"`, { cwd: pythonPath, stdio: 'pipe' });

    // Install requirements with uv
    execSync(`"${uvCmd}" pip install --python "${venvPython}" -r requirements.txt`, { cwd: pythonPath, stdio: 'pipe' });

    return { usedUv: true };
  } else {
    // Fallback to pip
    onProgress?.({ phase: 'installing-deps', message: 'Installing Python dependencies...' });

    const pythonCmd = await findPythonExecutable();

    // Create venv with python
    execSync(`"${pythonCmd}" -m venv venv`, { cwd: pythonPath, stdio: 'pipe' });

    // Install requirements with pip
    const pipCmd = isWindows ? '.\\venv\\Scripts\\pip' : './venv/bin/pip';
    execSync(`${pipCmd} install -r requirements.txt`, { cwd: pythonPath, stdio: 'pipe' });

    return { usedUv: false };
  }
}
