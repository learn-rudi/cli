import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { getModelDef, loadProviderConfig } from './providers/catalog.js';

export const PRIVATE_AUTOMATION_PROFILE_ID = 'private-automation-v1';
export const PRIVATE_AUTOMATION_MAX_PROMPT_BYTES = 200_000;
export const PRIVATE_AUTOMATION_MAX_FINAL_OUTPUT_BYTES = 64 * 1024;
export const PRIVATE_AUTOMATION_MAX_RAW_OUTPUT_BYTES = 2 * 1024 * 1024;
export const PRIVATE_AUTOMATION_MAX_SCHEMA_BYTES = 64 * 1024;
export const PRIVATE_AUTOMATION_MAX_TIMEOUT_MS = 165_000;
export const PRIVATE_AUTOMATION_DEFAULT_TIMEOUT_MS = 160_000;

const PRIVATE_PROVIDERS = new Set(['claude', 'codex']);
const PRIVATE_RAW_EVENT_TYPES = Object.freeze({
  claude: new Set(['assistant', 'error', 'rate_limit_event', 'result', 'system']),
  codex: new Set([
    'error',
    'item.completed',
    'item.started',
    'item.updated',
    'thread.started',
    'turn.completed',
    'turn.failed',
    'turn.started',
  ]),
});
const PRIVATE_CODEX_ITEM_TYPES = new Set(['agent_message', 'reasoning']);
const PRIVATE_CLAUDE_ASSISTANT_BLOCK_TYPES = new Set(['text', 'thinking']);
const PRIVATE_CLAUDE_SYSTEM_SUBTYPES = new Set(['init']);
const PRIVATE_CODEX_DISABLED_FEATURES = Object.freeze([
  'apps',
  'browser_use',
  'browser_use_external',
  'browser_use_full_cdp_access',
  'code_mode_host',
  'computer_use',
  'enable_mcp_apps',
  'image_generation',
  'in_app_browser',
  'multi_agent',
  'plugins',
  'remote_plugin',
  'shell_snapshot',
  'shell_tool',
  'skill_search',
  'tool_call_mcp_elicitation',
  'tool_suggest',
  'unified_exec',
]);

export function getPrivateCodexDisabledFeatures() {
  return [...PRIVATE_CODEX_DISABLED_FEATURES];
}

function requiredText(value, field, maxBytes = 4096) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    throw new Error(`${field} must be a non-empty string without NUL bytes`);
  }
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new Error(`${field} exceeds ${maxBytes} bytes`);
  }
  return value;
}

function containsSchemaReference(value) {
  if (Array.isArray(value)) return value.some(containsSchemaReference);
  if (!value || typeof value !== 'object') return false;
  if (Object.hasOwn(value, '$ref')) return true;
  return Object.values(value).some(containsSchemaReference);
}

function readOutputSchema(outputSchemaPath) {
  const requested = path.resolve(requiredText(outputSchemaPath, 'output schema path'));
  let stat;
  try {
    stat = fs.lstatSync(requested);
  } catch {
    throw new Error(`private automation output schema does not exist: ${requested}`);
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error('private automation output schema must be a regular non-symlink file');
  }
  if (stat.size < 2 || stat.size > PRIVATE_AUTOMATION_MAX_SCHEMA_BYTES) {
    throw new Error(`private automation output schema must be between 2 and ${PRIVATE_AUTOMATION_MAX_SCHEMA_BYTES} bytes`);
  }
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(requested, 'utf8'));
  } catch {
    throw new Error('private automation output schema must contain valid JSON');
  }
  if (!schema || Array.isArray(schema) || schema.type !== 'object') {
    throw new Error('private automation output schema must describe an object');
  }
  if (schema.additionalProperties !== false) {
    throw new Error('private automation output schema must set additionalProperties to false');
  }
  if (!schema.properties || typeof schema.properties !== 'object' || Array.isArray(schema.properties)) {
    throw new Error('private automation output schema must declare object properties');
  }
  if (!Array.isArray(schema.required)) {
    throw new Error('private automation output schema must declare required properties');
  }
  if (containsSchemaReference(schema)) {
    throw new Error('external schema references are forbidden in private automation');
  }
  return Object.freeze({
    canonical: JSON.stringify(schema),
    path: fs.realpathSync(requested),
    schema: Object.freeze(schema),
  });
}

function exactConfiguredModel(provider, model) {
  if (typeof model !== 'string' || model.trim() === '') {
    throw new Error('private automation exact model is required');
  }
  const exactModel = requiredText(model, 'private automation exact model', 512);
  const config = loadProviderConfig(provider);
  const definition = getModelDef(config, exactModel);
  if (!definition || definition.id !== exactModel) {
    throw new Error(`private automation requires a canonical configured model ID for ${provider}`);
  }
  return exactModel;
}

function validateTimeout(timeoutMs) {
  const value = timeoutMs == null ? PRIVATE_AUTOMATION_DEFAULT_TIMEOUT_MS : Number(timeoutMs);
  if (!Number.isSafeInteger(value) || value < 1 || value > PRIVATE_AUTOMATION_MAX_TIMEOUT_MS) {
    throw new Error(`private automation timeoutMs must be an integer between 1 and ${PRIVATE_AUTOMATION_MAX_TIMEOUT_MS}`);
  }
  return value;
}

export function createPrivateAutomationProfile({
  fallbackModel = null,
  model,
  outputSchemaPath,
  provider,
  timeoutMs,
} = {}) {
  if (!PRIVATE_PROVIDERS.has(provider)) {
    throw new Error('private automation provider must be codex or claude');
  }
  if (fallbackModel != null) {
    throw new Error('private automation fallback model is forbidden');
  }
  const exactModel = exactConfiguredModel(provider, model);
  const outputSchema = readOutputSchema(outputSchemaPath);
  return Object.freeze({
    id: PRIVATE_AUTOMATION_PROFILE_ID,
    maxFinalOutputBytes: PRIVATE_AUTOMATION_MAX_FINAL_OUTPUT_BYTES,
    maxPromptBytes: PRIVATE_AUTOMATION_MAX_PROMPT_BYTES,
    maxRawOutputBytes: PRIVATE_AUTOMATION_MAX_RAW_OUTPUT_BYTES,
    model: exactModel,
    outputSchema,
    provider,
    timeoutMs: validateTimeout(timeoutMs),
  });
}

function containsToolEvent(value) {
  if (Array.isArray(value)) return value.some(containsToolEvent);
  if (!value || typeof value !== 'object') return false;
  if ([
    'command_execution',
    'file_change',
    'mcp_tool_call',
    'permission',
    'permission_request',
    'server_tool_use',
    'tool_result',
    'tool_use',
  ].includes(value.type)) return true;
  return Object.values(value).some(containsToolEvent);
}

function boundedUsage(usage) {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) return undefined;
  const projected = {};
  for (const [key, raw] of Object.entries(usage)) {
    const value = Number(raw);
    if (Number.isSafeInteger(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER) {
      projected[key] = value;
    }
  }
  return Object.keys(projected).length > 0 ? projected : undefined;
}

export function projectPrivateAutomationEventMetadata(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('private automation event must be an object');
  }
  if (containsToolEvent(event)) {
    throw new Error('private automation tool event is forbidden');
  }
  const metadata = { type: requiredText(event.type, 'private automation event type', 128) };
  if (typeof event.model === 'string' && event.model.length > 0) metadata.model = event.model;
  if (Array.isArray(event.content)) metadata.contentBlockCount = event.content.length;
  const usage = boundedUsage(event.usage);
  if (usage) metadata.usage = usage;
  if (typeof event.durationMs === 'number' && Number.isFinite(event.durationMs) && event.durationMs >= 0) {
    metadata.durationMs = Math.floor(event.durationMs);
  }
  if (typeof event.numTurns === 'number' && Number.isSafeInteger(event.numTurns) && event.numTurns >= 0) {
    metadata.numTurns = event.numTurns;
  }
  return Object.freeze(metadata);
}

export function assertPrivateAutomationRawEvent(provider, event) {
  if (!PRIVATE_PROVIDERS.has(provider) || !event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('private automation provider event is invalid');
  }
  if (!PRIVATE_RAW_EVENT_TYPES[provider].has(event.type)) {
    throw new Error('private automation provider event type is not allowlisted');
  }
  if (
    provider === 'codex'
    && event.type.startsWith('item.')
    && !PRIVATE_CODEX_ITEM_TYPES.has(event.item?.type)
  ) {
    throw new Error('private automation Codex item type is not allowlisted');
  }
  if (provider === 'claude' && event.type === 'system') {
    if (!PRIVATE_CLAUDE_SYSTEM_SUBTYPES.has(event.subtype)) {
      throw new Error('private automation Claude system subtype is not allowlisted');
    }
    if (
      (Array.isArray(event.tools) && event.tools.length > 0)
      || (Array.isArray(event.mcp_servers) && event.mcp_servers.length > 0)
    ) {
      throw new Error('private automation Claude init capabilities are not empty');
    }
  }
  if (provider === 'claude' && event.type === 'assistant') {
    const message = event.message && typeof event.message === 'object'
      ? event.message
      : null;
    const content = Array.isArray(event.content)
      ? event.content
      : Array.isArray(message?.content)
        ? message.content
        : [];
    if (content.some(block => (
      !block
      || typeof block !== 'object'
      || !PRIVATE_CLAUDE_ASSISTANT_BLOCK_TYPES.has(block.type)
    ))) {
      throw new Error('private automation Claude content block is not allowlisted');
    }
  }
  if (containsToolEvent(event)) {
    throw new Error('private automation tool event is forbidden');
  }
  return event;
}

function successfulProbe(result) {
  return result && !result.error && result.status === 0;
}

function probeOutput(result) {
  return `${String(result?.stdout || '')}\n${String(result?.stderr || '')}`;
}

function semverAtLeast(actual, minimum) {
  const actualParts = actual.split('.').map(Number);
  const minimumParts = minimum.split('.').map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (actualParts[index] > minimumParts[index]) return true;
    if (actualParts[index] < minimumParts[index]) return false;
  }
  return true;
}

export function assertPrivateAutomationHostCapabilities({ binaryPath, profile }, dependencies = {}) {
  const spawnSyncImpl = dependencies.spawnSyncImpl || spawnSync;
  if (!profile || profile.id !== PRIVATE_AUTOMATION_PROFILE_ID) {
    throw new Error('private automation profile is required for capability preflight');
  }
  if (profile.provider === 'codex') {
    const versionProbe = spawnSyncImpl(binaryPath, ['--version'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    const versionMatch = probeOutput(versionProbe).match(/codex-cli\s+(\d+)\.(\d+)\.(\d+)/u);
    const minimumVersion = loadProviderConfig('codex').headless.privateAutomation.minimumVersion;
    const versionSupported = versionMatch && semverAtLeast(
      `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`,
      minimumVersion,
    );
    if (!successfulProbe(versionProbe) || !versionSupported) {
      throw new Error('Codex host version does not satisfy private automation config controls');
    }
    const configProbe = spawnSyncImpl(binaryPath, [
      '--strict-config',
      '-c', 'web_search="disabled"',
      '-c', 'tools.view_image=false',
      'exec', '--help',
    ], { encoding: 'utf8', timeout: 5000 });
    const help = probeOutput(configProbe);
    const requiredHelp = [
      '--ephemeral',
      '--ignore-rules',
      '--ignore-user-config',
      '--output-schema',
      '--sandbox',
    ];
    if (!successfulProbe(configProbe) || requiredHelp.some(flag => !help.includes(flag))) {
      throw new Error('Codex host does not satisfy private automation config and CLI capabilities');
    }
    const featureProbe = spawnSyncImpl(binaryPath, ['features', 'list'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    const features = probeOutput(featureProbe);
    const missingFeature = PRIVATE_CODEX_DISABLED_FEATURES.some((feature) => {
      const line = features.split('\n').find(candidate => candidate.trim().startsWith(`${feature} `));
      return !line || /\bremoved\b/u.test(line);
    });
    if (!successfulProbe(featureProbe) || missingFeature) {
      throw new Error('Codex host does not satisfy private automation feature controls');
    }
    return true;
  }

  const helpProbe = spawnSyncImpl(binaryPath, ['--help'], { encoding: 'utf8', timeout: 5000 });
  const help = probeOutput(helpProbe);
  const requiredHelp = [
    '--disable-slash-commands',
    '--input-format',
    '--json-schema',
    '--mcp-config',
    '--no-chrome',
    '--no-session-persistence',
    '--safe-mode',
    '--setting-sources',
    '--strict-mcp-config',
    '--tools',
  ];
  if (!successfulProbe(helpProbe) || requiredHelp.some(flag => !help.includes(flag))) {
    throw new Error('Claude host does not satisfy private automation CLI capabilities');
  }
  return true;
}
