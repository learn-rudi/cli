import { buildArgs } from './catalog.js';
import {
  finishPlan,
  permissionArgs,
  providerContext,
  validateImages,
} from './common.js';

export function buildClaudePlan(options) {
  const context = providerContext(options, 'claude');
  if (context.privateAutomationProfile) {
    if ((options.extraArgs || []).length > 0 || (options.images || []).length > 0) {
      throw new Error('private automation forbids Claude passthrough arguments and images');
    }
    if (options.approvalMode != null) {
      throw new Error('private automation forbids Claude approval overrides');
    }
    if (options.permissionMode != null && options.permissionMode !== 'plan') {
      throw new Error('private automation requires Claude plan permission mode');
    }
    const args = [
      '--output-format', 'stream-json',
      '--verbose',
      '--print',
      '--input-format', 'text',
      '--model', context.model,
      '--json-schema', context.privateAutomationProfile.outputSchema.canonical,
      '--no-session-persistence',
      '--safe-mode',
      '--no-chrome',
      '--disable-slash-commands',
      '--tools', '',
      '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}',
      '--setting-sources', '',
      '--permission-mode', 'plan',
    ];
    return finishPlan(context, args, 'plan');
  }
  const images = validateImages(options.images);
  if (images.length > 0) {
    throw new Error('Claude local image attachments are not exposed as a headless CLI flag; reference a readable workspace file in the prompt');
  }
  const permission = permissionArgs(context, options.permissionMode);
  const args = buildArgs(context.config, {
    model: context.model,
    print: true,
    prompt: context.prompt,
    resumeSessionId: context.nativeSessionId,
  });
  args.push(...permission.args, ...context.extraArgs);
  return finishPlan(context, args, permission.mode);
}
