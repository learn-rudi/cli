import { buildArgs } from './catalog.js';
import {
  finishPlan,
  permissionArgs,
  providerContext,
  validateImages,
} from './common.js';

export function buildClaudePlan(options) {
  const context = providerContext(options, 'claude');
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
