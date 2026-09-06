/** Registry skill replacement owns its package and lockfile as one transaction. */
import fs from 'node:fs';
import { parseSkillDocument } from './package-metadata.js';
import { parse as parseYaml } from 'yaml';
import path from 'node:path';
import { PATHS, getLockfilePath } from '@learnrudi/env';
import { downloadPackage } from '@learnrudi/registry-client';
import { computeInstalledContentChecksum, readLockfile, restoreLockfile, writeLockfile } from './lockfile.js';

function statIfPresent(file) {
  try { return fs.lstatSync(file); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function assertRealParents(target) {
  const relative = path.relative(PATHS.home, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Skill install path escapes RUDI home');
  }
  let current = PATHS.home;
  for (const segment of ['', ...relative.split(path.sep)]) {
    if (segment) current = path.join(current, segment);
    const stat = statIfPresent(current);
    if (stat?.isSymbolicLink()) throw new Error(`Refusing symlinked skill install path: ${current}`);
  }
}

function inspectPreviousInstall(pkg, destination) {
  const slug = pkg.id.slice('skill:'.length);
  const candidates = [path.join(PATHS.skills, slug), path.join(PATHS.skills, `${slug}.md`)];
  for (const candidate of [...candidates, getLockfilePath(pkg.id)]) assertRealParents(candidate);
  const existing = candidates.filter(candidate => statIfPresent(candidate));
  if (existing.length > 1) {
    throw new Error(`Conflicting skill formats for ${pkg.id}; preserve and reconcile ${existing.join(' and ')}`);
  }
  const previousPath = existing[0] || null;
  const previousLockfile = readLockfile(pkg.id);
  if (previousPath) {
    const stat = fs.lstatSync(previousPath);
    const layout = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : null;
    if (!layout || previousLockfile?.id !== pkg.id
      || !/^[a-f0-9]{64}$/i.test(previousLockfile?.checksum || '')
      || (previousLockfile.installLayout && previousLockfile.installLayout !== layout)) {
      throw new Error(`Cannot prove ownership of ${pkg.id}; preserving ${previousPath}`);
    }
  }
  return { id: pkg.id, destination, previousPath, previousLockfile };
}

async function assertUnchanged(state, candidate = state.previousPath) {
  if (!candidate) return;
  const digest = await computeInstalledContentChecksum(candidate);
  if (digest !== await computeInstalledContentChecksum(candidate, { includeIgnored: true })) {
    throw new Error(`Untracked skill content excluded from the ownership checksum; preserving ${candidate}`);
  }
  if (digest !== state.previousLockfile.checksum) {
    throw new Error(`Modified skill ${state.id}; preserving local content at ${candidate}`);
  }
}

async function assertReplacementUnchanged(state) {
  assertRealParents(state.destination);
  if (await computeInstalledContentChecksum(state.destination, { includeIgnored: true }) !== state.replacementDigest) {
    throw new Error(`Replacement changed concurrently; preserving ${state.destination}`);
  }
}

async function restorePrevious(state) {
  if (state.installed) {
    await assertReplacementUnchanged(state);
    fs.rmSync(state.destination, { recursive: true, force: true });
  }
  if (state.movedPrevious) {
    if (statIfPresent(state.previousPath)) {
      throw new Error(`Recovery conflict; previous skill is preserved at ${state.backupPath}`);
    }
    fs.renameSync(state.backupPath, state.previousPath);
  }
  if (state.lockWriteAttempted) restoreLockfile(state.id, state.previousLockfile);
}

async function replaceSkill(pkg, state, onProgress) {
  const stage = path.join(state.transactionRoot, 'next');
  await downloadPackage(pkg, stage, { onProgress });
  const directory = !pkg.path.replaceAll('\\', '/').endsWith('.md');
  const entry = directory ? path.join(stage, 'SKILL.md') : stage;
  if (!statIfPresent(entry)?.isFile()) throw new Error(`Downloaded ${pkg.id} has no regular skill entrypoint`);
  const content = fs.readFileSync(entry, 'utf8');
  const { metadata } = parseSkillDocument(content);
  if (!metadata.name?.trim() || !metadata.description?.trim()) {
    throw new Error(`Downloaded ${pkg.id} requires name and description metadata`);
  }
  if (directory) {
    const nativeMetadata = path.join(stage, 'agents/openai.yaml');
    if (statIfPresent(nativeMetadata)) {
      if (!fs.lstatSync(nativeMetadata).isFile()) throw new Error('Native metadata must be a regular file');
      const parsed = parseYaml(fs.readFileSync(nativeMetadata, 'utf8'), { maxAliasCount: 50 });
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Native metadata must be a YAML mapping');
      }
    }
  }
  state.replacementDigest = await computeInstalledContentChecksum(stage, { includeIgnored: true });
  await assertUnchanged(state);
  if (state.previousPath) {
    fs.renameSync(state.previousPath, state.backupPath);
    state.movedPrevious = true;
    await assertUnchanged(state, state.backupPath);
  }
  if (statIfPresent(state.destination)) throw new Error(`Skill destination changed during install: ${state.destination}`);
  fs.renameSync(stage, state.destination);
  state.installed = true;
  onProgress?.({ phase: 'lockfile', package: pkg.id });
  await assertReplacementUnchanged(state);
  assertRealParents(getLockfilePath(pkg.id));
  state.lockWriteAttempted = true;
  await writeLockfile(pkg, { installPath: state.destination });
  await assertReplacementUnchanged(state);
}

/** Read-only migration preview; execution repeats these checks under its guard. */
export async function inspectRegistrySkillUpdate(pkg, destination) {
  if (!/^skill:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.id) || typeof pkg.path !== 'string') {
    throw new Error('Invalid registry skill identity or source path');
  }
  const guardPath = path.join(PATHS.skills, `.${pkg.id.slice(6)}.install-lock`);
  assertRealParents(guardPath);
  if (statIfPresent(guardPath)) throw new Error(`Skill install already active or awaiting recovery: ${guardPath}`);
  const state = inspectPreviousInstall(pkg, destination);
  await assertUnchanged(state);
  return { id: pkg.id, from: state.previousPath, to: destination,
    action: state.previousPath && state.previousPath !== destination ? 'migrate' : 'update' };
}

export async function installRegistrySkill(pkg, destination, { onProgress } = {}) {
  if (!/^skill:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pkg.id) || typeof pkg.path !== 'string') {
    throw new Error('Invalid registry skill identity or source path');
  }
  assertRealParents(PATHS.skills);
  const guardPath = path.join(PATHS.skills, `.${pkg.id.slice(6)}.install-lock`);
  try { fs.mkdirSync(guardPath); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Skill install already active or awaiting recovery: ${guardPath}`);
    throw error;
  }
  let state;
  let recoveryFailed = false;
  try {
    state = inspectPreviousInstall(pkg, destination);
    await assertUnchanged(state);
    state.transactionRoot = fs.mkdtempSync(path.join(PATHS.skills, `.${pkg.id.slice(6)}.install-`));
    state.backupPath = path.join(state.transactionRoot, 'previous');
    await replaceSkill(pkg, state, onProgress);
    onProgress?.({ phase: 'installed', package: pkg.id, path: destination });
    return { success: true, id: pkg.id, path: destination, lockfileWritten: true,
      ...(state.movedPrevious ? { backupPath: state.backupPath } : {}) };
  } catch (error) {
    if (state) {
      try { await restorePrevious(state); } catch (recoveryError) {
        recoveryFailed = true;
        throw new Error(`${error.message}; recovery failed: ${recoveryError.message}. Preserve ${state.transactionRoot}`);
      }
    }
    throw error;
  } finally {
    if (!recoveryFailed) {
      // Retain the previous inode/tree: another process may still hold it open.
      // Backup deletion requires a separate, explicit reconciliation step.
      if (state?.transactionRoot && !statIfPresent(state.backupPath)) {
        fs.rmSync(state.transactionRoot, { recursive: true, force: true });
      }
      fs.rmdirSync(guardPath);
    }
  }
}
