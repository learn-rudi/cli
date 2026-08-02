import { buildArgs } from '../../commands/agent/providers/index.js';
import {
  finishPlan,
  permissionArgs,
  providerContext,
  validateImages,
} from './common.js';

export function buildAntigravityPlan(options) {
  const context = providerContext(options, 'antigravity');
  const images = validateImages(options.images);
  if (images.length > 0) {
    throw new Error('Antigravity image attachments require provider-specific arguments after --');
  }
  if (options.approvalMode != null) {
    throw new Error('Antigravity does not support --approval-mode; use --permission-mode');
  }
  const permission = permissionArgs(context, options.permissionMode);
  const args = buildArgs(context.config, {
    conversation: context.nativeSessionId,
    model: context.model,
    prompt: context.prompt,
  });
  args.push(...permission.args, ...context.extraArgs);
  return finishPlan(context, args, permission.mode);
}
