/**
 * Install command - install packages from registry
 *
 * Checks manifest for all dependencies:
 * - Runtime (node, python, deno, bun)
 * - Binaries (ffmpeg, ripgrep, etc.)
 * - Secrets (API keys, tokens)
 *
 * Then installs and registers to all detected AI agents.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { installPackage, resolvePackage, checkAllDependencies, formatDependencyResults, addStack, updateSecretStatus } from '@learnrudi/core';
import { hasSecret, listSecrets, setSecret, getSecret } from '@learnrudi/secrets';
import { getInstalledAgents } from '@learnrudi/mcp';

/**
 * Load manifest from installed stack path
 */
async function loadManifest(installPath) {
  const manifestPath = path.join(installPath, 'manifest.json');
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Get path to bundled runtime binary
 */
function getBundledBinary(runtime, binary) {
  const platform = process.platform;
  const rudiHome = process.env.RUDI_HOME || path.join(process.env.HOME || process.env.USERPROFILE, '.rudi');

  if (runtime === 'node') {
    const npmPath = platform === 'win32'
      ? path.join(rudiHome, 'runtimes', 'node', 'npm.cmd')
      : path.join(rudiHome, 'runtimes', 'node', 'bin', 'npm');

    if (require('fs').existsSync(npmPath)) {
      return npmPath;
    }
  }

  if (runtime === 'python') {
    const pipPath = platform === 'win32'
      ? path.join(rudiHome, 'runtimes', 'python', 'Scripts', 'pip.exe')
      : path.join(rudiHome, 'runtimes', 'python', 'bin', 'pip3');

    if (require('fs').existsSync(pipPath)) {
      return pipPath;
    }
  }

  // Fall back to system command
  return binary;
}

/**
 * Install dependencies for a stack based on its runtime
 * Uses bundled runtimes from ~/.rudi/runtimes/ when available
 */
async function installDependencies(stackPath, manifest) {
  const runtime = manifest?.runtime || manifest?.mcp?.runtime || 'node';

  try {
    if (runtime === 'node') {
      // Check if package.json exists
      const packageJsonPath = path.join(stackPath, 'package.json');
      try {
        await fs.access(packageJsonPath);
      } catch {
        return { installed: false, reason: 'No package.json' };
      }

      // Check if node_modules already exists
      const nodeModulesPath = path.join(stackPath, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        return { installed: false, reason: 'Dependencies already installed' };
      } catch {
        // node_modules doesn't exist, install
      }

      // Use bundled npm if available
      const npmCmd = getBundledBinary('node', 'npm');
      console.log(`  Installing npm dependencies...`);
      execSync(`"${npmCmd}" install --production`, {
        cwd: stackPath,
        stdio: 'pipe',
      });
      return { installed: true };

    } else if (runtime === 'python') {
      // Check for requirements.txt (try python/ subdir first, then root)
      let requirementsPath = path.join(stackPath, 'python', 'requirements.txt');
      let reqCwd = path.join(stackPath, 'python');

      try {
        await fs.access(requirementsPath);
      } catch {
        // Fall back to root level
        requirementsPath = path.join(stackPath, 'requirements.txt');
        reqCwd = stackPath;
        try {
          await fs.access(requirementsPath);
        } catch {
          return { installed: false, reason: 'No requirements.txt' };
        }
      }

      // Use bundled pip if available
      const pipCmd = getBundledBinary('python', 'pip');
      console.log(`  Installing pip dependencies...`);
      try {
        execSync(`"${pipCmd}" install -r requirements.txt`, {
          cwd: reqCwd,
          stdio: 'pipe',
        });
      } catch (pipError) {
        // Show actual pip error output
        const stderr = pipError.stderr?.toString() || '';
        const stdout = pipError.stdout?.toString() || '';
        const output = stderr || stdout || pipError.message;
        return { installed: false, error: `pip install failed:\n${output}` };
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
  if (typeof secret === 'string') return secret;
  return secret.name || secret.key;
}

function getSecretDescription(secret) {
  if (typeof secret !== 'object' || !secret) return null;
  return secret.description || secret.label || null;
}

function getSecretLink(secret) {
  if (typeof secret !== 'object' || !secret) return null;
  return secret.link || secret.helpUrl || null;
}

function getSecretLabel(secret) {
  if (typeof secret !== 'object' || !secret) return null;
  return secret.label || secret.name || secret.key || null;
}

/**
 * Validate that a stack's entry point exists
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStackEntryPoint(stackPath, manifest) {
  // Get command from manifest
  let command = manifest.command;

  if (!command || command.length === 0) {
    // Try legacy mcp format
    if (manifest.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }

  if (!command || command.length === 0) {
    return { valid: false, error: 'No command defined in manifest' };
  }

  // Skip these - they're runtime commands or npx runners, not files
  const skipCommands = [
    'node', 'python', 'python3', 'npx', 'deno', 'bun',
    'tsx', 'ts-node', 'tsm', 'esno', 'esbuild-register', // TypeScript runners
    '-y', '--yes', // npx flags
  ];

  // Find file entry points (paths with extensions or containing /)
  const fileExtensions = ['.js', '.ts', '.mjs', '.cjs', '.py', '.mts', '.cts'];

  for (const arg of command) {
    if (skipCommands.includes(arg)) continue;
    if (arg.startsWith('-')) continue; // skip flags

    // Check if this looks like a file path (has extension or contains /)
    const looksLikeFile = fileExtensions.some(ext => arg.endsWith(ext)) || arg.includes('/');
    if (!looksLikeFile) continue;

    // This should be the entry point file
    const entryPath = require('path').join(stackPath, arg);
    if (!require('fs').existsSync(entryPath)) {
      return { valid: false, error: `Entry point not found: ${arg}` };
    }
    return { valid: true };
  }

  return { valid: true }; // No file args found, assume command is valid
}

/**
 * Check which secrets are available in RUDI's secrets store
 * @returns {Promise<{ found: string[], missing: string[] }>}
 */
async function checkSecrets(manifest) {
  const secrets = getManifestSecrets(manifest);

  const found = [];
  const missing = [];

  for (const secret of secrets) {
    const key = getSecretName(secret);
    const isRequired = typeof secret === 'object' ? secret.required !== false : true;

    const exists = await hasSecret(key);
    if (exists) {
      found.push(key);
    } else if (isRequired) {
      missing.push(key);
    }
  }

  return { found, missing };
}

/**
 * Parse .env.example as schema - extract required/optional keys
 * This is used to show what secrets are needed
 */
async function parseEnvExample(installPath) {
  const examplePath = path.join(installPath, '.env.example');
  try {
    const content = await fs.readFile(examplePath, 'utf-8');
    const keys = [];

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

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

export async function cmdInstall(args, flags) {
  const pkgId = args[0];

  if (!pkgId) {
    console.error('Usage: rudi install <package>');
    console.error('Example: rudi install slack');
    console.error('');
    console.error('After installing, run:');
    console.error('  rudi secrets set <KEY>    # Configure required secrets');
    console.error('  rudi integrate all        # Wire up your agents');
    process.exit(1);
  }

  const force = flags.force || false;
  const allowScripts = flags['allow-scripts'] || flags.allowScripts || false;

  console.log(`Resolving ${pkgId}...`);

  try {
    // First resolve to show what will be installed
    const resolved = await resolvePackage(pkgId);

    console.log(`\nPackage: ${resolved.name} (${resolved.id})`);
    console.log(`Version: ${resolved.version}`);
    if (resolved.description) {
      console.log(`Description: ${resolved.description}`);
    }

    if (resolved.installed && !force) {
      console.log(`\nAlready installed. Use --force to reinstall.`);
      return;
    }

    // Show dependencies
    if (resolved.dependencies?.length > 0) {
      console.log(`\nDependencies:`);
      for (const dep of resolved.dependencies) {
        const status = dep.installed ? '(installed)' : '(will install)';
        console.log(`  - ${dep.id} ${status}`);
      }
    }

    // Check ALL dependencies: runtimes, binaries, and secrets
    console.log(`\nDependency check:`);

    // 1. Check system dependencies (runtimes, binaries)
    const depCheck = checkAllDependencies(resolved);
    if (depCheck.results.length > 0) {
      for (const line of formatDependencyResults(depCheck.results)) {
        console.log(line);
      }
    }

    // 2. Check secrets from RUDI's secrets store
    const secretsCheck = { found: [], missing: [] };
    if (resolved.requires?.secrets?.length > 0) {
      for (const secret of resolved.requires.secrets) {
        const name = typeof secret === 'string' ? secret : secret.name;
        const isRequired = typeof secret === 'object' ? secret.required !== false : true;

        const exists = await hasSecret(name);
        if (exists) {
          secretsCheck.found.push(name);
          console.log(`  ✓ ${name} (from secrets store)`);
        } else if (isRequired) {
          secretsCheck.missing.push(name);
          console.log(`  ○ ${name} - not configured`);
        } else {
          console.log(`  ○ ${name} (optional)`);
        }
      }
    }

    // Block on missing system deps (not secrets - those can be added after)
    if (!depCheck.satisfied && !force) {
      console.error(`\n✗ Missing required dependencies. Install them first:`);
      for (const r of depCheck.results.filter(r => !r.available)) {
        console.error(`    rudi install ${r.type}:${r.name}`);
      }
      console.error(`\nOr use --force to install anyway.`);
      process.exit(1);
    }

    console.log(`\nInstalling...`);

    const result = await installPackage(pkgId, {
      force,
      allowScripts,
      onProgress: (progress) => {
        if (progress.phase === 'installing') {
          console.log(`  Installing ${progress.package}...`);
        }
      }
    });

    if (result.success) {
      console.log(`\n✓ Installed ${result.id}`);
      console.log(`  Path: ${result.path}`);

      if (result.installed?.length > 0) {
        console.log(`\n  Also installed:`);
        for (const id of result.installed) {
          console.log(`    - ${id}`);
        }
      }

      // For stacks: validate, install dependencies, check secrets, show next steps
      if (resolved.kind === 'stack') {
        const manifest = await loadManifest(result.path);
        if (manifest) {
          // Validate entry point exists
          const validation = validateStackEntryPoint(result.path, manifest);
          if (!validation.valid) {
            console.error(`\n✗ Stack validation failed: ${validation.error}`);
            console.error(`  The stack may be incomplete or misconfigured.`);
            process.exit(1);
          }

          // Install runtime dependencies (npm install, pip install, etc.)
          const depResult = await installDependencies(result.path, manifest);
          if (depResult.installed) {
            console.log(`  ✓ Dependencies installed`);
          } else if (depResult.error) {
            console.error(`\n✗ Failed to install dependencies:`);
            console.error(`  ${depResult.error}`);
            console.error(`\n  Stack installed but may not work. Fix dependencies and run:`);
            console.error(`  rudi install ${result.id}`);
            process.exit(1);
          }

          // Update rudi.json with stack info (for router-mcp)
          try {
            addStack(result.id, {
              path: result.path,
              runtime: manifest.runtime || manifest.mcp?.runtime || 'node',
              command: manifest.command || (manifest.mcp?.command ? [manifest.mcp.command, ...(manifest.mcp.args || [])] : null),
              secrets: getManifestSecrets(manifest),
              version: manifest.version
            });
            console.log(`  ✓ Updated rudi.json`);
          } catch (err) {
            console.log(`  ⚠ Failed to update rudi.json: ${err.message}`);
          }

          // Check secrets status
          const { found, missing } = await checkSecrets(manifest);

          // Also check .env.example for any keys not in manifest
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

          // Add placeholder entries to secrets.json for missing secrets
          // This makes it visible what needs to be configured
          if (missing.length > 0) {
            for (const key of missing) {
              const existing = await getSecret(key);
              if (existing === null) {
                // Add empty placeholder - hasSecret() will return false for empty strings
                await setSecret(key, '');
              }
              // Update rudi.json secrets metadata
              try {
                updateSecretStatus(key, false);
              } catch {
                // Ignore errors updating secret status
              }
            }
          }

          // Update rudi.json for found secrets
          for (const key of found) {
            try {
              updateSecretStatus(key, true);
            } catch {
              // Ignore errors updating secret status
            }
          }

          // Show next steps
          console.log(`\nNext steps:`);

          // 1. Secrets
          if (missing.length > 0) {
            console.log(`\n  1. Configure secrets (${missing.length} pending):`);
            for (const key of missing) {
              const secret = getManifestSecrets(manifest).find(s =>
                (typeof s === 'string' ? s : s.name) === key
              );
              const helpUrl = getSecretLink(secret);
              console.log(`     rudi secrets set ${key} "<your-value>"`);
              if (helpUrl) {
                console.log(`     # Get yours: ${helpUrl}`);
              }
            }
            console.log(`\n     Check status: rudi secrets list`);
          } else if (found.length > 0) {
            console.log(`\n  1. Secrets: ✓ ${found.length} configured`);
          } else {
            console.log(`\n  1. Secrets: ✓ None required`);
          }

          // 2. Integrate
          const agents = getInstalledAgents();
          if (agents.length > 0) {
            console.log(`\n  2. Wire up your agents:`);
            console.log(`     rudi integrate all`);
            console.log(`     # Detected: ${agents.map(a => a.name).join(', ')}`);
          }

          // 3. Done
          console.log(`\n  3. Restart your agent to use the stack`);
          return;
        }
      }

      console.log(`\n✓ Installed successfully.`);
    } else {
      console.error(`\n✗ Installation failed: ${result.error}`);
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
