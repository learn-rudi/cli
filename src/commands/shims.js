/**
 * Shims command - validate all shims in ~/.rudi/bins/
 *
 * Usage:
 *   rudi shims               List all shims
 *   rudi shims check         Validate all shims and report issues
 *   rudi shims fix           Attempt to fix broken shims
 *
 * Exit codes:
 *   0 = all shims valid
 *   1 = one or more shims have issues
 */

import { PATHS, validateShim } from '@learnrudi/core';
import fs from 'fs';
import path from 'path';

/**
 * List all shims in ~/.rudi/bins/
 */
function listShims() {
  const binsDir = PATHS.bins;

  if (!fs.existsSync(binsDir)) {
    return [];
  }

  const entries = fs.readdirSync(binsDir);
  return entries.filter(entry => {
    const fullPath = path.join(binsDir, entry);
    const stat = fs.lstatSync(fullPath);
    // Include files and symlinks, exclude directories
    return stat.isFile() || stat.isSymbolicLink();
  });
}

/**
 * Check shim type (wrapper or symlink)
 */
function getShimType(shimPath) {
  const stat = fs.lstatSync(shimPath);

  if (stat.isSymbolicLink()) {
    return 'symlink';
  }

  // Check if it's a wrapper script
  try {
    const content = fs.readFileSync(shimPath, 'utf8');
    if (content.includes('#!/usr/bin/env bash')) {
      return 'wrapper';
    }
  } catch (err) {
    // Unable to read
  }

  return 'unknown';
}

/**
 * Get shim target path
 */
function getShimTarget(name, shimPath, type) {
  if (type === 'symlink') {
    try {
      return fs.readlinkSync(shimPath);
    } catch (err) {
      return null;
    }
  }

  if (type === 'wrapper') {
    try {
      const content = fs.readFileSync(shimPath, 'utf8');
      const match = content.match(/exec "([^"]+)"/);
      return match ? match[1] : null;
    } catch (err) {
      return null;
    }
  }

  return null;
}

/**
 * Get package ID from shim path
 */
function getPackageFromShim(shimName, target) {
  if (!target) return null;

  // Extract from target path: ~/.rudi/binaries/uv/uv -> binary:uv
  const match = target.match(/\/(binaries|runtimes|agents)\/([^\/]+)/);
  if (match) {
    const [, kind, pkgName] = match;
    const kindMap = {
      'binaries': 'binary',
      'runtimes': 'runtime',
      'agents': 'agent'
    };
    return `${kindMap[kind]}:${pkgName}`;
  }

  // Check manifest files to find which package provides this shim
  const manifestDirs = [
    path.join(PATHS.binaries),
    path.join(PATHS.runtimes),
    path.join(PATHS.agents)
  ];

  for (const dir of manifestDirs) {
    if (!fs.existsSync(dir)) continue;

    const packages = fs.readdirSync(dir);
    for (const pkg of packages) {
      const manifestPath = path.join(dir, pkg, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const bins = manifest.bins || manifest.binaries || [manifest.name || pkg];
          if (bins.includes(shimName)) {
            const kind = dir.includes('binaries') ? 'binary' :
                        dir.includes('runtimes') ? 'runtime' : 'agent';
            return `${kind}:${pkg}`;
          }
        } catch (err) {
          // Skip invalid manifest
        }
      }
    }
  }

  return null;
}

/**
 * Format shim status for display
 */
function formatShimStatus(shim, flags) {
  const { name, valid, type, target, error, package: pkg } = shim;

  if (flags.json) {
    return JSON.stringify(shim, null, 2);
  }

  const icon = valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  const typeLabel = type === 'symlink' ? '→' : '⇒';

  let output = `${icon} ${name} ${typeLabel} ${target || '(no target)'}`;

  if (pkg) {
    output += ` \x1b[90m[${pkg}]\x1b[0m`;
  }

  if (!valid && error) {
    output += `\n  \x1b[31mError: ${error}\x1b[0m`;
  }

  return output;
}

/**
 * Main command handler
 */
export async function cmdShims(args, flags) {
  const subcommand = args[0] || 'list';

  if (!['list', 'check', 'fix'].includes(subcommand)) {
    console.error('Usage: rudi shims [list|check|fix]');
    process.exit(1);
  }

  const shimNames = listShims();

  if (shimNames.length === 0) {
    console.log('No shims found in ~/.rudi/bins/');
    process.exit(0);
  }

  // List mode - just show shim names
  if (subcommand === 'list' && !flags.verbose) {
    shimNames.forEach(name => console.log(name));
    process.exit(0);
  }

  // Check mode - validate all shims
  const results = [];
  let hasIssues = false;

  for (const name of shimNames) {
    const shimPath = path.join(PATHS.bins, name);
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

  // Output results
  if (flags.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\nShims in ~/.rudi/bins/ (${results.length} total):\n`);

    if (flags.verbose || subcommand === 'check') {
      results.forEach(result => {
        console.log(formatShimStatus(result, flags));
      });
    } else {
      results.forEach(result => {
        const icon = result.valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
        console.log(`${icon} ${result.name}`);
      });
    }

    // Summary
    const valid = results.filter(r => r.valid).length;
    const broken = results.filter(r => !r.valid).length;

    console.log(`\n${valid} valid, ${broken} broken`);

    if (hasIssues) {
      console.log('\n\x1b[33mTo fix broken shims, reinstall the affected packages:\x1b[0m');
      const brokenPackages = new Set();
      results.forEach(r => {
        if (!r.valid && r.package) {
          brokenPackages.add(r.package);
        }
      });
      brokenPackages.forEach(pkg => {
        console.log(`  rudi install ${pkg} --force`);
      });
    }
  }

  // Fix mode
  if (subcommand === 'fix') {
    console.log('\n\x1b[33mAttempting to fix broken shims...\x1b[0m\n');

    const brokenWithPkg = results.filter(r => !r.valid && r.package);
    const orphaned = results.filter(r => !r.valid && !r.package);

    // Remove orphaned shims (no associated package)
    if (orphaned.length > 0) {
      console.log(`Removing ${orphaned.length} orphaned shims...`);
      for (const shim of orphaned) {
        const shimPath = path.join(PATHS.bins, shim.name);
        try {
          fs.unlinkSync(shimPath);
          console.log(`  \x1b[32m✓\x1b[0m Removed ${shim.name}`);
        } catch (err) {
          console.log(`  \x1b[31m✗\x1b[0m Failed to remove ${shim.name}: ${err.message}`);
        }
      }
      console.log('');
    }

    // Reinstall broken packages
    const brokenPackages = new Set(brokenWithPkg.map(r => r.package));

    if (brokenPackages.size === 0 && orphaned.length === 0) {
      console.log('No broken shims to fix.');
      process.exit(0);
    }

    if (brokenPackages.size > 0) {
      const { installPackage } = await import('@learnrudi/core');

      for (const pkg of brokenPackages) {
        console.log(`Reinstalling ${pkg}...`);
        try {
          await installPackage(pkg, { force: true });
          console.log(`\x1b[32m✓\x1b[0m Fixed ${pkg}`);
        } catch (err) {
          console.log(`\x1b[31m✗\x1b[0m Failed to fix ${pkg}: ${err.message}`);
        }
      }
    }

    console.log('\n\x1b[32m✓\x1b[0m Fix complete');
  }

  process.exit(hasIssues ? 1 : 0);
}
