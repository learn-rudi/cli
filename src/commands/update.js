/**
 * Update command - update installed packages from the registry.
 */

import {
  indexAllStacks,
  listInstalled,
  resolvePackage as coreResolvePackage,
  updatePackage as coreUpdatePackage,
} from '@learnrudi/core';
import { fetchIndex } from '@learnrudi/registry-client';
import { buildRelatedSkillUpdatePlan } from './related-skills.js';
import {
  parseNativeSkillSyncTargets,
  syncSelectedSkillsToNativeHosts,
} from './skills.js';

const KNOWN_PACKAGE_KINDS = new Set(['stack', 'skill', 'prompt', 'workflow', 'runtime', 'binary', 'agent', 'npm']);

function rebuildToolIndex(options = {}) {
  return indexAllStacks({
    stacks: options.stacks,
    log: options.log,
    timeout: options.timeout,
  });
}

const defaultDependencies = {
  fetchIndex,
  listInstalled,
  resolvePackage: coreResolvePackage,
  updatePackage: coreUpdatePackage,
  rebuildToolIndex,
  log: console.log,
  error: console.error,
};

function packageNameFromId(id) {
  return String(id || '').split(':').slice(1).join(':');
}

function packageKindFromId(id) {
  return String(id || '').split(':')[0];
}

function hasKnownPackagePrefix(id) {
  const value = String(id || '');
  if (!value.includes(':')) return false;
  return KNOWN_PACKAGE_KINDS.has(packageKindFromId(value));
}

function assertKnownPackagePrefix(id) {
  const value = String(id || '');
  if (!value.includes(':')) return;
  const kind = packageKindFromId(value);
  if (!KNOWN_PACKAGE_KINDS.has(kind)) {
    throw new Error(`Unknown package kind "${kind}" in ${value}`);
  }
}

function formatTargetList(packages) {
  return packages.map(pkg => pkg.id).sort().join(', ');
}

function isPackageNotFoundError(error) {
  return /Package not found/i.test(String(error?.message || error || ''));
}

function isTruthyFlag(value) {
  if (value === true) return true;
  if (typeof value !== 'string') return false;

  const normalized = value.trim().toLowerCase();
  return normalized !== '' && !['0', 'false', 'no', 'off'].includes(normalized);
}

function shouldPreserveInstallState(flags = {}) {
  return isTruthyFlag(flags['preserve-state']) || isTruthyFlag(flags.preserveState);
}

async function getInstalledPackages(deps) {
  const installed = await deps.listInstalled();
  return Array.isArray(installed) ? installed.filter(pkg => typeof pkg?.id === 'string') : [];
}

export async function resolveUpdateTarget(rawTarget, deps = defaultDependencies) {
  const target = String(rawTarget || '').trim();
  if (!target) {
    throw new Error('Package id is required');
  }

  assertKnownPackagePrefix(target);
  if (packageKindFromId(target) === 'agent') {
    throw new Error(
      `${target} is a vendor-managed Agent Host and cannot be updated by RUDI. `
      + `Use the provider's supported updater, then verify with: rudi agent hosts --json`
    );
  }
  const installed = await getInstalledPackages(deps);

  if (hasKnownPackagePrefix(target)) {
    const match = installed.find(pkg => pkg.id === target);
    if (!match) {
      throw new Error(`Package not installed: ${target}`);
    }
    return match;
  }

  const matches = installed.filter(pkg => pkg.name === target || packageNameFromId(pkg.id) === target);
  if (matches.length === 0) {
    throw new Error(`Package kind is required for "${target}" because no installed package with that name was found`);
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous package "${target}". Use one of: ${formatTargetList(matches)}`);
  }

  return matches[0];
}

async function rebuildUpdatedStackIndex(stackIds, flags, deps) {
  const uniqueStackIds = [...new Set(stackIds)].sort();
  if (uniqueStackIds.length === 0) return null;

  deps.log(`Rebuilding tool index for ${uniqueStackIds.length} stack(s)...`);
  return deps.rebuildToolIndex({
    stacks: uniqueStackIds,
    log: flags.verbose ? deps.log : () => {},
    timeout: 20000,
    validate: false,
  });
}

function getUpdatedSkillIds(updatedPackages) {
  return updatedPackages
    .filter(pkg => pkg.kind === 'skill')
    .map(pkg => pkg.id)
    .sort();
}

function logNativeSkillSyncHint(skillIds, deps) {
  if (skillIds.length === 0) return;

  const exactSkillIds = skillIds.join(' ');

  deps.log('');
  deps.log(`Updated ${skillIds.length} skill package(s). Native frontier-host skill wrappers are not overwritten automatically.`);
  deps.log('To sync native wrappers for updated RUDI skills, run:');
  deps.log(`  rudi skills sync codex ${exactSkillIds} --force`);
  deps.log(`  rudi skills sync claude ${exactSkillIds} --force`);
  deps.log(`  rudi skills sync gemini ${exactSkillIds} --force`);
  deps.log(`  rudi skills sync antigravity ${exactSkillIds} --force`);
  deps.log('These commands overwrite only the named native wrappers; omit --force to create only missing wrappers.');
}

async function updateOnePackage(pkg, flags, deps) {
  deps.log(`Updating ${pkg.id}...`);
  const result = await deps.updatePackage(pkg.id, {
    preserveState: shouldPreserveInstallState(flags),
  });
  if (!result?.success) {
    throw new Error(result?.error || `Failed to update ${pkg.id}`);
  }
  return {
    id: pkg.id,
    kind: pkg.kind || packageKindFromId(pkg.id),
    result,
  };
}

export async function runUpdate(args = [], flags = {}, deps = defaultDependencies) {
  if (args.length > 1) {
    throw new Error('Update accepts one package id or --all');
  }
  const pkgId = args[0];
  const all = flags.all === true;
  const dryRun = isTruthyFlag(flags['dry-run']) || isTruthyFlag(flags.dryRun);
  const skillSyncTargets = parseNativeSkillSyncTargets(flags['sync-skills'] ?? flags.syncSkills);
  if (!pkgId && !all) {
    throw new Error('Package id is required. Use --all to update the whole installed inventory');
  }
  if (pkgId && all) {
    throw new Error('Choose one package id or --all, not both');
  }
  const updatedPackages = [];
  const failedPackages = [];
  const skippedPackages = [];
  let target = null;
  let installed = null;
  let updateTargets = [];
  let relatedSkills = { selected: [], notInstalled: [] };

  if (pkgId) {
    target = await resolveUpdateTarget(pkgId, deps);
    updateTargets = [target];
  } else {
    installed = await getInstalledPackages(deps);
    updateTargets = installed;
  }

  deps.log('Refreshing registry...');
  await deps.fetchIndex({ force: true });

  if (pkgId && (flags['with-related-skills'] === true || flags.withRelatedSkills === true)) {
    if (target.kind !== 'stack') {
      throw new Error('--with-related-skills requires an installed stack target');
    }
    installed = await getInstalledPackages(deps);
    const resolved = await deps.resolvePackage(target.id);
    relatedSkills = buildRelatedSkillUpdatePlan(resolved, installed);
    updateTargets.push(...relatedSkills.selected);
    for (const id of relatedSkills.notInstalled) {
      skippedPackages.push({ id, error: 'Related skill is not installed' });
      deps.log(`  - ${id}: related skill is not installed; skipped`);
    }
  }

  const plannedPackages = updateTargets.map((pkg) => pkg.id);
  const plannedIndexedStacks = updateTargets
    .filter((pkg) => (pkg.kind || packageKindFromId(pkg.id)) === 'stack')
    .map((pkg) => pkg.id);
  const plannedSkillIds = updateTargets
    .filter((pkg) => (pkg.kind || packageKindFromId(pkg.id)) === 'skill')
    .map((pkg) => pkg.id)
    .sort();

  if (dryRun) {
    deps.log(`Dry run: would update ${plannedPackages.length} package(s)`);
    for (const id of plannedPackages) {
      deps.log(`  - ${id}`);
    }
    if (plannedIndexedStacks.length > 0) {
      deps.log(`Dry run: would rebuild the tool index for ${plannedIndexedStacks.join(', ')}`);
    }
    const skillProjection = await syncSelectedSkillsToNativeHosts({
      targets: skillSyncTargets,
      skillIds: plannedSkillIds,
      force: true,
      dryRun: true,
    }, deps);
    return {
      dryRun: true,
      updated: 0,
      failed: 0,
      skipped: relatedSkills.notInstalled.length,
      packages: [],
      failures: [],
      skippedPackages: relatedSkills.notInstalled.map((id) => ({
        id,
        error: 'Related skill is not installed',
      })),
      indexedStacks: [],
      updatedSkills: [],
      plannedPackages,
      plannedIndexedStacks,
      plannedSkillIds,
      skillProjection,
      relatedSkills: {
        selected: relatedSkills.selected.map((pkg) => pkg.id),
        notInstalled: relatedSkills.notInstalled,
      },
      indexResult: null,
    };
  }

  if (pkgId) {
    for (const pkg of updateTargets) {
      const updated = await updateOnePackage(pkg, flags, deps);
      updatedPackages.push(updated);
    }
  } else {
    deps.log('Checking installed packages for updates...');

    for (const pkg of installed) {
      try {
        const updated = await updateOnePackage(pkg, flags, deps);
        updatedPackages.push(updated);
      } catch (error) {
        if (isPackageNotFoundError(error)) {
          skippedPackages.push({ id: pkg.id, error: error.message });
          deps.log(`  - ${pkg.id}: skipped, not found in registry`);
          continue;
        }
        failedPackages.push({ id: pkg.id, error: error.message });
        deps.error(`  x ${pkg.id}: ${error.message}`);
      }
    }
  }

  const updatedStackIds = updatedPackages
    .filter(pkg => pkg.kind === 'stack')
    .map(pkg => pkg.id);
  const updatedSkillIds = getUpdatedSkillIds(updatedPackages);
  const indexResult = await rebuildUpdatedStackIndex(updatedStackIds, flags, deps);
  const skillProjection = await syncSelectedSkillsToNativeHosts({
    targets: skillSyncTargets,
    skillIds: updatedSkillIds,
    force: true,
    dryRun: false,
  }, deps);

  if (pkgId) {
    deps.log(`Updated ${updatedPackages[0].id}`);
  } else {
    deps.log(`\nUpdated ${updatedPackages.length} package(s)${failedPackages.length > 0 ? `, ${failedPackages.length} failed` : ''}${skippedPackages.length > 0 ? `, ${skippedPackages.length} skipped` : ''}`);
  }
  if (skillProjection.targets.length === 0) {
    logNativeSkillSyncHint(updatedSkillIds, deps);
  }

  return {
    dryRun: false,
    updated: updatedPackages.length,
    failed: failedPackages.length,
    skipped: skippedPackages.length,
    packages: updatedPackages,
    failures: failedPackages,
    skippedPackages,
    indexedStacks: updatedStackIds,
    updatedSkills: updatedSkillIds,
    plannedPackages,
    plannedIndexedStacks,
    plannedSkillIds,
    skillProjection,
    relatedSkills: {
      selected: relatedSkills.selected.map((pkg) => pkg.id),
      notInstalled: relatedSkills.notInstalled,
    },
    indexResult,
  };
}

export async function cmdUpdate(args, flags, dependencies = {}) {
  const json = flags.json === true;
  const executeUpdate = dependencies.runUpdate || ((updateArgs, updateFlags) => runUpdate(
    updateArgs,
    updateFlags,
    json ? { ...defaultDependencies, log: () => {} } : defaultDependencies,
  ));
  const log = dependencies.log || console.log;
  const printError = dependencies.error || console.error;
  const exit = dependencies.exit || ((code) => process.exit(code));
  try {
    const result = await executeUpdate(args, flags);
    if (json) {
      log(JSON.stringify(result, null, 2));
    }
    if (result.failed > 0) {
      return exit(1);
    }
  } catch (error) {
    if (json) {
      log(JSON.stringify({ success: false, error: error.message }, null, 2));
    } else {
      printError(`Update failed: ${error.message}`);
    }
    return exit(1);
  }
}
