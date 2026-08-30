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
import * as fsSync from 'fs';
import * as path from 'path';
import {
  fetchIndex,
  installPackage,
  resolvePackage,
  checkAllDependencies,
  formatDependencyResults,
  addStack,
  removeStack,
  removeStackFromToolIndex,
  updateSecretStatus,
  indexAllStacks,
  prepareDeferredInstall,
  commitDeferredInstall,
  rollbackDeferredInstall,
  readRudiConfig,
  updateRudiConfig,
} from '@learnrudi/core';
import { hasSecret, listSecrets, setSecret, getSecret } from '@learnrudi/secrets';
import { getInstalledAgents } from '@learnrudi/mcp';
import { runCommand } from '../utils/subprocess.js';
import { syncClaudeSkills, syncCodexSkills } from './skills.js';

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

    if (fsSync.existsSync(npmPath)) {
      return npmPath;
    }
  }

  if (runtime === 'python') {
    const pipPath = platform === 'win32'
      ? path.join(rudiHome, 'runtimes', 'python', 'Scripts', 'pip.exe')
      : path.join(rudiHome, 'runtimes', 'python', 'bin', 'pip3');

    if (fsSync.existsSync(pipPath)) {
      return pipPath;
    }
  }

  // Fall back to system command
  return binary;
}

function getStackRuntime(manifest) {
  return manifest?.runtime || manifest?.mcp?.runtime || 'node';
}

function getStackCommand(manifest) {
  let command = manifest?.command;

  if (!command || command.length === 0) {
    if (manifest?.mcp?.command) {
      const mcpCmd = manifest.mcp.command;
      const mcpArgs = manifest.mcp.args || [];
      command = [mcpCmd, ...mcpArgs];
    }
  }

  return command;
}

function getNodeProjectInfo(stackPath) {
  const candidates = [stackPath, path.join(stackPath, 'node')];

  for (const root of candidates) {
    const packageJsonPath = path.join(root, 'package.json');
    if (!fsSync.existsSync(packageJsonPath)) continue;

    try {
      const content = fsSync.readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      return { root, packageJsonPath, packageJson };
    } catch (error) {
      return { root, packageJsonPath, error: error.message };
    }
  }

  return null;
}

/**
 * Install dependencies for a stack based on its runtime
 * Uses bundled runtimes from ~/.rudi/runtimes/ when available
 */
async function installDependencies(stackPath, manifest, options = {}) {
  const { includeDevDeps = false, nodeProject } = options;
  const runtime = getStackRuntime(manifest);

  // Binary stacks have no dependencies to install
  if (runtime === 'binary') {
    return { installed: false, reason: 'Binary runtime — no dependencies' };
  }

  try {
    if (runtime === 'node') {
      const project = nodeProject || getNodeProjectInfo(stackPath);
      if (!project) {
        return { installed: false, reason: 'No package.json' };
      }

      if (project.error) {
        return { installed: false, error: `Failed to read package.json: ${project.error}` };
      }

      // Check if node_modules already exists
      const nodeModulesPath = path.join(project.root, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
        return { installed: false, reason: 'Dependencies already installed' };
      } catch {
        // node_modules doesn't exist, install
      }

      // Use bundled npm if available
      const npmCmd = getBundledBinary('node', 'npm');
      console.log(`  Installing npm dependencies...`);
      const installArgs = includeDevDeps ? ['install'] : ['install', '--production'];
      runCommand(npmCmd, installArgs, {
        cwd: project.root,
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
        runCommand(pipCmd, ['install', '-r', 'requirements.txt'], {
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

export function getSecretName(secret) {
  if (typeof secret === 'string') return secret;
  if (!secret || typeof secret !== 'object') return null;
  return secret.name || secret.key || null;
}

export function isSecretRequired(secret) {
  if (!secret || typeof secret !== 'object') return true;
  return secret.required !== false;
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

export function getRelatedSkillInstallMode(flags = {}) {
  if (flags['with-related-skills'] || flags.withRelatedSkills) return 'include';
  if (flags['no-related-skills'] || flags.noRelatedSkills) return 'skip';
  return 'offer';
}

export function buildRelatedSkillInstallPlan(resolved, flags = {}) {
  const mode = getRelatedSkillInstallMode(flags);
  const relatedSkills = Array.isArray(resolved?.relatedSkills)
    ? resolved.relatedSkills
    : [];
  const operatorSkill = relatedSkills.find((skill) => skill.isOperator) || null;
  const companionSkills = relatedSkills.filter((skill) => !skill.isOperator);
  const forceExternalOperator = Boolean(
    flags.force &&
    resolved?.source?.type === 'github' &&
    operatorSkill?.source?.type === 'github'
  );
  const missingOperator = operatorSkill && (!operatorSkill.installed || forceExternalOperator)
    ? [operatorSkill]
    : [];
  const missingCompanions = companionSkills.filter((skill) => !skill.installed);
  const missing = [...missingOperator, ...missingCompanions];

  return {
    mode,
    relatedSkills,
    operatorSkill,
    companionSkills,
    missingOperator,
    missingCompanions,
    missing,
    forceExternalOperator,
    toInstall: [
      ...missingOperator,
      ...(mode === 'include' ? missingCompanions : []),
    ],
  };
}

export function selectRelatedSkillsForInstall(plan, includeCompanions = false) {
  if (!plan) return [];
  const selected = [...(plan.missingOperator || [])];
  if (
    plan.mode === 'include' ||
    (plan.mode === 'offer' && includeCompanions)
  ) {
    selected.push(...(plan.missingCompanions || []));
  }
  return selected;
}

export function getExternalAgentInstallGuidance(resolved) {
  if (resolved?.kind !== 'agent') return null;
  return {
    error: `${resolved.id} is a vendor-managed Agent Host and cannot be installed by RUDI.`,
    install: resolved.installHints?.manual || 'Install or update it with the provider\'s supported installer.',
    verify: 'Verify discovery and authentication with: rudi agent hosts --json',
  };
}

export async function activateInstalledStack(stackId, options = {}, dependencies = {}) {
  const missingSecrets = Array.isArray(options.missingSecrets)
    ? [...new Set(options.missingSecrets.filter(Boolean))]
    : [];
  if (missingSecrets.length > 0) {
    return { status: 'pending_secrets', missingSecrets };
  }

  const rebuild = dependencies.indexAllStacks || indexAllStacks;
  const result = await rebuild({
    stacks: [stackId],
    log: typeof options.log === 'function' ? options.log : () => {},
    timeout: 20000,
  });
  if (!result || result.failed > 0 || result.indexed !== 1) {
    throw new Error(`Tool indexing failed for ${stackId}`);
  }
  return { status: 'indexed', result };
}

export function getInstallActivationPolicy(resolved, allowScripts = false) {
  if (resolved?.source?.type === 'github' && !allowScripts) {
    return {
      activate: false,
      reason: 'Downloaded GitHub stack execution is disabled until --allow-scripts is explicitly approved',
    };
  }
  return { activate: true };
}

export function deferExternalStackActivation(stackId, dependencies = {}) {
  const removeCachedStack = dependencies.removeStackFromToolIndex || removeStackFromToolIndex;
  const removedCachedEntry = removeCachedStack(stackId);
  return { status: 'deferred', removedCachedEntry };
}

export async function activateExternalStackSafely(
  stackId,
  resolved,
  allowScripts,
  options = {},
  dependencies = {},
) {
  deferExternalStackActivation(stackId, dependencies);
  const activationPolicy = getInstallActivationPolicy(resolved, allowScripts);
  if (!activationPolicy.activate) {
    return { status: 'deferred', reason: activationPolicy.reason };
  }
  return activateInstalledStack(stackId, options, dependencies);
}

export async function syncRelatedSkillWrappers(
  relatedSkills,
  installResults,
  installedAgents,
  dependencies = {}
) {
  const successful = new Map(
    (installResults || [])
      .filter((result) => result?.success && result.path)
      .map((result) => [result.id, result])
  );
  const skills = (relatedSkills || [])
    .filter((skill) => successful.has(skill.id))
    .map((skill) => {
      const installed = successful.get(skill.id);
      const entryPath = fsSync.existsSync(installed.path)
        && fsSync.statSync(installed.path).isDirectory()
        ? path.join(installed.path, 'SKILL.md')
        : installed.path;
      return {
        ...skill,
        source: 'rudi',
        path: installed.path,
        entryPath,
      };
    });
  if (skills.length === 0) {
    return { targets: [], skillIds: [], results: {}, errors: {}, outcomes: {} };
  }

  const agentIds = new Set((installedAgents || []).map((agent) => agent.id));
  const targets = [];
  const results = {};
  const errors = {};
  const outcomes = {};
  const codexSync = dependencies.syncCodexSkills || syncCodexSkills;
  const claudeSync = dependencies.syncClaudeSkills || syncClaudeSkills;

  if (agentIds.has('codex')) {
    targets.push('codex');
    try {
      results.codex = await codexSync({ skills, force: false });
    } catch (error) {
      errors.codex = error instanceof Error ? error.message : String(error);
    }
  }
  if ([...agentIds].some((id) => id === 'claude-code' || id === 'claude-desktop')) {
    targets.push('claude');
    try {
      results.claude = await claudeSync({ skills, force: false });
    } catch (error) {
      errors.claude = error instanceof Error ? error.message : String(error);
    }
  }

  for (const target of targets) {
    const items = Array.isArray(results[target]?.results) ? results[target].results : [];
    const changed = items.filter((item) => ['created', 'updated'].includes(item.action)).length;
    const skipped = items.filter((item) => item.action === 'skipped').length;
    const failed = items.filter((item) => item.action === 'failed').length;
    outcomes[target] = {
      status: failed > 0
        ? 'failed'
        : changed > 0
          ? 'changed'
          : skipped > 0
            ? 'preserved'
            : 'unchanged',
      changed,
      skipped,
      failed,
    };
  }

  return {
    targets,
    skillIds: skills.map((skill) => skill.id),
    results,
    errors,
    outcomes,
  };
}

function printRelatedSkillSummary(plan) {
  if (!plan || plan.relatedSkills.length === 0) return;

  console.log(`\nOperator skill:`);
  if (plan.operatorSkill) {
    const status = plan.operatorSkill.installed ? '(installed)' : '(will install with stack)';
    console.log(`  - ${plan.operatorSkill.id} ${status}`);
  } else {
    console.log(`  - missing from registry metadata`);
  }

  if (plan.companionSkills.length === 0) return;

  console.log(`\nCompanion skills:`);
  for (const skill of plan.companionSkills) {
    const status = skill.installed ? '(installed)' : '(available)';
    console.log(`  - ${skill.id} ${status}`);
  }

  if (plan.missingCompanions.length === 0) {
    console.log(`  All companion skills are already installed.`);
  } else if (plan.mode === 'include') {
    console.log(`  Missing companion skills will be installed after the stack.`);
  } else if (plan.mode === 'skip') {
    console.log(`  Skipping companion skills because --no-related-skills was set.`);
  } else {
    console.log(`  Companion skills are editable workflow playbooks installed into ~/.rudi/skills.`);
  }
}

async function promptForRelatedSkills(plan) {
  if (!plan || plan.missing.length === 0) return [];
  if (plan.mode === 'include' || plan.mode === 'skip') {
    return selectRelatedSkillsForInstall(plan);
  }
  if (plan.missingCompanions.length === 0) {
    return selectRelatedSkillsForInstall(plan);
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return selectRelatedSkillsForInstall(plan);
  }

  const { createInterface } = await import('node:readline/promises');
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const label = plan.missingCompanions.length === 1
      ? plan.missingCompanions[0].id
      : `${plan.missingCompanions.length} companion skills`;
    const answer = await readline.question(`\nInstall ${label} now? [y/N] `);
    return selectRelatedSkillsForInstall(plan, /^(y|yes)$/i.test(answer.trim()));
  } finally {
    readline.close();
  }
}

async function installRelatedSkills(skills, options = {}) {
  const {
    allowScripts = false,
    withShims = false,
    deferFinalize = false,
    forceExternal = false,
    installPackage: installResolvedPackage = installPackage,
  } = options;
  const results = [];

  for (const skill of skills) {
    console.log(`  Installing related skill ${skill.id}...`);
    const result = await installResolvedPackage(skill.id, {
      force: skill.sourceMismatch || (forceExternal && skill.source?.type === 'github'),
      allowScripts,
      withShims,
      deferFinalize: deferFinalize && skill.source?.type === 'github',
      resolvedPackage: skill,
      onProgress: (progress) => {
        if (progress.phase === 'installing') {
          console.log(`    Installing ${progress.package}...`);
        }
      }
    });

    results.push({
      id: skill.id,
      success: result.success,
      path: result.path,
      alreadyInstalled: result.alreadyInstalled,
      error: result.error,
      transaction: result.transaction,
    });
  }

  return results;
}

async function installAndSyncStackSkills(plan, options = {}) {
  const {
    allowScripts = false,
    withShims = false,
    deferFinalize = false,
    deferSync = false,
    forceExternal = false,
    installedAgents = getInstalledAgents(),
    installPackage: installResolvedPackage = installPackage,
  } = options;
  const selectedSkills = await promptForRelatedSkills(plan);
  const installResults = selectedSkills.length > 0
    ? await installRelatedSkills(selectedSkills, {
        allowScripts,
        withShims,
        deferFinalize,
        forceExternal,
        installPackage: installResolvedPackage,
      })
    : [];

  if (installResults.length > 0) {
    console.log(`\n  Installed skills:`);
    for (const result of installResults) {
      if (result.success) {
        console.log(`    - ${result.id} installed`);
      } else {
        console.log(`    - ${result.id} failed: ${result.error}`);
      }
    }
  }

  const wrapperSync = deferSync
    ? null
    : await syncRelatedSkillWrappers(
        plan.relatedSkills,
        installResults,
        installedAgents
      );
  reportRelatedSkillWrapperSync(wrapperSync);

  return { selectedSkills, installResults, wrapperSync };
}

function reportRelatedSkillWrapperSync(wrapperSync) {
  if (!wrapperSync) return;
  for (const target of wrapperSync.targets) {
    if (wrapperSync.errors[target]) {
      console.log(`    - ${target} native skill sync failed: ${wrapperSync.errors[target]}`);
      console.log(`      Retry with: rudi skills sync ${target} ${wrapperSync.skillIds.join(' ')}`);
    } else if (wrapperSync.outcomes[target]?.status === 'preserved') {
      console.log(`    - ${target} native skill wrapper preserved (${wrapperSync.outcomes[target].skipped} existing)`);
      console.log(`      Update only these wrappers with: rudi skills sync ${target} ${wrapperSync.skillIds.join(' ')} --force`);
    } else if (wrapperSync.outcomes[target]?.status === 'failed') {
      console.log(`    - ${target} native skill sync reported ${wrapperSync.outcomes[target].failed} failure(s)`);
    } else {
      console.log(`    - ${target} native skill wrapper synced (${wrapperSync.outcomes[target]?.changed || 0} changed)`);
    }
  }
}

/**
 * Find a stack entry point from its command
 * @returns {{ entryArg: string|null, entryPath: string|null, error?: string }}
 */
function getStackEntryPoint(stackPath, manifest) {
  const command = getStackCommand(manifest);
  if (!command || command.length === 0) {
    return { entryArg: null, entryPath: null, error: 'No command defined in manifest' };
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
    const resolved = resolveContainedStackPath(stackPath, arg);
    if (resolved.error) return { entryArg: arg, entryPath: null, error: resolved.error };
    return { entryArg: arg, entryPath: resolved.path };
  }

  return { entryArg: null, entryPath: null }; // No file args found, assume command is valid
}

function resolveContainedStackPath(stackPath, value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\0') ||
    path.isAbsolute(value)
  ) {
    return { error: `Stack command path must be relative to the installed package: ${value}` };
  }
  const root = path.resolve(stackPath);
  const candidate = path.resolve(root, value);
  if (candidate === root || !candidate.startsWith(`${root}${path.sep}`)) {
    return { error: `Stack command path escapes the installed package: ${value}` };
  }
  return { path: candidate };
}

export function validateExternalStackCommand(stackPath, manifest) {
  const entryPoint = getStackEntryPoint(stackPath, manifest);
  if (entryPoint.error) return { valid: false, error: entryPoint.error };
  if (!entryPoint.entryPath) {
    return {
      valid: false,
      error: 'External stack command must reference an entry file inside the pinned package',
    };
  }
  const relativeEntry = path.relative(path.resolve(stackPath), entryPoint.entryPath);
  const rootSegment = relativeEntry.split(path.sep)[0];
  if (rootSegment === 'runs' || rootSegment === 'outputs') {
    return {
      valid: false,
      error: `External stack command cannot use mutable install state as its entry point: ${entryPoint.entryArg}`,
    };
  }
  return { valid: true, entryPath: entryPoint.entryPath };
}

/**
 * Validate that a stack's entry point exists
 * @returns {{ valid: boolean, error?: string }}
 */
function validateStackEntryPoint(stackPath, manifest) {
  const runtime = getStackRuntime(manifest);

  // Binary stacks: validate binary exists and is executable
  if (runtime === 'binary') {
    const command = getStackCommand(manifest);
    if (!command || command.length === 0) {
      return { valid: false, error: 'Binary stack has no command' };
    }
    const binName = command[0].replace(/^\.\//, '');
    const resolved = resolveContainedStackPath(stackPath, binName);
    if (resolved.error) return { valid: false, error: resolved.error };
    const binaryPath = resolved.path;
    if (!fsSync.existsSync(binaryPath)) {
      return { valid: false, error: `Binary not found: ${command[0]}` };
    }
    if (process.platform !== 'win32') {
      const stats = fsSync.statSync(binaryPath);
      if ((stats.mode & 0o111) === 0) {
        return { valid: false, error: `Binary not executable: ${command[0]}` };
      }
    }
    return { valid: true };
  }

  const entryPoint = getStackEntryPoint(stackPath, manifest);

  if (entryPoint.error) {
    return { valid: false, error: entryPoint.error };
  }

  if (!entryPoint.entryPath) {
    return { valid: true };
  }

  if (!fsSync.existsSync(entryPoint.entryPath)) {
    return { valid: false, error: `Entry point not found: ${entryPoint.entryArg}` };
  }

  return { valid: true };
}

export async function buildStackIfNeeded(stackPath, manifest, options = {}) {
  const { nodeProject, verbose = false, allowScripts = true } = options;
  const runtime = getStackRuntime(manifest);

  if (runtime !== 'node') {
    return { built: false, reason: 'Non-node runtime' };
  }

  const entryPoint = getStackEntryPoint(stackPath, manifest);
  if (entryPoint.error) {
    return { built: false, reason: entryPoint.error };
  }

  if (!entryPoint.entryPath || fsSync.existsSync(entryPoint.entryPath)) {
    return { built: false, reason: 'Entry point already present' };
  }

  const project = nodeProject || getNodeProjectInfo(stackPath);
  if (!project) {
    return { built: false, reason: 'No package.json' };
  }

  if (project.error) {
    throw new Error(`Failed to read package.json: ${project.error}`);
  }

  if (!project.packageJson?.scripts?.build) {
    return { built: false, reason: 'No build script' };
  }

  if (!allowScripts) {
    throw new Error(
      'External stack build scripts are disabled by default; review the pinned source and rerun with --allow-scripts'
    );
  }

  const npmCmd = getBundledBinary('node', 'npm');
  console.log(`  Building stack...`);

  try {
    runCommand(npmCmd, ['run', 'build'], {
      cwd: project.root,
      stdio: verbose ? 'inherit' : 'pipe',
    });
  } catch (buildError) {
    const stderr = buildError.stderr?.toString() || '';
    const stdout = buildError.stdout?.toString() || '';
    const output = stderr || stdout || buildError.message;
    throw new Error(`Build failed:\n${output}`);
  }

  return { built: true };
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
    const isRequired = isSecretRequired(secret);
    if (!key) continue;

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

async function cleanupFailedStackInstall(stackId, stackPath, removeConfig) {
  if (stackPath) {
    try {
      await fs.rm(stackPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }

  if (removeConfig && stackId) {
    try {
      removeStack(stackId);
    } catch {
      // Ignore config cleanup errors
    }
  }
}

function snapshotStackRegistration(stackId, manifest) {
  const config = readRudiConfig();
  const stacks = config?.stacks || {};
  const secrets = config?.secrets || {};
  const hasStack = Object.prototype.hasOwnProperty.call(stacks, stackId);
  const secretNames = [...new Set(
    getManifestSecrets(manifest).map(getSecretName).filter(Boolean)
  )];

  return {
    stackId,
    hasStack,
    stack: hasStack ? structuredClone(stacks[stackId]) : null,
    secrets: secretNames.map((name) => ({
      name,
      exists: Object.prototype.hasOwnProperty.call(secrets, name),
      value: Object.prototype.hasOwnProperty.call(secrets, name)
        ? structuredClone(secrets[name])
        : null,
    })),
  };
}

function restoreStackRegistration(snapshot) {
  if (!snapshot) return;
  updateRudiConfig((config) => {
    if (snapshot.hasStack) config.stacks[snapshot.stackId] = snapshot.stack;
    else delete config.stacks[snapshot.stackId];

    for (const secret of snapshot.secrets) {
      if (secret.exists) config.secrets[secret.name] = secret.value;
      else delete config.secrets[secret.name];
    }
  });
}

async function rollbackDeferredTransactions(transactions, rollback = rollbackDeferredInstall) {
  const errors = [];
  for (const transaction of [...transactions].reverse()) {
    try {
      await rollback(transaction);
    } catch (error) {
      errors.push(`${transaction.id}: ${error.message}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Deferred install rollback failed: ${errors.join('; ')}`);
  }
}

export async function cmdInstall(args, flags, dependencies = {}) {
  const fetchRegistryIndex = dependencies.fetchIndex || fetchIndex;
  const resolveRegistryPackage = dependencies.resolvePackage || resolvePackage;
  const installResolvedPackage = dependencies.installPackage || installPackage;
  const prepareDeferred = dependencies.prepareDeferredInstall || prepareDeferredInstall;
  const commitDeferred = dependencies.commitDeferredInstall || commitDeferredInstall;
  const rollbackDeferred = dependencies.rollbackDeferredInstall || rollbackDeferredInstall;
  const exit = dependencies.exit || (code => process.exit(code));
  const printError = dependencies.error || console.error;
  let pkgId = args[0];

  if (flags.json === true) {
    printError('rudi install does not support --json; use rudi update ... --dry-run --json for machine-readable planning');
    return exit(1);
  }

  if (!pkgId) {
    console.error('Usage: rudi install <package>');
    console.error('Example: rudi install slack');
    console.error('');
    console.error('After installing, run:');
    console.error('  rudi secrets set <KEY>    # Configure required secrets');
    console.error('  rudi integrate all        # Wire up your agents');
    return exit(1);
  }

  // Handle deprecated "prompt:" prefix
  if (pkgId.startsWith('prompt:')) {
    console.log('Note: "prompt:" has been renamed to "skill:". Converting automatically.\n');
    pkgId = 'skill:' + pkgId.slice('prompt:'.length);
  }

  if (pkgId.trim().startsWith('agent:')) {
    printError(`\n✗ ${pkgId.trim()} is a vendor-managed Agent Host and cannot be installed by RUDI.`);
    printError('  Install, update, and authenticate it through its provider.');
    printError('  Verify discovery and authentication with: rudi agent hosts --json');
    return exit(1);
  }

  const force = flags.force || false;
  const allowScripts = flags['allow-scripts'] || flags.allowScripts || false;
  const withShims = flags['with-shims'] || flags.withShims || false;

  console.log(`Resolving ${pkgId}...`);

  try {
    if (!pkgId.startsWith('npm:') && !/^https?:\/\//i.test(pkgId)) {
      await fetchRegistryIndex({ force: true });
    }

    // First resolve to show what will be installed
    const resolved = await resolveRegistryPackage(pkgId);
    const relatedSkillPlan = buildRelatedSkillInstallPlan(resolved, flags);
    const externalSourceMismatch = Boolean(
      resolved.source?.type === 'github' && (
        resolved.sourceMismatch ||
        relatedSkillPlan.operatorSkill?.sourceMismatch
      )
    );

    console.log(`\nPackage: ${resolved.name} (${resolved.id})`);
    console.log(`Version: ${resolved.version}`);
    if (resolved.description) {
      console.log(`Description: ${resolved.description}`);
    }
    if (resolved.source?.type === 'github') {
      const sourceLabel = resolved.source.repository || resolved.source.requestedUrl || 'GitHub';
      console.log(`Source: ${sourceLabel}@${resolved.source.resolvedCommit}`);
    }

    if (externalSourceMismatch && !force) {
      printError(`\n✗ ${resolved.id} or its operator skill is installed from a different source snapshot.`);
      printError('  Review the pinned source shown above, then rerun this exact GitHub URL with --force.');
      return exit(1);
    }

    const externalAgentGuidance = getExternalAgentInstallGuidance(resolved);
    if (externalAgentGuidance) {
      console.error(`\n✗ ${externalAgentGuidance.error}`);
      console.error(`  ${externalAgentGuidance.install}`);
      console.error(`  ${externalAgentGuidance.verify}`);
      return exit(1);
    }

    if (resolved.installed && !force) {
      if (resolved.kind === 'stack' && relatedSkillPlan.missing.length > 0) {
        console.log(`\nStack already installed. Installing missing operator or companion skills.`);
        await installAndSyncStackSkills(relatedSkillPlan, {
          allowScripts,
          withShims,
          installPackage: installResolvedPackage,
        });
        return;
      }
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

    if (resolved.kind === 'stack') {
      printRelatedSkillSummary(relatedSkillPlan);
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
        const name = getSecretName(secret);
        const isRequired = isSecretRequired(secret);
        if (!name) continue;

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
      return exit(1);
    }

    console.log(`\nInstalling...`);

    const result = await installResolvedPackage(resolved.id, {
      force,
      allowScripts,
      withShims,
      deferFinalize: resolved.kind === 'stack' && resolved.source?.type === 'github',
      resolvedPackage: resolved,
      onProgress: (progress) => {
        if (progress.phase === 'installing') {
          console.log(`  Installing ${progress.package}...`);
        }
      }
    });

    if (!result.success) {
      console.error(`\n✗ Installation failed: ${result.error}`);
      return exit(1);
    }

    if (resolved.kind !== 'stack') {
      console.log(`\n✓ Installed ${result.id}`);
      console.log(`  Path: ${result.path}`);

      if (result.installed?.length > 0) {
        console.log(`\n  Also installed:`);
        for (const id of result.installed) {
          console.log(`    - ${id}`);
        }
      }

      // For skills, show required stacks if any
      if (resolved.kind === 'skill' && resolved.requires?.stacks?.length > 0) {
        console.log(`  Required stacks: ${resolved.requires.stacks.join(', ')}`);
      }

      console.log(`\n✓ Installed successfully.`);
      return;
    }

    const deferredTransactions = result.transaction ? [result.transaction] : [];
    const manifest = await loadManifest(result.path);
    if (!manifest) {
      if (deferredTransactions.length > 0) {
        await rollbackDeferredTransactions(deferredTransactions, rollbackDeferred);
      } else {
        await cleanupFailedStackInstall(result.id, result.path, false);
      }
      throw new Error('Stack manifest not found after install');
    }

    const nodeProject = getNodeProjectInfo(result.path);
    const includeDevDeps = Boolean(nodeProject?.packageJson?.scripts?.build);
    let stackRegistered = false;
    let registrationAttempted = false;
    let registrationSnapshot = null;
    let installsCommitted = false;
    let relatedSkillResults = [];
    let relatedOutcome = null;

    try {
      const depResult = resolved.source?.type === 'github'
        ? { installed: false, reason: 'Dependencies installed in the staged package' }
        : await installDependencies(result.path, manifest, {
            includeDevDeps,
            nodeProject,
          });

      if (depResult.installed) {
        console.log(`  ✓ Dependencies installed`);
      } else if (depResult.error) {
        throw new Error(`Failed to install dependencies:\n${depResult.error}`);
      }

      if (resolved.source?.type === 'github') {
        const externalCommand = validateExternalStackCommand(result.path, manifest);
        if (!externalCommand.valid) {
          throw new Error(`External stack command rejected: ${externalCommand.error}`);
        }
      }

      const buildResult = await buildStackIfNeeded(result.path, manifest, {
        nodeProject,
        verbose: flags.verbose,
        allowScripts: resolved.source?.type !== 'github' || allowScripts,
      });

      if (buildResult.built) {
        console.log(`  ✓ Build complete`);
      }

      const validation = validateStackEntryPoint(result.path, manifest);
      if (!validation.valid) {
        throw new Error(`Stack validation failed: ${validation.error}`);
      }

      relatedOutcome = await installAndSyncStackSkills(
        relatedSkillPlan,
        {
          allowScripts,
          withShims,
          deferFinalize: resolved.source?.type === 'github',
          deferSync: resolved.source?.type === 'github',
          forceExternal: relatedSkillPlan.forceExternalOperator,
          installPackage: installResolvedPackage,
        }
      );
      relatedSkillResults = relatedOutcome.installResults;
      deferredTransactions.push(
        ...relatedSkillResults.map((item) => item.transaction).filter(Boolean)
      );

      if (relatedSkillPlan.missingOperator.length > 0) {
        const operatorId = relatedSkillPlan.missingOperator[0].id;
        const operatorResult = relatedSkillResults.find((item) => item.id === operatorId);
        if (!operatorResult?.success) {
          throw new Error(
            `Required operator skill ${operatorId} failed to install: ${operatorResult?.error || 'no install result'}`
          );
        }
      }

      registrationSnapshot = snapshotStackRegistration(result.id, manifest);
      registrationAttempted = true;
      addStack(result.id, {
        path: result.path,
        runtime: getStackRuntime(manifest),
        command: getStackCommand(manifest),
        secrets: getManifestSecrets(manifest),
        version: manifest.version
      });
      stackRegistered = true;
      console.log(`  ✓ Updated rudi.json`);

      if (resolved.source?.type !== 'github') {
        const activation = await activateInstalledStack(result.id, {
          missingSecrets: secretsCheck.missing,
        });
        if (activation.status === 'indexed') {
          console.log(`  ✓ Indexed MCP tools`);
        }
      }

      for (const transaction of deferredTransactions) {
        await prepareDeferred(transaction);
      }
      for (const transaction of deferredTransactions) {
        const commit = commitDeferred(transaction);
        if (commit.cleanupError) {
          console.warn(`  Warning: installed ${transaction.id}, but could not remove its backup: ${commit.cleanupError}`);
        }
      }
      installsCommitted = true;
    } catch (stackError) {
      let rollbackError = null;
      try {
        if (registrationAttempted) restoreStackRegistration(registrationSnapshot);
        if (!installsCommitted && deferredTransactions.length > 0) {
          await rollbackDeferredTransactions(deferredTransactions, rollbackDeferred);
        } else if (deferredTransactions.length === 0) {
          await cleanupFailedStackInstall(result.id, result.path, stackRegistered);
        }
      } catch (error) {
        rollbackError = error;
      }
      if (rollbackError) {
        throw new Error(`${stackError.message}; rollback also failed: ${rollbackError.message}`);
      }
      throw stackError;
    }

    if (resolved.source?.type === 'github') {
      try {
        const wrapperSync = await syncRelatedSkillWrappers(
          relatedSkillPlan.relatedSkills,
          relatedSkillResults,
          getInstalledAgents()
        );
        reportRelatedSkillWrapperSync(wrapperSync);
      } catch (error) {
        console.warn(`  Warning: native skill sync failed after install: ${error.message}`);
      }

      try {
        const activation = await activateExternalStackSafely(
          result.id,
          resolved,
          allowScripts,
          { missingSecrets: secretsCheck.missing },
          {
            removeStackFromToolIndex: dependencies.removeStackFromToolIndex,
            indexAllStacks: dependencies.indexAllStacks,
          },
        );
        if (activation.status === 'indexed') {
          console.log(`  ✓ Indexed MCP tools`);
        } else if (activation.status === 'deferred') {
          console.log(`  ○ MCP indexing deferred: ${activation.reason}`);
        }
      } catch (error) {
        console.warn(`  Warning: stack installed, but MCP indexing failed: ${error.message}`);
        console.warn(`  Retry after resolving the stack issue: rudi index ${result.id}`);
      }
    }

    console.log(`\n✓ Installed ${result.id}`);
    console.log(`  Path: ${result.path}`);

    if (result.installed?.length > 0) {
      console.log(`\n  Also installed:`);
      for (const id of result.installed) {
        console.log(`    - ${id}`);
      }
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
          getSecretName(s) === key
        );
        const helpUrl = getSecretLink(secret);
        console.log(`     rudi secrets set ${key} "<your-value>"`);
        if (helpUrl) {
          console.log(`     # Get yours: ${helpUrl}`);
        }
      }
      console.log(`\n     Activate tools after configuring secrets: rudi index ${result.id}`);
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

    const installedRelatedSkillIds = new Set(
      relatedSkillResults.filter((relatedResult) => relatedResult.success).map((relatedResult) => relatedResult.id)
    );
    const remainingRelatedSkills = relatedSkillPlan.missing.filter(
      (skill) => !installedRelatedSkillIds.has(skill.id)
    );
    if (remainingRelatedSkills.length > 0) {
      console.log(`\n  Related skills available:`);
      for (const skill of remainingRelatedSkills) {
        console.log(`     - ${skill.id}`);
      }
      console.log(`     Install/edit them with: rudi install ${resolved.id} --with-related-skills`);
      console.log(`     Editable after install: ~/.rudi/skills`);
    }
    return;

  } catch (error) {
    console.error(`Installation failed: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    return exit(1);
  }
}
