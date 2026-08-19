import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  AGENT_CONFIGS,
  readAgentMcpServers,
} from '@learnrudi/mcp';

import {
  getAgentProviderConfig,
  resolveAgentProviderBinary,
  resolveAgentProviderId,
} from './providers/index.js';
import {
  buildAgentExecutableEnvironment,
  buildProviderEnvironment,
} from './providers/common.js';

const MCP_AGENT_IDS = Object.freeze({ claude: 'claude-code' });

function commandArgs(configuredCommand) {
  return Array.isArray(configuredCommand) ? configuredCommand.slice(1) : [];
}

function runCheck(binaryPath, args, spawnSyncImpl, providerEnvironment, timeout = 5000) {
  const result = spawnSyncImpl(binaryPath, args, {
    encoding: 'utf8',
    env: buildAgentExecutableEnvironment(binaryPath, providerEnvironment),
    timeout,
  });
  return {
    ok: !result.error && result.status === 0,
    output: String(result.stdout || result.stderr || '').trim().slice(0, 512),
  };
}

function skillsRoot(provider) {
  if (provider === 'claude') return path.join(process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude'), 'skills');
  if (provider === 'codex') return path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'skills');
  if (provider === 'gemini') return path.join(process.env.GEMINI_HOME || path.join(os.homedir(), '.gemini'), 'skills');
  return path.join(process.env.ANTIGRAVITY_HOME || path.join(os.homedir(), '.gemini', 'antigravity-cli'), 'skills');
}

function hasSyncedSkills(provider) {
  const root = skillsRoot(provider);
  try {
    return fs.readdirSync(root, { withFileTypes: true }).some(entry => entry.isDirectory());
  } catch {
    return false;
  }
}

function hasRudiRouter(provider) {
  const agentId = MCP_AGENT_IDS[provider] || provider;
  const config = AGENT_CONFIGS.find(item => item.id === agentId);
  if (!config) return false;
  return readAgentMcpServers(config).some(server => (
    server.name === 'rudi' || path.basename(String(server.command)) === 'rudi-router'
  ));
}

export async function inspectAgentHost(provider, dependencies = {}) {
  const { spawnSyncImpl = spawnSync } = dependencies;
  const canonicalProvider = resolveAgentProviderId(provider);
  const config = getAgentProviderConfig(canonicalProvider);
  const binaryPath = dependencies.binaryPath || resolveAgentProviderBinary(canonicalProvider);
  if (!binaryPath) {
    return {
      authenticated: false,
      authentication: 'unavailable',
      installed: false,
      provider: canonicalProvider,
      routerConfigured: hasRudiRouter(canonicalProvider),
      skillsSynchronized: hasSyncedSkills(canonicalProvider),
      version: null,
    };
  }

  const providerEnvironment = buildProviderEnvironment(config, {
    baseEnvironment: dependencies.baseEnvironment,
    rudiHome: dependencies.rudiHome,
  });
  const version = runCheck(
    binaryPath,
    commandArgs(config.binary.checkCommand),
    spawnSyncImpl,
    providerEnvironment,
  );
  const authArgs = commandArgs(config.binary.authCheck);
  const versionArgs = commandArgs(config.binary.checkCommand);
  const authIsObservable = JSON.stringify(authArgs) !== JSON.stringify(versionArgs);
  const auth = authIsObservable
    ? runCheck(binaryPath, authArgs, spawnSyncImpl, providerEnvironment)
    : { ok: null };

  return {
    authenticated: auth.ok,
    authentication: auth.ok == null ? 'unknown' : auth.ok ? 'authenticated' : 'unauthenticated',
    binaryPath,
    installed: version.ok,
    provider: canonicalProvider,
    routerConfigured: hasRudiRouter(canonicalProvider),
    skillsSynchronized: hasSyncedSkills(canonicalProvider),
    version: version.output.split('\n')[0] || null,
  };
}

export async function assertAgentHostReady({ binaryPath, provider }, dependencies = {}) {
  const inspected = await inspectAgentHost(provider, { ...dependencies, binaryPath });
  if (!inspected.installed) {
    throw new Error(`${provider} host is not installed or did not pass its version check`);
  }
  if (inspected.authenticated === false) {
    throw new Error(`${provider} host is not authenticated`);
  }
  return inspected;
}
