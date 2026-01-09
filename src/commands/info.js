/**
 * Info command - show detailed information about an installed package
 *
 * Usage: rudi info <package>
 *
 * Shows:
 * - Install type, version, install directory
 * - Binaries and their shim targets
 * - Scripts policy and hasInstallScripts
 * - Source manifest path/url for curated tools
 */

import fs from 'fs';
import path from 'path';
import { getPackagePath, parsePackageId, PATHS } from '@learnrudi/env';
import { getShimOwner, validateShim } from '@learnrudi/core';

export async function cmdInfo(args, flags) {
  const pkgId = args[0];

  if (!pkgId) {
    console.error('Usage: rudi info <package>');
    console.error('Example: rudi info npm:typescript');
    console.error('         rudi info binary:supabase');
    process.exit(1);
  }

  try {
    const [kind, name] = parsePackageId(pkgId);
    const installPath = getPackagePath(pkgId);

    if (!fs.existsSync(installPath)) {
      console.error(`Package not installed: ${pkgId}`);
      process.exit(1);
    }

    // Read manifest
    const manifestPath = path.join(installPath, 'manifest.json');
    let manifest = null;
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        console.warn('Warning: Could not parse manifest.json');
      }
    }

    console.log(`\nPackage: ${pkgId}`);
    console.log('─'.repeat(50));

    // Basic info
    console.log(`  Name:        ${manifest?.name || name}`);
    console.log(`  Kind:        ${kind}`);
    console.log(`  Version:     ${manifest?.version || 'unknown'}`);
    console.log(`  Install Dir: ${installPath}`);

    // Install type
    const installType = manifest?.installType ||
      (manifest?.npmPackage ? 'npm' : manifest?.pipPackage ? 'pip' : kind);
    console.log(`  Install Type: ${installType}`);

    // Source
    if (manifest?.source) {
      if (typeof manifest.source === 'string') {
        console.log(`  Source:      ${manifest.source}`);
      } else {
        console.log(`  Source:      ${manifest.source.type || 'unknown'}`);
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

    // Scripts policy
    if (manifest?.hasInstallScripts !== undefined) {
      console.log(`  Has Install Scripts: ${manifest.hasInstallScripts ? 'yes' : 'no'}`);
    }
    if (manifest?.scriptsPolicy) {
      console.log(`  Scripts Policy: ${manifest.scriptsPolicy}`);
    }

    // Installed timestamp
    if (manifest?.installedAt) {
      console.log(`  Installed:   ${new Date(manifest.installedAt).toLocaleString()}`);
    }

    // Binaries and shims
    const bins = manifest?.bins || manifest?.binaries || [];
    if (bins.length > 0) {
      console.log(`\nBinaries (${bins.length}):`);
      console.log('─'.repeat(50));

      for (const bin of bins) {
        const shimPath = path.join(PATHS.bins, bin);
        const validation = validateShim(bin);
        const ownership = getShimOwner(bin);

        let shimStatus = '✗ no shim';
        if (fs.existsSync(shimPath)) {
          if (validation.valid) {
            shimStatus = `✓ ${validation.target}`;
          } else {
            shimStatus = `⚠ broken: ${validation.error}`;
          }
        }

        console.log(`  ${bin}:`);
        console.log(`    Shim: ${shimStatus}`);

        if (ownership) {
          const ownerMatch = ownership.owner === pkgId;
          const ownerStatus = ownerMatch ? '(this package)' : `(owned by ${ownership.owner})`;
          console.log(`    Type: ${ownership.type} ${ownerStatus}`);
        }
      }
    } else {
      console.log(`\nBinaries: none`);
    }

    // Lockfile info
    const lockName = name.replace(/\//g, '__').replace(/^@/, '');
    const lockDir = kind === 'binary' ? 'binaries' : kind === 'npm' ? 'npms' : kind + 's';
    const lockPath = path.join(PATHS.locks, lockDir, `${lockName}.lock.yaml`);

    if (fs.existsSync(lockPath)) {
      console.log(`\nLockfile: ${lockPath}`);
    }

    console.log('');

  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
