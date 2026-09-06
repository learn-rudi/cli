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
import { getShimOwner, validateShim, listInstalled, describePackage } from '@learnrudi/core';
import { inspectRuntimeInstall } from '../runtime-inspection.js';
import { printPackageLifecycle } from './package-lifecycle.js';
import { printSkillDetails } from './skill-display.js';

async function showSkillInfo(id, flags) {
  const skill = (await listInstalled('skill')).find(pkg => pkg.id === id);
  if (!skill) throw new Error(`Package not installed: ${id}`);
  if (flags.json) {
    console.log(JSON.stringify(skill, null, 2));
    return;
  }
  console.log(`\nPackage: ${id}`);
  console.log(`  Name:        ${skill.name}`);
  console.log(`  Kind:        skill`);
  console.log(`  Version:     ${skill.version}`);
  console.log(`  Entrypoint:  ${skill.entryPath}`);
  console.log(`  Description: ${skill.description}`);
  printSkillDetails(skill, '  ');
  if (skill.requires?.stacks?.length) console.log(`  Requires: ${skill.requires.stacks.join(', ')}`);
}

function resolvesToSameFile(leftPath, rightPath) {
  try {
    return fs.realpathSync(leftPath) === fs.realpathSync(rightPath);
  } catch {
    return false;
  }
}

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
    if (kind === 'skill') return await showSkillInfo(pkgId, flags);
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

    let runtimeInspection = null;
    if (kind === 'runtime') {
      runtimeInspection = inspectRuntimeInstall(pkgId);
      if (runtimeInspection.error) {
        throw new Error(runtimeInspection.error);
      }
      manifest = runtimeInspection.manifest;
    }

    const stack = kind === 'stack' ? describePackage({
      ...manifest, id: pkgId, kind, path: installPath,
    }) : null;
    if (stack && flags.json) {
      console.log(JSON.stringify(stack, null, 2));
      return;
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
    printPackageLifecycle(manifest, '  ');
    if (stack) printSkillDetails(stack, '  ');

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
    const bins = runtimeInspection
      ? runtimeInspection.binaries.map(binary => binary.name)
      : manifest?.bins || manifest?.binaries || [];
    if (bins.length > 0) {
      console.log(`\nBinaries (${bins.length}):`);
      console.log('─'.repeat(50));

      for (const bin of bins) {
        const installedRuntimeBinary = runtimeInspection?.binaries.find(binary => binary.name === bin);
        const shimPath = path.join(PATHS.bins, bin);
        const validation = validateShim(bin);
        const ownership = getShimOwner(bin);

        let shimStatus = '✗ no shim';
        if (fs.existsSync(shimPath)) {
          if (validation.valid) {
            if (
              installedRuntimeBinary &&
              !resolvesToSameFile(validation.target, installedRuntimeBinary.resolvedPath)
            ) {
              shimStatus = `↪ preserved for ${ownership?.owner || 'another package'}: ${validation.target}`;
            } else {
              shimStatus = `✓ ${validation.target}`;
            }
          } else {
            shimStatus = `⚠ broken: ${validation.error}`;
          }
        }

        console.log(`  ${bin}:`);
        if (installedRuntimeBinary) {
          console.log(`    Installed: ✓ ${installedRuntimeBinary.path}`);
        }
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
