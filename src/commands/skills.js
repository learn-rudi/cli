/**
 * Skills command - list installed skills or sync RUDI skills to agent-native
 * skill directories.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { listInstalled } from '@learnrudi/core';
import { CLAUDE_HOME } from '@learnrudi/env';
import { cmdList } from './list.js';

function compactText(value, maxLength = 160) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3).trimEnd()}...`;
}

function lowerFirst(value) {
  if (!value) return value;
  return `${value[0].toLowerCase()}${value.slice(1)}`;
}

function humanizeSkillDisplayName(value) {
  const compact = compactText(value, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(compact)) return compact;
  return compact
    .split('-')
    .map(part => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function yamlString(value) {
  return JSON.stringify(String(value || ''));
}

function stripFrontmatter(content = '') {
  if (!content.startsWith('---\n')) {
    return { metadata: {}, body: content.trimStart() };
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return { metadata: {}, body: content.trimStart() };
  }

  return {
    metadata: parseSimpleFrontmatter(content.slice(4, end)),
    body: content.slice(end + 5).trimStart(),
  };
}

function parseSimpleFrontmatter(frontmatter = '') {
  const metadata = {};

  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    metadata[match[1]] = value;
  }

  return metadata;
}

const BUNDLED_SKILL_RESOURCE_DIRS = ['scripts', 'references', 'assets'];

function copyBundledSkillResources(sourcePath, targetDir) {
  if (path.basename(sourcePath) !== 'SKILL.md') return;

  const sourceDir = path.dirname(sourcePath);
  for (const resourceDir of BUNDLED_SKILL_RESOURCE_DIRS) {
    const sourceResource = path.join(sourceDir, resourceDir);
    const targetResource = path.join(targetDir, resourceDir);
    fs.rmSync(targetResource, { recursive: true, force: true });

    if (!fs.existsSync(sourceResource)) continue;
    const rootStat = fs.lstatSync(sourceResource);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
      throw new Error(`Bundled skill resource must be a directory: ${sourceResource}`);
    }

    fs.cpSync(sourceResource, targetResource, {
      recursive: true,
      filter(candidate) {
        if (fs.lstatSync(candidate).isSymbolicLink()) {
          throw new Error(`Bundled skill resources cannot contain symbolic links: ${candidate}`);
        }
        return true;
      },
    });
  }
}

function normalizeSkillName(pkg) {
  const raw = String(pkg?.id || pkg?.name || '')
    .replace(/^skill:/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return raw || null;
}

function codexSkillsRoot(env = process.env) {
  const codexHome = env.CODEX_HOME
    ? path.resolve(env.CODEX_HOME)
    : path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'skills');
}

function claudeSkillsRoot(env = process.env) {
  const claudeHome = env.CLAUDE_HOME
    ? path.resolve(env.CLAUDE_HOME)
    : CLAUDE_HOME;
  return path.join(claudeHome, 'skills');
}

function geminiSkillsRoot(env = process.env) {
  const geminiHome = env.GEMINI_HOME
    ? path.resolve(env.GEMINI_HOME)
    : path.join(os.homedir(), '.gemini');
  return path.join(geminiHome, 'skills');
}

function antigravitySkillsRoot(env = process.env) {
  const antigravityHome = env.ANTIGRAVITY_HOME
    ? path.resolve(env.ANTIGRAVITY_HOME)
    : path.join(os.homedir(), '.gemini', 'antigravity-cli');
  return path.join(antigravityHome, 'skills');
}

function shortDescription(description, fallback) {
  return compactText(description || fallback, 64);
}

function defaultPrompt(skillName, description, displayName) {
  const action = compactText(lowerFirst(description || `run the ${displayName} workflow`), 120);
  return `Use $${skillName} to ${action}.`;
}

export function buildCodexSkillFiles(pkg, sourceContent) {
  const baseFiles = buildClaudeSkillFiles(pkg, sourceContent);
  const { skillName } = baseFiles;
  const parsed = stripFrontmatter(sourceContent);
  const displayName = humanizeSkillDisplayName(parsed.metadata.name || pkg.name || skillName);
  const description = compactText(
    pkg.description || parsed.metadata.description || `${displayName} RUDI skill`,
    320
  );

  const openaiYaml = [
    'interface:',
    `  display_name: ${yamlString(displayName)}`,
    `  short_description: ${yamlString(shortDescription(description, displayName))}`,
    `  default_prompt: ${yamlString(defaultPrompt(skillName, description, displayName))}`,
    '',
  ].join('\n');

  return { ...baseFiles, openaiYaml };
}

export function buildClaudeSkillFiles(pkg, sourceContent) {
  const skillName = normalizeSkillName(pkg);
  if (!skillName) {
    throw new Error(`Cannot derive skill name from ${pkg?.id || pkg?.name || 'package'}`);
  }

  const parsed = stripFrontmatter(sourceContent);
  const displayName = compactText(parsed.metadata.name || pkg.name || skillName, 80);
  const description = compactText(
    pkg.description || parsed.metadata.description || `${displayName} RUDI skill`,
    320
  );
  const body = parsed.body || `Use the installed RUDI skill \`skill:${skillName}\` as the source of truth.`;

  const skillMd = [
    '---',
    `name: ${yamlString(skillName)}`,
    `description: ${yamlString(description)}`,
    '---',
    '',
    body.trimEnd(),
    '',
  ].join('\n');

  return { skillName, skillMd };
}

export async function syncCodexSkills(options = {}) {
  const {
    skills = null,
    codexRoot = codexSkillsRoot(),
    force = false,
    dryRun = false,
  } = options;

  const installedSkills = skills || await listInstalled('skill');
  const rudiSkills = installedSkills.filter(skill => !skill.source || skill.source === 'rudi');
  const results = [];

  for (const skill of rudiSkills) {
    const sourcePath = skill.entryPath || skill.path;
    const skillName = normalizeSkillName(skill);

    if (!skillName) {
      results.push({
        id: skill.id,
        action: 'failed',
        error: 'Could not derive Codex skill name',
      });
      continue;
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      results.push({
        id: skill.id,
        skillName,
        action: 'failed',
        error: 'Source skill file not found',
      });
      continue;
    }

    const targetDir = path.join(codexRoot, skillName);
    const skillMdPath = path.join(targetDir, 'SKILL.md');
    const openaiYamlPath = path.join(targetDir, 'agents', 'openai.yaml');
    const exists = fs.existsSync(skillMdPath);

    if (exists && !force) {
      results.push({
        id: skill.id,
        skillName,
        action: 'skipped',
        reason: 'Codex skill already exists; use --force to update',
        targetDir,
      });
      continue;
    }

    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    const files = buildCodexSkillFiles(skill, sourceContent);
    const action = exists ? 'updated' : 'created';

    if (!dryRun) {
      fs.mkdirSync(path.dirname(openaiYamlPath), { recursive: true });
      copyBundledSkillResources(sourcePath, targetDir);
      fs.writeFileSync(skillMdPath, files.skillMd);
      fs.writeFileSync(openaiYamlPath, files.openaiYaml);
    }

    results.push({
      id: skill.id,
      skillName,
      action: dryRun ? `would_${action}` : action,
      targetDir,
    });
  }

  return {
    codexRoot,
    total: results.length,
    results,
  };
}

async function syncPortableSkills({
  skills = null,
  targetRoot,
  targetName,
  force = false,
  dryRun = false,
}) {
  const installedSkills = skills || await listInstalled('skill');
  const rudiSkills = installedSkills.filter(skill => !skill.source || skill.source === 'rudi');
  const results = [];

  for (const skill of rudiSkills) {
    const sourcePath = skill.entryPath || skill.path;
    const skillName = normalizeSkillName(skill);

    if (!skillName) {
      results.push({
        id: skill.id,
        action: 'failed',
        error: `Could not derive ${targetName} skill name`,
      });
      continue;
    }

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      results.push({
        id: skill.id,
        skillName,
        action: 'failed',
        error: 'Source skill file not found',
      });
      continue;
    }

    const targetDir = path.join(targetRoot, skillName);
    const skillMdPath = path.join(targetDir, 'SKILL.md');
    const exists = fs.existsSync(skillMdPath);

    if (exists && !force) {
      results.push({
        id: skill.id,
        skillName,
        action: 'skipped',
        reason: `${targetName} skill already exists; use --force to update`,
        targetDir,
      });
      continue;
    }

    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    const files = buildClaudeSkillFiles(skill, sourceContent);
    const action = exists ? 'updated' : 'created';

    if (!dryRun) {
      fs.mkdirSync(targetDir, { recursive: true });
      copyBundledSkillResources(sourcePath, targetDir);
      fs.writeFileSync(skillMdPath, files.skillMd);
    }

    results.push({
      id: skill.id,
      skillName,
      action: dryRun ? `would_${action}` : action,
      targetDir,
    });
  }

  return { total: results.length, results };
}

export async function syncClaudeSkills(options = {}) {
  const {
    skills = null,
    claudeRoot = claudeSkillsRoot(),
    force = false,
    dryRun = false,
  } = options;

  return {
    claudeRoot,
    ...await syncPortableSkills({ skills, targetRoot: claudeRoot, targetName: 'Claude', force, dryRun }),
  };
}

export async function syncGeminiSkills(options = {}) {
  const {
    skills = null,
    geminiRoot = geminiSkillsRoot(),
    force = false,
    dryRun = false,
  } = options;

  return {
    geminiRoot,
    ...await syncPortableSkills({ skills, targetRoot: geminiRoot, targetName: 'Gemini', force, dryRun }),
  };
}

export async function syncAntigravitySkills(options = {}) {
  const {
    skills = null,
    antigravityRoot = antigravitySkillsRoot(),
    force = false,
    dryRun = false,
  } = options;

  return {
    antigravityRoot,
    ...await syncPortableSkills({
      skills,
      targetRoot: antigravityRoot,
      targetName: 'Antigravity',
      force,
      dryRun,
    }),
  };
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
    .filter((skill) => !skill?.source || skill.source === 'rudi');
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
    return { targets, skillIds: [], results: {}, failed: 0, failures: [] };
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
  --force      Overwrite existing native skill wrappers; whole-inventory force requires --all
  --dry-run    Preview sync results without writing files
  --json       Output JSON

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
    } else if (item.action === 'skipped') {
      log(`  - ${item.id}: skipped (${item.reason})`);
    } else {
      log(`  ok ${item.id}: ${item.action} ${item.targetDir}`);
    }
  }

  const syncedCount = result.results.filter(item => (
    item.action === 'created' ||
    item.action === 'updated' ||
    item.action === 'would_created' ||
    item.action === 'would_updated'
  )).length;
  const prefix = result.results.some(item => item.action.startsWith('would_'))
    ? 'Would sync'
    : 'Synced';
  log(`\n${prefix} ${syncedCount} skill(s). Restart ${targetName} to pick up native skill changes.`);
}
