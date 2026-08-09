import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildEnv,
  getModelDef,
  getPermissionArgs,
  loadProviderConfig,
  resolveModel,
} from './catalog.js';
import { PRIVATE_AUTOMATION_PROFILE_ID } from '../private-automation-profile.js';

const MAX_PROMPT_BYTES = 10 * 1024 * 1024;

const PERMISSION_ALIASES = Object.freeze({
  'accept-edits': 'acceptEdits',
  'auto-edit': 'acceptEdits',
  'dangerously-skip-permissions': 'agent',
  'full-access': 'fullAccess',
  'read-only': 'readonly',
});

const READ_ONLY_PERMISSION = Object.freeze({
  antigravity: 'plan',
  claude: 'plan',
  codex: 'readonly',
  gemini: 'plan',
});

const WRITABLE_PERMISSION = Object.freeze({
  antigravity: 'acceptEdits',
  claude: 'acceptEdits',
  codex: 'approve',
  gemini: 'acceptEdits',
});

export function requiredText(value, field, maxBytes = MAX_PROMPT_BYTES) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    throw new Error(`${field} must be a non-empty string without NUL bytes`);
  }
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new Error(`${field} exceeds ${maxBytes} bytes`);
  }
  return value;
}

export function validateExtraArgs(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('extraArgs must be an array of strings');
  return value.map((arg, index) => requiredText(arg, `extraArgs[${index}]`, 64 * 1024));
}

export function providerContext(options, provider) {
  const config = loadProviderConfig(provider);
  const privateAutomationProfile = options.privateAutomationProfile || null;
  if (privateAutomationProfile != null) {
    if (privateAutomationProfile.id !== PRIVATE_AUTOMATION_PROFILE_ID) {
      throw new Error('invalid private automation profile');
    }
    if (privateAutomationProfile.provider !== provider) {
      throw new Error('private automation provider does not match process plan');
    }
    if (privateAutomationProfile.model !== options.model) {
      throw new Error('private automation model does not match process plan');
    }
    if (options.nativeSessionId != null) {
      throw new Error('private automation session resume is forbidden');
    }
  }
  const prompt = requiredText(
    options.prompt,
    'prompt',
    privateAutomationProfile?.maxPromptBytes || MAX_PROMPT_BYTES,
  );
  const cwd = requiredText(options.cwd, 'cwd', 4096);
  const binaryPath = requiredText(options.binaryPath, 'binaryPath', 4096);
  const requestedModel = options.model || config.models.default;
  const modelDefinition = getModelDef(config, requestedModel);
  if (!modelDefinition) {
    throw new Error(`Unknown model '${requestedModel}' for ${provider}. Run: rudi agent models ${provider}`);
  }

  const workspaceMode = options.workspaceMode;
  if (!['read-only', 'worktree', 'isolated-copy'].includes(workspaceMode)) {
    throw new Error(`Unknown resolved workspace mode: ${workspaceMode}`);
  }

  return {
    binaryPath,
    config,
    cwd,
    extraArgs: validateExtraArgs(options.extraArgs),
    model: resolveModel(config, requestedModel),
    nativeSessionId: options.nativeSessionId == null
      ? null
      : requiredText(options.nativeSessionId, 'nativeSessionId', 1024),
    prompt,
    privateAutomationProfile,
    provider,
    runtimeDirectory: options.runtimeDirectory == null
      ? null
      : requiredText(options.runtimeDirectory, 'runtimeDirectory', 4096),
    workspaceMode,
  };
}

export function permissionArgs(context, requestedMode) {
  const defaultMode = context.workspaceMode === 'read-only'
    ? READ_ONLY_PERMISSION[context.provider]
    : WRITABLE_PERMISSION[context.provider];
  const normalizedMode = PERMISSION_ALIASES[requestedMode] || requestedMode || defaultMode;
  const modes = context.config.headless.permissionModes || {};
  if (!modes[normalizedMode]) {
    throw new Error(
      `Unknown permission mode '${requestedMode || normalizedMode}' for ${context.provider}. `
      + `Available: ${Object.keys(modes).join(', ')}`,
    );
  }
  if (context.workspaceMode === 'read-only' && normalizedMode !== READ_ONLY_PERMISSION[context.provider]) {
    throw new Error(`permission mode ${requestedMode || normalizedMode} is incompatible with read-only workspace mode`);
  }
  return { args: getPermissionArgs(context.config, normalizedMode), mode: normalizedMode };
}

export function validateImages(images) {
  if (images == null) return [];
  if (!Array.isArray(images)) throw new Error('images must be an array of paths');
  return images.map((image, index) => requiredText(image, `images[${index}]`, 4096));
}

export function buildAgentExecutableEnvironment(binaryPath, overrides = {}, baseEnvironment = process.env) {
  const merged = { ...baseEnvironment, ...overrides };
  const entries = [
    path.dirname(binaryPath),
    path.dirname(process.execPath),
    ...(String(merged.PATH || '').split(path.delimiter)),
  ].filter(Boolean);
  merged.PATH = [...new Set(entries)].join(path.delimiter);
  return merged;
}

const PRIVATE_OPERATIONAL_ENVIRONMENT_KEYS = Object.freeze([
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'SSL_CERT_DIR',
  'SSL_CERT_FILE',
  'TMPDIR',
  'USER',
]);

export function buildPrivateProviderEnvironment(config, binaryPath, options = {}) {
  const baseEnvironment = options.baseEnvironment || process.env;
  const operational = Object.fromEntries(
    PRIVATE_OPERATIONAL_ENVIRONMENT_KEYS
      .filter(key => typeof baseEnvironment[key] === 'string' && baseEnvironment[key].length > 0)
      .map(key => [key, baseEnvironment[key]]),
  );
  const providerEnvironment = buildProviderEnvironment(config, options);
  return buildAgentExecutableEnvironment(
    binaryPath,
    { ...operational, ...providerEnvironment },
    {},
  );
}

export function buildProviderEnvironment(config, options = {}) {
  const baseEnvironment = options.baseEnvironment || process.env;
  const rudiHome = options.rudiHome || process.env.RUDI_HOME || path.join(os.homedir(), '.rudi');
  let storedSecrets = {};

  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(rudiHome, 'secrets.json'), 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      storedSecrets = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => typeof value === 'string' && value.length > 0),
      );
    }
  } catch {
    // Missing or invalid storage is equivalent to having no managed provider credentials.
  }

  return buildEnv(config, { ...storedSecrets, ...baseEnvironment });
}

export function finishPlan(context, args, permissionMode, providerEnvironment = null) {
  const resolvedProviderEnvironment = providerEnvironment || (
    context.privateAutomationProfile
      ? buildPrivateProviderEnvironment(context.config, context.binaryPath)
      : buildProviderEnvironment(context.config)
  );
  const environment = context.privateAutomationProfile
    ? resolvedProviderEnvironment
    : buildAgentExecutableEnvironment(context.binaryPath, resolvedProviderEnvironment);
  return Object.freeze({
    args,
    environment,
    ...(context.privateAutomationProfile ? {
      maxFinalOutputBytes: context.privateAutomationProfile.maxFinalOutputBytes,
      maxRawOutputBytes: context.privateAutomationProfile.maxRawOutputBytes,
      privateAutomationProfile: context.privateAutomationProfile,
      stdin: context.prompt,
    } : {}),
    model: context.model,
    permissionMode,
    provider: context.provider,
    spawn: Object.freeze({ command: context.binaryPath, cwd: context.cwd }),
    timeouts: Object.freeze({ ...context.config.headless.timeouts }),
  });
}
