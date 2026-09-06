/**
 * List command - list installed packages
 *
 * Usage:
 *   rudi list [kind]              List all or filter by kind
 *   rudi list skills              List skills
 *   rudi list workflows           List workflows
 *   rudi list skills --category=code   Filter by category
 *   rudi list stacks --detected   Show MCP servers from agent configs
 *   rudi list --json              Output as JSON
 */

import { listInstalled, matchesSkillFilters, normalizeSkillFilters } from '@learnrudi/core';
import { detectAllMcpServers, getInstalledAgents, getMcpServerSummary, AGENT_CONFIGS } from '@learnrudi/mcp';
import { cmdAgent } from './agent-host.js';
import { formatOperatorSkillLine, formatRelatedSkillsLine } from './related-skills.js';
import { printPackageLifecycle } from './package-lifecycle.js';
import { printSkillDetails } from './skill-display.js';

function pluralizeKind(kind) {
  if (!kind) return 'packages';
  if (kind === 'binary') return 'binaries';
  if (kind === 'skill') return 'skills';
  if (kind === 'workflow') return 'workflows';
  return `${kind}s`;
}

function headingForKind(kind) {
  if (kind === 'binary') return 'BINARIES';
  if (kind === 'skill') return 'SKILLS';
  if (kind === 'workflow') return 'WORKFLOWS';
  return `${kind.toUpperCase()}S`;
}

function formatSkillSource(pkg) {
  if (pkg.kind !== 'skill') return '';

  const details = [];
  if (pkg.format) details.push(pkg.format);
  if (pkg.source && pkg.source !== 'rudi') details.push(pkg.source);
  return details.length > 0 ? ` [${details.join(', ')}]` : '';
}

export function buildDetectedAgentConfigurationJson(configuredAgents, summary) {
  return {
    configuredAgents,
    // Deprecated compatibility alias. These are configurations, not proof that
    // an external Agent Host executable is installed.
    installedAgents: configuredAgents,
    summary,
  };
}

export async function cmdList(args, flags) {
  let kind = args[0];

  // Normalize kind
  if (kind) {
    // Handle plural forms
    if (kind === 'stacks') kind = 'stack';
    if (kind === 'skills') kind = 'skill';
    if (kind === 'prompts') kind = 'prompt';
    if (kind === 'workflows') kind = 'workflow';
    if (kind === 'runtimes') kind = 'runtime';
    if (kind === 'binaries') kind = 'binary';
    if (kind === 'tools') kind = 'binary';
    if (kind === 'agents') kind = 'agent';

    // Handle deprecated 'prompt' → 'skill' rename
    if (kind === 'prompt') {
      console.error('Note: "prompt" has been renamed to "skill". Use "rudi list skills" instead.');
      kind = 'skill';
    }

    if (!['stack', 'skill', 'workflow', 'runtime', 'binary', 'agent'].includes(kind)) {
      console.error(`Invalid kind: ${kind}`);
      console.error(`Valid kinds: stack, skill, workflow, runtime, binary, agent`);
      process.exit(1);
    }
  }

  // Compatibility view for existing MCP client configuration files. This does
  // not establish that an external Agent Host executable is installed.
  if (flags.detected && kind === 'agent') {
    const configuredAgents = getInstalledAgents();
    const summary = getMcpServerSummary();

    if (flags.json) {
      console.log(JSON.stringify(
        buildDetectedAgentConfigurationJson(configuredAgents, summary),
        null,
        2,
      ));
      return;
    }

    console.log(`\nDETECTED AGENT CONFIGURATIONS (${configuredAgents.length}/${AGENT_CONFIGS.length}):`);
    console.log('─'.repeat(50));

    for (const agent of AGENT_CONFIGS) {
      const configured = configuredAgents.find(a => a.id === agent.id);
      const serverCount = summary[agent.id]?.serverCount || 0;

      if (configured) {
        console.log(`  ✓ ${agent.name}`);
        console.log(`    ${serverCount} MCP server(s)`);
        console.log(`    ${configured.configFile}`);
      } else {
        console.log(`  ○ ${agent.name} (no configuration found)`);
      }
    }

    console.log(`\nConfigured: ${configuredAgents.length} of ${AGENT_CONFIGS.length} clients`);
    return;
  }

  // Agent Hosts are not installed RUDI packages. Route the normal inventory
  // command to the native-host readiness surface instead of legacy manifests.
  if (kind === 'agent') {
    return cmdAgent(['hosts'], flags);
  }

  // Handle --detected flag for stacks (show MCP servers from agent configs)
  if (flags.detected && kind === 'stack') {
    const servers = detectAllMcpServers();

    if (flags.json) {
      console.log(JSON.stringify(servers, null, 2));
      return;
    }

    if (servers.length === 0) {
      console.log('No MCP servers detected in agent configs.');
      console.log('\nChecked these agents:');
      for (const agent of AGENT_CONFIGS) {
        console.log(`  - ${agent.name}`);
      }
      return;
    }

    // Group by agent
    const byAgent = {};
    for (const server of servers) {
      if (!byAgent[server.agent]) byAgent[server.agent] = [];
      byAgent[server.agent].push(server);
    }

    console.log(`\nDETECTED MCP SERVERS (${servers.length}):`);
    console.log('─'.repeat(50));

    for (const [agentId, agentServers] of Object.entries(byAgent)) {
      const agentName = agentServers[0]?.agentName || agentId;
      console.log(`\n  ${agentName.toUpperCase()} (${agentServers.length}):`);
      for (const server of agentServers) {
        console.log(`    📦 ${server.name}`);
        console.log(`       ${server.command} ${server.cwd ? `(${server.cwd})` : ''}`);
      }
    }

    console.log(`\nTotal: ${servers.length} MCP server(s) configured`);
    return;
  }

  try {
    let packages = await listInstalled(kind);
    const filters = normalizeSkillFilters(flags);

    // Filter by category (mainly for skills/workflows)
    const categoryFilter = flags.category;
    packages = packages.filter(pkg => matchesSkillFilters(pkg, filters));

    if (flags.json) {
      console.log(JSON.stringify(packages, null, 2));
      return;
    }

    if (packages.length === 0) {
      if (categoryFilter) {
        console.log(`No ${pluralizeKind(kind)} found in category: ${categoryFilter}`);
      } else if (kind) {
        console.log(`No ${pluralizeKind(kind)} installed.`);
      } else {
        console.log('No packages installed.');
      }
      console.log(`\nInstall with: rudi install <package>`);
      return;
    }

    // For skills, group by category if showing all skills
    if (kind === 'skill' && !categoryFilter) {
      const byCategory = {};
      for (const pkg of packages) {
        const cat = pkg.category || 'general';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(pkg);
      }

      console.log(`\nSKILLS (${packages.length}):`);
      console.log('─'.repeat(50));

      for (const [category, skills] of Object.entries(byCategory).sort()) {
        console.log(`\n  ${category.toUpperCase()} (${skills.length}):`);
        for (const pkg of skills) {
          const icon = pkg.icon ? `${pkg.icon} ` : '';
          console.log(`    ${icon}${pkg.id || `skill:${pkg.name}`}${formatSkillSource(pkg)}`);
          if (pkg.description) {
            console.log(`      ${pkg.description}`);
          }
          printPackageLifecycle(pkg, '      ');
          printSkillDetails(pkg, '      ');
          if (pkg.requires && pkg.requires.stacks && pkg.requires.stacks.length > 0) {
            console.log(`      Requires: ${pkg.requires.stacks.join(', ')}`);
          }
          if (pkg.tags && pkg.tags.length > 0) {
            console.log(`      Tags: ${pkg.tags.join(', ')}`);
          }
        }
      }

      console.log(`\nTotal: ${packages.length} skill(s)`);
      console.log(`\nFilter by category: rudi list skills --category=code`);
      return;
    }

    // Group by kind (standard display)
    const grouped = {
      stack: packages.filter(p => p.kind === 'stack'),
      skill: packages.filter(p => p.kind === 'skill'),
      workflow: packages.filter(p => p.kind === 'workflow'),
      runtime: packages.filter(p => p.kind === 'runtime'),
      binary: packages.filter(p => p.kind === 'binary'),
      agent: packages.filter(p => p.kind === 'agent')
    };

    let total = 0;

    for (const [pkgKind, pkgs] of Object.entries(grouped)) {
      if (pkgs.length === 0) continue;
      if (kind && kind !== pkgKind) continue;

      console.log(`\n${headingForKind(pkgKind)} (${pkgs.length}):`);
      console.log('─'.repeat(50));

      for (const pkg of pkgs) {
        const icon = pkg.icon ? `${pkg.icon} ` : '';
        console.log(`  ${icon}${pkg.id || `${pkgKind}:${pkg.name}`}${formatSkillSource(pkg)}`);
        console.log(`    Version: ${pkg.version || 'unknown'}`);
        if (pkg.description) {
          console.log(`    ${pkg.description}`);
        }
        printPackageLifecycle(pkg, '    ');
        printSkillDetails(pkg);
        if (pkg.kind !== 'skill' && pkg.category) {
          console.log(`    Category: ${pkg.category}`);
        }
        if (pkg.tags && pkg.tags.length > 0) {
          console.log(`    Tags: ${pkg.tags.join(', ')}`);
        }
        const operatorSkillLine = formatOperatorSkillLine(pkg);
        if (operatorSkillLine) {
          console.log(`    ${operatorSkillLine}`);
        }
        const relatedSkillsLine = formatRelatedSkillsLine(pkg);
        if (relatedSkillsLine) {
          console.log(`    ${relatedSkillsLine}`);
        }
        if (pkg.installedAt) {
          console.log(`    Installed: ${new Date(pkg.installedAt).toLocaleDateString()}`);
        }
        total++;
      }
    }

    console.log(`\nTotal: ${total} package(s)`);

  } catch (error) {
    console.error(`Failed to list packages: ${error.message}`);
    process.exit(1);
  }
}
