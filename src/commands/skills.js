/**
 * Skills command - list installed skills or sync RUDI skills to agent-native
 * skill directories.
 */

import { listInstalled } from '@learnrudi/core';
import {
  buildCodexSkillFiles,
  buildPortableSkillFiles,
  getNativeSkillRoot,
  reconcileNativeSkills,
} from '../native-skills/lifecycle.js';
import { cmdList } from './list.js';

export { buildCodexSkillFiles };
export const buildClaudeSkillFiles = buildPortableSkillFiles;

function isRudiOwnedSkill(skill) {
  return !skill?.source || skill.source === 'rudi' || typeof skill.source === 'object';
}

async function syncHostSkills(host, rootKey, configuredRoot, options = {}) {
  const installedSkills = options.skills || await listInstalled('skill');
  const skills = installedSkills.filter(isRudiOwnedSkill);
  const root = configuredRoot || getNativeSkillRoot(host, options);
  const reconciled = await reconcileNativeSkills({
    ...options,
    hosts: [host],
    skills,
    roots: { [host]: root },
  });
  return {
    [rootKey]: root,
    total: skills.length,
    results: reconciled.results[host],
    failed: reconciled.failed,
    restartRequired: reconciled.restartRequired,
  };
}

export async function syncCodexSkills(options = {}) {
  return syncHostSkills('codex', 'codexRoot', options.codexRoot, options);
}

export async function syncClaudeSkills(options = {}) {
  return syncHostSkills('claude', 'claudeRoot', options.claudeRoot, options);
}

export async function syncGeminiSkills(options = {}) {
  return syncHostSkills('gemini', 'geminiRoot', options.geminiRoot, options);
}

export async function syncAntigravitySkills(options = {}) {
  return syncHostSkills('antigravity', 'antigravityRoot', options.antigravityRoot, options);
}

function normalizeRequestedSkillId(value) {
  const id = String(value || '').trim();
  if (!id.startsWith('skill:') || id.length === 'skill:'.length) {
    throw new Error(`Invalid skill package id "${id}". Expected skill:<name>`);
  }
  return id;
}

export async function resolveSkillSyncSelection(requestedIds, dependencies = {}) {
  const getInstalled = dependencies.listInstalled || listInstalled;
  const installed = await getInstalled('skill');
  const rudiSkills = (Array.isArray(installed) ? installed : [])
    .filter(isRudiOwnedSkill);
  const byId = new Map(rudiSkills.map((skill) => [skill.id, skill]));
  const selected = [];
  const seen = new Set();

  for (const value of requestedIds || []) {
    const id = normalizeRequestedSkillId(value);
    if (seen.has(id)) continue;
    seen.add(id);

    const skill = byId.get(id);
    if (!skill) {
      throw new Error(`Installed RUDI skill not found: ${id}`);
    }
    selected.push(skill);
  }

  return selected;
}

const NATIVE_SKILL_SYNC_TARGETS = ['codex', 'claude', 'gemini', 'antigravity'];

export function parseNativeSkillSyncTargets(value) {
  if (value === undefined || value === null || value === false) return [];
  if (Array.isArray(value) && value.length === 0) return [];
  if (value === true) {
    throw new Error('--sync-skills requires a host name');
  }

  const requested = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (requested.length === 0) {
    throw new Error('--sync-skills requires a host name');
  }
  if (requested.includes('all')) {
    if (requested.length !== 1) {
      throw new Error('Use --sync-skills=all by itself');
    }
    return [...NATIVE_SKILL_SYNC_TARGETS];
  }

  const targets = [];
  const seen = new Set();
  for (const target of requested) {
    if (!NATIVE_SKILL_SYNC_TARGETS.includes(target)) {
      throw new Error(`Unsupported native skill host "${target}"`);
    }
    if (seen.has(target)) continue;
    seen.add(target);
    targets.push(target);
  }
  return targets;
}

export async function syncSelectedSkillsToNativeHosts(options = {}, dependencies = {}) {
  const targets = parseNativeSkillSyncTargets(options.targets);
  const skillIds = Array.isArray(options.skillIds) ? options.skillIds : [];
  if (targets.length === 0 || skillIds.length === 0) {
    return {
      targets,
      skillIds: [],
      results: {},
      failed: 0,
      failures: [],
      restartRequired: false,
    };
  }

  const skills = await resolveSkillSyncSelection(skillIds, dependencies);
  const syncers = {
    codex: dependencies.syncCodexSkills || syncCodexSkills,
    claude: dependencies.syncClaudeSkills || syncClaudeSkills,
    gemini: dependencies.syncGeminiSkills || syncGeminiSkills,
    antigravity: dependencies.syncAntigravitySkills || syncAntigravitySkills,
  };
  const results = {};
  const failures = [];

  for (const target of targets) {
    try {
      results[target] = await syncers[target]({
        skills,
        force: options.force === true,
        dryRun: options.dryRun === true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results[target] = {
        total: skills.length,
        results: skills.map((skill) => ({
          id: skill.id,
          action: 'failed',
          error: message,
        })),
      };
    }

    for (const item of Array.isArray(results[target]?.results) ? results[target].results : []) {
      if (item.action !== 'failed') continue;
      failures.push({
        target,
        id: item.id || null,
        error: item.error || 'Native skill projection failed',
      });
    }
  }

  return {
    targets,
    skillIds: skills.map((skill) => skill.id),
    results,
    failed: failures.length,
    failures,
    restartRequired: Object.values(results).some(result => result.restartRequired === true),
  };
}

function printSkillsHelp() {
  console.log(`
rudi skills - List or sync installed RUDI skills

USAGE
  rudi skills
  rudi skills sync <codex|claude|gemini|antigravity> <skill:id>... [options]
  rudi skills sync <codex|claude|gemini|antigravity> [--all] [options]

OPTIONS
  --all        Explicitly select the whole installed RUDI skill inventory
  --force      Replace drifted or unmanaged wrappers in the exact selected scope;
               whole-inventory force requires --all
  --dry-run    Preview sync results without writing files
  --json       Output JSON

OWNERSHIP
  ~/.rudi/skills is canonical. Native host trees are derived complete-tree
  projections with receipts under ~/.rudi/state/native-skills/<host>/.

EXAMPLES
  rudi skills
  rudi skills sync codex
  rudi skills sync claude
  rudi skills sync gemini
  rudi skills sync antigravity
  rudi skills sync codex skill:rudi-change-map skill:rudi-engineering-gate --force
  rudi skills sync codex --all --force
`);
}

function assertBooleanSkillSyncFlags(flags) {
  for (const name of ['all', 'force', 'dry-run', 'json']) {
    if (flags[name] !== undefined && typeof flags[name] !== 'boolean') {
      throw new Error(`--${name} does not accept a value`);
    }
  }
}

export async function cmdSkills(args = [], flags = {}, dependencies = {}) {
  const log = dependencies.log || console.log;
  const subcommand = args[0];

  if (subcommand === 'help' || flags.help || flags.h) {
    printSkillsHelp();
    return;
  }

  if (!subcommand) {
    return await cmdList(['skills'], flags);
  }

  if (subcommand !== 'sync') {
    return await cmdList(['skills', ...args], flags);
  }

  assertBooleanSkillSyncFlags(flags);

  const target = args[1];
  const requestedSkillIds = args.slice(2);
  const force = flags.force === true;
  const all = flags.all === true;
  if (requestedSkillIds.length > 0 && all) {
    throw new Error('Choose exact skill IDs or --all, not both');
  }
  if (requestedSkillIds.length === 0 && force && !all) {
    throw new Error('Refusing to force-sync the whole skill inventory without explicit --all');
  }
  const targets = {
    codex: { name: 'Codex', sync: dependencies.syncCodexSkills || syncCodexSkills, rootKey: 'codexRoot' },
    claude: { name: 'Claude', sync: dependencies.syncClaudeSkills || syncClaudeSkills, rootKey: 'claudeRoot' },
    gemini: { name: 'Gemini', sync: dependencies.syncGeminiSkills || syncGeminiSkills, rootKey: 'geminiRoot' },
    antigravity: { name: 'Antigravity', sync: dependencies.syncAntigravitySkills || syncAntigravitySkills, rootKey: 'antigravityRoot' },
  };
  const targetConfig = targets[target];
  if (!targetConfig) {
    throw new Error('Usage: rudi skills sync <codex|claude|gemini|antigravity> <skill:id>... [--all] [--force] [--dry-run] [--json]');
  }

  const skills = requestedSkillIds.length > 0
    ? await resolveSkillSyncSelection(requestedSkillIds, dependencies)
    : null;
  const result = await targetConfig.sync({
    skills,
    force,
    dryRun: flags['dry-run'] === true || flags.dryRun === true,
  });

  if (flags.json) {
    log(JSON.stringify(result, null, 2));
    return;
  }

  const targetName = targetConfig.name;
  const skillsRoot = result[targetConfig.rootKey];
  log(`${targetName} skills root: ${skillsRoot}`);
  for (const item of result.results) {
    if (item.action === 'failed') {
      log(`  x ${item.id}: ${item.error}`);
    } else if (['drifted', 'unmanaged', 'would_preserve_drifted', 'would_preserve_unmanaged'].includes(item.action)) {
      log(`  ! ${item.id}: ${item.action} (${item.reason})`);
    } else {
      log(`  ok ${item.id}: ${item.action} ${item.targetDir}`);
    }
  }

  const syncedCount = result.results.filter(item => (
    item.action === 'created' ||
    item.action === 'updated' ||
    item.action === 'adopted' ||
    item.action === 'would_create' ||
    item.action === 'would_update' ||
    item.action === 'would_adopt'
  )).length;
  const prefix = result.results.some(item => item.action.startsWith('would_'))
    ? 'Would sync'
    : 'Synced';
  log(`\n${prefix} ${syncedCount} skill(s).`);
  if (result.restartRequired) {
    log(`Restart ${targetName} to load native skill changes; hot reload was not performed.`);
  }
}
