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
    `name: ${yamlString(displayName)}`,
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

function printSkillsHelp() {
  console.log(`
rudi skills - List or sync installed RUDI skills

USAGE
  rudi skills
  rudi skills sync <codex|claude|gemini|antigravity> [--force] [--dry-run] [--json]

OPTIONS
  --force      Overwrite existing native skill wrappers
  --dry-run    Preview sync results without writing files
  --json       Output JSON

EXAMPLES
  rudi skills
  rudi skills sync codex
  rudi skills sync claude
  rudi skills sync gemini
  rudi skills sync antigravity
  rudi skills sync codex --force
`);
}

export async function cmdSkills(args = [], flags = {}) {
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

  const target = args[1];
  const targets = {
    codex: { name: 'Codex', sync: syncCodexSkills, rootKey: 'codexRoot' },
    claude: { name: 'Claude', sync: syncClaudeSkills, rootKey: 'claudeRoot' },
    gemini: { name: 'Gemini', sync: syncGeminiSkills, rootKey: 'geminiRoot' },
    antigravity: { name: 'Antigravity', sync: syncAntigravitySkills, rootKey: 'antigravityRoot' },
  };
  const targetConfig = targets[target];
  if (!targetConfig) {
    throw new Error('Usage: rudi skills sync <codex|claude|gemini|antigravity> [--force] [--dry-run] [--json]');
  }

  const result = await targetConfig.sync({
    force: flags.force === true,
    dryRun: flags['dry-run'] === true || flags.dryRun === true,
  });

  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const targetName = targetConfig.name;
  const skillsRoot = result[targetConfig.rootKey];
  console.log(`${targetName} skills root: ${skillsRoot}`);
  for (const item of result.results) {
    if (item.action === 'failed') {
      console.log(`  x ${item.id}: ${item.error}`);
    } else if (item.action === 'skipped') {
      console.log(`  - ${item.id}: skipped (${item.reason})`);
    } else {
      console.log(`  ok ${item.id}: ${item.action} ${item.targetDir}`);
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
  console.log(`\n${prefix} ${syncedCount} skill(s). Restart ${targetName} to pick up native skill changes.`);
}
