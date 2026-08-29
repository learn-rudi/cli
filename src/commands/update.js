/**
 * Update command - update installed packages from the registry.
 */

import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'path';
import {
  addStack,
  getLockfilePath,
  indexAllStacks,
  listInstalled,
  resolvePackage as coreResolvePackage,
  updatePackage as coreUpdatePackage,
} from '@learnrudi/core';
import { PATHS } from '@learnrudi/env';
import { fetchIndex } from '@learnrudi/registry-client';
import {
  buildStackIfNeeded,
  getManifestSecrets,
  getStackCommand,
  getStackRuntime,
  loadManifest,
  validateStackEntryPoint,
} from './install.js';
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

async function resolveManagedPath(candidate, rootInput, options) {
  const { candidateLabel, rootLabel, createRoot = false } = options;
  if (typeof candidate !== 'string' || candidate.trim() !== candidate || !candidate) {
    throw new Error(`${candidateLabel} is required for transactional update`);
  }

  const root = path.resolve(rootInput);
  const targetPath = path.resolve(candidate);
  if (targetPath === root || !targetPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to snapshot ${candidateLabel.toLowerCase()} outside the managed ${rootLabel}: ${candidate}`);
  }

  if (createRoot) {
    await fs.mkdir(root, { recursive: true });
  }
  const rootStat = await fs.lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`Managed ${rootLabel} must be a real directory: ${root}`);
  }

  const relative = path.relative(root, targetPath);
  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new Error(`Refusing symlinked path within managed ${rootLabel}: ${current}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
  }

  return { root, targetPath };
}

function resolveManagedStackPath(stackPath, stacksRoot = PATHS.stacks, options = {}) {
  return resolveManagedPath(stackPath, stacksRoot, {
    candidateLabel: 'Installed stack path',
    rootLabel: 'stack root',
    ...options,
  });
}

function resolveManagedLockfilePath(lockfilePath, locksRoot = PATHS.locks, options = {}) {
  return resolveManagedPath(lockfilePath, locksRoot, {
    candidateLabel: 'Stack lockfile path',
    rootLabel: 'lock root',
    ...options,
  });
}

function resolveManagedStackStatePath(
  stateRoot,
  stateStacksRoot = path.join(PATHS.home, 'state', 'stacks'),
  options = {},
) {
  return resolveManagedPath(stateRoot, stateStacksRoot, {
    candidateLabel: 'Stack state path',
    rootLabel: 'stack state root',
    ...options,
  });
}

async function buildTreeManifest(rootPath, prefix = '') {
  const entries = [];

  async function visit(currentPath, relativePath) {
    let stat;
    try {
      stat = await fs.lstat(currentPath);
    } catch (error) {
      if (error.code === 'ENOENT' && relativePath === prefix) return;
      throw error;
    }

    const manifestPath = relativePath || '.';
    if (stat.isSymbolicLink()) {
      entries.push([manifestPath, 'symlink', await fs.readlink(currentPath)]);
      return;
    }
    if (stat.isDirectory()) {
      entries.push([manifestPath, 'directory', '']);
      const names = await fs.readdir(currentPath);
      names.sort();
      for (const name of names) {
        const childRelative = relativePath ? path.join(relativePath, name) : name;
        await visit(path.join(currentPath, name), childRelative);
      }
      return;
    }
    if (stat.isFile()) {
      const digest = createHash('sha256').update(await fs.readFile(currentPath)).digest('hex');
      entries.push([manifestPath, 'file', digest]);
      return;
    }
    throw new Error(`Unsupported state entry type: ${currentPath}`);
  }

  await visit(rootPath, prefix);
  return entries.sort((left, right) => left[0].localeCompare(right[0]));
}

function mergeExpectedStateManifest(initialManifest, migratedRunsManifest) {
  if (migratedRunsManifest.length === 0) return initialManifest;
  const byPath = new Map(initialManifest.map(entry => [entry[0], entry]));
  if (!byPath.has('.')) byPath.set('.', ['.', 'directory', '']);

  for (const entry of migratedRunsManifest) {
    const existing = byPath.get(entry[0]);
    if (existing) {
      if (existing[1] !== 'directory' || entry[1] !== 'directory') return null;
      continue;
    }
    byPath.set(entry[0], entry);
  }

  return [...byPath.values()].sort((left, right) => left[0].localeCompare(right[0]));
}

function validTreeManifest(value) {
  return Array.isArray(value) && value.every(entry => (
    Array.isArray(entry) &&
    entry.length === 3 &&
    entry.every(part => typeof part === 'string')
  ));
}

function treeManifestsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function assertSnapshotComponent(componentPath, type, label) {
  let stat;
  try {
    stat = await fs.lstat(componentPath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Missing ${label}: ${componentPath}`);
    throw error;
  }
  const validType = type === 'directory' ? stat.isDirectory() : stat.isFile();
  if (!validType || stat.isSymbolicLink()) {
    throw new Error(`Invalid ${label}: ${componentPath}`);
  }
}

export async function copyPathWithoutOverwrite(sourcePath, destinationPath, label) {
  const sourceStat = await fs.lstat(sourcePath);
  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Refusing to copy symlinked ${label}: ${sourcePath}`);
  }
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });

  const expectedManifest = await buildTreeManifest(sourcePath);
  if (sourceStat.isFile()) {
    await fs.copyFile(sourcePath, destinationPath, fsConstants.COPYFILE_EXCL);
  } else if (sourceStat.isDirectory()) {
    await fs.cp(sourcePath, destinationPath, {
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      recursive: true,
    });
  } else {
    throw new Error(`Unsupported ${label} type: ${sourcePath}`);
  }

  const copiedManifest = await buildTreeManifest(destinationPath);
  if (!treeManifestsEqual(copiedManifest, expectedManifest)) {
    throw new Error(
      `Concurrent ${label} mutation detected at ${destinationPath}; `
      + `exact source retained at ${sourcePath}`,
    );
  }
}

async function validateStackUpdateSnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid stack update snapshot');
  }

  const { root, targetPath } = await resolveManagedStackPath(
    snapshot.targetPath,
    options.stacksRoot || PATHS.stacks,
  );
  const { targetPath: lockfilePath } = await resolveManagedLockfilePath(
    snapshot.lockfilePath,
    snapshot.locksRoot || PATHS.locks,
  );
  const { targetPath: stateRoot } = await resolveManagedStackStatePath(
    snapshot.stateRoot,
    options.stateStacksRoot || snapshot.stateStacksRoot || path.join(PATHS.home, 'state', 'stacks'),
  );
  const backupRoot = path.resolve(String(snapshot.backupRoot || ''));
  const snapshotPath = path.resolve(String(snapshot.snapshotPath || ''));
  const lockfileSnapshotPath = path.resolve(String(snapshot.lockfileSnapshotPath || ''));
  const stateSnapshotPath = path.resolve(String(snapshot.stateSnapshotPath || ''));
  const expectedPrefix = `.${path.basename(targetPath)}.update-backup-`;
  if (
    path.dirname(backupRoot) !== root ||
    !path.basename(backupRoot).startsWith(expectedPrefix) ||
    snapshotPath !== path.join(backupRoot, 'snapshot') ||
    lockfileSnapshotPath !== path.join(backupRoot, 'lockfile') ||
    stateSnapshotPath !== path.join(backupRoot, 'state')
  ) {
    throw new Error('Invalid stack update snapshot paths');
  }
  await assertSnapshotComponent(backupRoot, 'directory', 'stack update backup root');
  if (!validTreeManifest(snapshot.stateInitialManifest)) {
    throw new Error('Invalid initial state manifest in stack update snapshot');
  }
  if (snapshot.stateExpectedManifest !== null && !validTreeManifest(snapshot.stateExpectedManifest)) {
    throw new Error('Invalid expected state manifest in stack update snapshot');
  }

  return {
    backupRoot,
    lockfileExisted: snapshot.lockfileExisted === true,
    lockfilePath,
    lockfileSnapshotPath,
    snapshotPath,
    stateRoot,
    stateRootExisted: snapshot.stateRootExisted === true,
    stateExpectedManifest: snapshot.stateExpectedManifest,
    stateInitialManifest: snapshot.stateInitialManifest,
    stateSnapshotPath,
    targetPath,
  };
}

export async function createStackUpdateSnapshot(stackPath, options = {}) {
  const { root, targetPath } = await resolveManagedStackPath(stackPath, options.stacksRoot);
  const locksRoot = path.resolve(options.locksRoot || PATHS.locks);
  const { targetPath: lockfilePath } = await resolveManagedLockfilePath(
    options.lockfilePath,
    locksRoot,
    { createRoot: true },
  );
  const stateStacksRoot = path.resolve(
    options.stateStacksRoot || (
      options.stacksRoot
        ? path.join(path.dirname(root), 'state', 'stacks')
        : path.join(PATHS.home, 'state', 'stacks')
    ),
  );
  const { targetPath: stateRoot } = await resolveManagedStackStatePath(
    options.stateRoot || path.join(stateStacksRoot, path.basename(targetPath)),
    stateStacksRoot,
    { createRoot: true },
  );
  const stackStat = await fs.lstat(targetPath);
  if (!stackStat.isDirectory() || stackStat.isSymbolicLink()) {
    throw new Error(`Installed stack path must be a real directory: ${stackPath}`);
  }

  const backupRoot = await fs.mkdtemp(
    path.join(root, `.${path.basename(targetPath)}.update-backup-`),
  );
  const snapshotPath = path.join(backupRoot, 'snapshot');
  const lockfileSnapshotPath = path.join(backupRoot, 'lockfile');
  const stateSnapshotPath = path.join(backupRoot, 'state');
  let lockfileExisted = false;
  let stateRootExisted = false;
  const stateInitialManifest = await buildTreeManifest(stateRoot);
  const migratedRunsManifest = await buildTreeManifest(path.join(targetPath, 'runs'), 'runs');
  const stateExpectedManifest = mergeExpectedStateManifest(
    stateInitialManifest,
    migratedRunsManifest,
  );
  try {
    await fs.chmod(backupRoot, 0o700);
    await fs.cp(targetPath, snapshotPath, {
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      recursive: true,
    });
    try {
      const lockfileStat = await fs.lstat(lockfilePath);
      if (!lockfileStat.isFile() || lockfileStat.isSymbolicLink()) {
        throw new Error(`Stack lockfile path must be a real file: ${lockfilePath}`);
      }
      await fs.copyFile(lockfilePath, lockfileSnapshotPath);
      lockfileExisted = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      const stateStat = await fs.lstat(stateRoot);
      if (!stateStat.isDirectory() || stateStat.isSymbolicLink()) {
        throw new Error(`Stack state path must be a real directory: ${stateRoot}`);
      }
      await fs.cp(stateRoot, stateSnapshotPath, {
        errorOnExist: true,
        force: false,
        preserveTimestamps: true,
        recursive: true,
      });
      stateRootExisted = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  } catch (error) {
    await fs.rm(backupRoot, { force: true, recursive: true });
    throw error;
  }

  return {
    backupRoot,
    lockfileExisted,
    lockfilePath,
    lockfileSnapshotPath,
    locksRoot,
    snapshotPath,
    stateRoot,
    stateRootExisted,
    stateExpectedManifest,
    stateInitialManifest,
    stateSnapshotPath,
    stateStacksRoot,
    targetPath,
  };
}

export async function restoreStackUpdateSnapshot(snapshot, options = {}) {
  const {
    backupRoot,
    lockfileExisted,
    lockfilePath,
    lockfileSnapshotPath,
    snapshotPath,
    stateRoot,
    stateRootExisted,
    stateExpectedManifest,
    stateInitialManifest,
    stateSnapshotPath,
    targetPath,
  } = await validateStackUpdateSnapshot(snapshot, options);

  await assertSnapshotComponent(snapshotPath, 'directory', 'stack snapshot');
  if (lockfileExisted) {
    await assertSnapshotComponent(lockfileSnapshotPath, 'file', 'lockfile snapshot');
  }
  if (stateRootExisted) {
    await assertSnapshotComponent(stateSnapshotPath, 'directory', 'state snapshot');
  }

  const components = [
    {
      currentPath: stateRoot,
      existedBefore: stateRootExisted,
      label: 'state',
      snapshotPath: stateSnapshotPath,
    },
    {
      currentPath: targetPath,
      existedBefore: true,
      label: 'install',
      snapshotPath,
    },
    {
      currentPath: lockfilePath,
      existedBefore: lockfileExisted,
      label: 'lockfile',
      snapshotPath: lockfileSnapshotPath,
    },
  ];
  const stateComponent = components[0];

  for (const component of components) {
    component.stagedPath = path.join(backupRoot, `failed-${component.label}`);
    component.staged = false;
    component.promoted = false;
  }

  try {
    for (const component of components) {
      try {
        const currentStat = await fs.lstat(component.currentPath);
        if (currentStat.isSymbolicLink()) {
          throw new Error(`Refusing to stage symlinked ${component.label}: ${component.currentPath}`);
        }
        await fs.rename(component.currentPath, component.stagedPath);
        component.staged = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    const stagedStateManifest = stateComponent.staged
      ? await buildTreeManifest(stateComponent.stagedPath)
      : [];
    const stateMatchesInitial = treeManifestsEqual(stagedStateManifest, stateInitialManifest);
    const stateMatchesExpected = (
      stateExpectedManifest !== null &&
      treeManifestsEqual(stagedStateManifest, stateExpectedManifest)
    );
    if (!stateMatchesInitial && !stateMatchesExpected) {
      throw new Error(`Stack state changed during update; refusing to rewind: ${stateRoot}`);
    }

    for (const component of components) {
      if (!component.existedBefore) continue;
      await fs.mkdir(path.dirname(component.currentPath), { recursive: true });
      await fs.rename(component.snapshotPath, component.currentPath);
      component.promoted = true;
    }
  } catch (error) {
    const compensationErrors = [];
    for (const component of [...components].reverse()) {
      if (component.promoted) {
        try {
          await copyPathWithoutOverwrite(
            component.currentPath,
            component.snapshotPath,
            `accepted ${component.label}`,
          );
        } catch (compensationError) {
          compensationErrors.push(compensationError.message);
        }
        compensationErrors.push(
          `Rollback could not atomically restore the failed ${component.label}; `
          + `accepted data remains at ${component.currentPath} and failed data remains at ${component.stagedPath}`,
        );
        continue;
      }
      if (component.staged) {
        try {
          await copyPathWithoutOverwrite(
            component.stagedPath,
            component.currentPath,
            `failed ${component.label}`,
          );
        } catch (compensationError) {
          compensationErrors.push(compensationError.message);
        }
      }
    }
    if (compensationErrors.length > 0) {
      throw new Error(
        `${error.message}; rollback compensation failed: ${compensationErrors.join('; ')}`,
        { cause: error },
      );
    }
    throw error;
  }

  await fs.rm(backupRoot, { force: true, recursive: true });
}

export async function discardStackUpdateSnapshot(snapshot, options = {}) {
  const { backupRoot } = await validateStackUpdateSnapshot(snapshot, options);
  await fs.rm(backupRoot, { force: true, recursive: true });
}

const defaultDependencies = {
  fetchIndex,
  listInstalled,
  resolvePackage: coreResolvePackage,
  updatePackage: coreUpdatePackage,
  getPackageLockfilePath: getLockfilePath,
  createStackUpdateSnapshot,
  restoreStackUpdateSnapshot,
  discardStackUpdateSnapshot,
  loadStackManifest: loadManifest,
  buildStack: buildStackIfNeeded,
  validateStack: validateStackEntryPoint,
  registerStack: addStack,
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

function logSkillProjectionFailures(skillProjection, deps) {
  for (const failure of skillProjection.failures) {
    deps.error(`  x ${failure.target} ${failure.id || 'skill wrapper'}: ${failure.error}`);
  }
}

async function updateOnePackage(pkg, flags, deps) {
  deps.log(`Updating ${pkg.id}...`);
  const kind = pkg.kind || packageKindFromId(pkg.id);
  const snapshot = kind === 'stack'
    ? await deps.createStackUpdateSnapshot(pkg.path, {
      lockfilePath: deps.getPackageLockfilePath(pkg.id),
    })
    : null;
  let result;

  try {
    result = await deps.updatePackage(pkg.id, {
      preserveState: shouldPreserveInstallState(flags),
    });
    if (!result?.success) {
      throw new Error(result?.error || `Failed to update ${pkg.id}`);
    }

    if (kind === 'stack') {
      if (path.resolve(result.path) !== path.resolve(snapshot.targetPath)) {
        throw new Error(`Updated stack path changed unexpectedly for ${pkg.id}`);
      }

      const manifest = await deps.loadStackManifest(result.path);
      if (!manifest) {
        throw new Error(`Stack manifest not found after updating ${pkg.id}`);
      }

      await deps.buildStack(result.path, manifest, {
        force: true,
        verbose: Boolean(flags.verbose),
      });

      const validation = deps.validateStack(result.path, manifest);
      if (!validation.valid) {
        throw new Error(`Stack validation failed: ${validation.error}`);
      }

      deps.registerStack(pkg.id, {
        path: result.path,
        runtime: getStackRuntime(manifest),
        command: getStackCommand(manifest),
        secrets: getManifestSecrets(manifest),
        version: manifest.version,
      });
    }
  } catch (error) {
    if (snapshot) {
      try {
        await deps.restoreStackUpdateSnapshot(snapshot);
      } catch (rollbackError) {
        throw new Error(
          `${error.message}; stack rollback failed: ${rollbackError.message}`,
          { cause: error },
        );
      }
    }
    throw error;
  }

  if (snapshot) {
    try {
      await deps.discardStackUpdateSnapshot(snapshot);
    } catch (cleanupError) {
      deps.error(
        `  ! ${pkg.id}: update applied, but snapshot cleanup failed: ${cleanupError.message}`,
      );
    }
  }

  return {
    id: pkg.id,
    kind,
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
    logSkillProjectionFailures(skillProjection, deps);
    return {
      dryRun: true,
      updated: 0,
      failed: skillProjection.failed,
      packageFailed: 0,
      projectionFailed: skillProjection.failed,
      skipped: relatedSkills.notInstalled.length,
      packages: [],
      failures: [],
      projectionFailures: skillProjection.failures,
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
      try {
        const updated = await updateOnePackage(pkg, flags, deps);
        updatedPackages.push(updated);
      } catch (error) {
        if (pkg.id === target.id) {
          throw error;
        }
        failedPackages.push({ id: pkg.id, error: error.message });
        deps.error(`  x ${pkg.id}: ${error.message}`);
      }
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
  logSkillProjectionFailures(skillProjection, deps);

  if (pkgId && updateTargets.length === 1 && failedPackages.length === 0) {
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
    failed: failedPackages.length + skillProjection.failed,
    packageFailed: failedPackages.length,
    projectionFailed: skillProjection.failed,
    skipped: skippedPackages.length,
    packages: updatedPackages,
    failures: failedPackages,
    projectionFailures: skillProjection.failures,
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
