import fs from 'node:fs';
import path from 'node:path';

import { buildArgs } from './catalog.js';
import {
  buildProviderEnvironment,
  finishPlan,
  permissionArgs,
  providerContext,
  validateImages,
} from './common.js';

function defaultSystemSettingsPath(platform = process.platform) {
  if (platform === 'darwin') return '/Library/Application Support/GeminiCli/settings.json';
  if (platform === 'win32') return 'C:\\ProgramData\\gemini-cli\\settings.json';
  return '/etc/gemini-cli/settings.json';
}

export function buildGeminiProviderEnvironment(config, options = {}) {
  const baseEnvironment = options.baseEnvironment || process.env;
  const environment = buildProviderEnvironment(config, options);
  if (!environment.GEMINI_API_KEY || !options.runtimeDirectory) return environment;

  // An explicit system settings path is user/admin policy and remains authoritative.
  if (baseEnvironment.GEMINI_CLI_SYSTEM_SETTINGS_PATH) return environment;
  const systemSettingsPath = options.systemSettingsPath || defaultSystemSettingsPath(options.platform);
  if (fs.existsSync(systemSettingsPath)) return environment;

  const settingsPath = path.join(options.runtimeDirectory, 'gemini-system-settings.json');
  fs.writeFileSync(settingsPath, JSON.stringify({
    security: { auth: { selectedType: 'gemini-api-key' } },
  }, null, 2), { encoding: 'utf8', mode: 0o600 });

  return {
    ...environment,
    GEMINI_CLI_SYSTEM_SETTINGS_PATH: settingsPath,
  };
}

export function buildGeminiPlan(options) {
  const context = providerContext(options, 'gemini');
  const images = validateImages(options.images);
  if (images.length > 0) {
    throw new Error('Gemini image attachments require provider-specific arguments after --');
  }
  if (options.approvalMode != null) {
    throw new Error('Gemini does not support --approval-mode; use --permission-mode');
  }
  const permission = permissionArgs(context, options.permissionMode);
  const args = buildArgs(context.config, {
    model: context.model,
    prompt: context.prompt,
    resume: context.nativeSessionId,
    skipTrust: true,
  });
  args.push(...permission.args, ...context.extraArgs);
  const providerEnvironment = buildGeminiProviderEnvironment(context.config, {
    runtimeDirectory: context.runtimeDirectory,
  });
  return finishPlan(context, args, permission.mode, providerEnvironment);
}
