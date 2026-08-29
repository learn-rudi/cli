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
import { fetchIndex, installPackage, resolvePackage, checkAllDependencies, formatDependencyResults, addStack, removeStack, updateSecretStatus, indexAllStacks } from '@learnrudi/core';
import { hasSecret, listSecrets, setSecret, getSecret } from '@learnrudi/secrets';
import { getInstalledAgents } from '@learnrudi/mcp';
import { runCommand } from '../utils/subprocess.js';
import { syncClaudeSkills, syncCodexSkills } from './skills.js';

/**
 * Load manifest from installed stack path
 */
export async function loadManifest(installPath) {
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

export function getStackRuntime(manifest) {
  return manifest?.runtime || manifest?.mcp?.runtime || 'node';
}

export function getStackCommand(manifest) {
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

export function getManifestSecrets(manifest) {
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
  const missingOperator = operatorSkill && !operatorSkill.installed
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
  const { allowScripts = false, withShims = false } = options;
  const results = [];

  for (const skill of skills) {
    console.log(`  Installing related skill ${skill.id}...`);
    const result = await installPackage(skill.id, {
      force: false,
      allowScripts,
      withShims,
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
    });
  }

  return results;
}

async function installAndSyncStackSkills(plan, options = {}) {
  const {
    allowScripts = false,
    withShims = false,
    installedAgents = getInstalledAgents(),
  } = options;
  const selectedSkills = await promptForRelatedSkills(plan);
  const installResults = selectedSkills.length > 0
    ? await installRelatedSkills(selectedSkills, { allowScripts, withShims })
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

  const wrapperSync = await syncRelatedSkillWrappers(
    plan.relatedSkills,
    installResults,
    installedAgents
  );
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

  return { selectedSkills, installResults, wrapperSync };
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
    const entryPath = path.join(stackPath, arg);
    return { entryArg: arg, entryPath };
  }

  return { entryArg: null, entryPath: null }; // No file args found, assume command is valid
}

/**
 * Validate that a stack's entry point exists
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStackEntryPoint(stackPath, manifest) {
  const runtime = getStackRuntime(manifest);

  // Binary stacks: validate binary exists and is executable
  if (runtime === 'binary') {
    const command = getStackCommand(manifest);
    if (!command || command.length === 0) {
      return { valid: false, error: 'Binary stack has no command' };
    }
    const binName = command[0].replace(/^\.\//, '');
    const binaryPath = path.join(stackPath, binName);
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
  const {
    force = false,
    nodeProject,
    npmCommand,
    runBuildCommand = runCommand,
    verbose = false,
  } = options;
  const runtime = getStackRuntime(manifest);

  if (runtime !== 'node') {
    return { built: false, reason: 'Non-node runtime' };
  }

  const entryPoint = getStackEntryPoint(stackPath, manifest);
  if (entryPoint.error) {
    return { built: false, reason: entryPoint.error };
  }

  if (
    !entryPoint.entryPath ||
    (fsSync.existsSync(entryPoint.entryPath) && !force)
  ) {
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

  const npmCmd = npmCommand || getBundledBinary('node', 'npm');
  console.log(`  Building stack...`);

  try {
    runBuildCommand(npmCmd, ['run', 'build'], {
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

export async function cmdInstall(args, flags, dependencies = {}) {
  const fetchRegistryIndex = dependencies.fetchIndex || fetchIndex;
  const resolveRegistryPackage = dependencies.resolvePackage || resolvePackage;
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
    process.exit(1);
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
    if (!pkgId.startsWith('npm:')) {
      await fetchRegistryIndex({ force: true });
    }

    // First resolve to show what will be installed
    const resolved = await resolveRegistryPackage(pkgId);
    const relatedSkillPlan = buildRelatedSkillInstallPlan(resolved, flags);

    console.log(`\nPackage: ${resolved.name} (${resolved.id})`);
    console.log(`Version: ${resolved.version}`);
    if (resolved.description) {
      console.log(`Description: ${resolved.description}`);
    }

    const externalAgentGuidance = getExternalAgentInstallGuidance(resolved);
    if (externalAgentGuidance) {
      console.error(`\n✗ ${externalAgentGuidance.error}`);
      console.error(`  ${externalAgentGuidance.install}`);
      console.error(`  ${externalAgentGuidance.verify}`);
      process.exit(1);
    }

    if (resolved.installed && !force) {
      if (resolved.kind === 'stack' && relatedSkillPlan.missing.length > 0) {
        console.log(`\nStack already installed. Installing missing operator or companion skills.`);
        await installAndSyncStackSkills(relatedSkillPlan, { allowScripts, withShims });
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
      process.exit(1);
    }

    console.log(`\nInstalling...`);

    const result = await installPackage(pkgId, {
      force,
      allowScripts,
      withShims,
      onProgress: (progress) => {
        if (progress.phase === 'installing') {
          console.log(`  Installing ${progress.package}...`);
        }
      }
    });

    if (!result.success) {
      console.error(`\n✗ Installation failed: ${result.error}`);
      process.exit(1);
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

    const manifest = await loadManifest(result.path);
    if (!manifest) {
      await cleanupFailedStackInstall(result.id, result.path, false);
      throw new Error('Stack manifest not found after install');
    }

    const nodeProject = getNodeProjectInfo(result.path);
    const includeDevDeps = Boolean(nodeProject?.packageJson?.scripts?.build);
    let stackRegistered = false;

    try {
      const depResult = await installDependencies(result.path, manifest, {
        includeDevDeps,
        nodeProject
      });

      if (depResult.installed) {
        console.log(`  ✓ Dependencies installed`);
      } else if (depResult.error) {
        throw new Error(`Failed to install dependencies:\n${depResult.error}`);
      }

      const buildResult = await buildStackIfNeeded(result.path, manifest, {
        nodeProject,
        verbose: flags.verbose
      });

      if (buildResult.built) {
        console.log(`  ✓ Build complete`);
      }

      const validation = validateStackEntryPoint(result.path, manifest);
      if (!validation.valid) {
        throw new Error(`Stack validation failed: ${validation.error}`);
      }

      addStack(result.id, {
        path: result.path,
        runtime: getStackRuntime(manifest),
        command: getStackCommand(manifest),
        secrets: getManifestSecrets(manifest),
        version: manifest.version
      });
      stackRegistered = true;
      console.log(`  ✓ Updated rudi.json`);

      const activation = await activateInstalledStack(result.id, {
        missingSecrets: secretsCheck.missing,
      });
      if (activation.status === 'indexed') {
        console.log(`  ✓ Indexed MCP tools`);
      }
    } catch (stackError) {
      await cleanupFailedStackInstall(result.id, result.path, stackRegistered);
      throw stackError;
    }

    console.log(`\n✓ Installed ${result.id}`);
    console.log(`  Path: ${result.path}`);

    if (result.installed?.length > 0) {
      console.log(`\n  Also installed:`);
      for (const id of result.installed) {
        console.log(`    - ${id}`);
      }
    }

    const { installResults: relatedSkillResults } = await installAndSyncStackSkills(
      relatedSkillPlan,
      { allowScripts, withShims }
    );

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
    process.exit(1);
  }
}
