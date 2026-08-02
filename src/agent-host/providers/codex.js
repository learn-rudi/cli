import {
  buildArgs,
  buildSubcommandArgs,
} from '../../commands/agent/providers/index.js';
import {
  finishPlan,
  permissionArgs,
  providerContext,
  validateImages,
} from './common.js';

const APPROVAL_ALIASES = Object.freeze({
  onRequest: 'on-request',
  'on-request': 'on-request',
  never: 'never',
  untrusted: 'untrusted',
});

function approvalPolicy(value) {
  if (value == null) return null;
  const normalized = APPROVAL_ALIASES[value];
  if (!normalized) {
    throw new Error('Unknown approval mode for codex. Available: untrusted, on-request, never');
  }
  return normalized;
}

export function buildCodexPlan(options) {
  const context = providerContext(options, 'codex');
  const images = validateImages(options.images);
  const permission = permissionArgs(context, options.permissionMode);
  const approval = approvalPolicy(options.approvalMode);
  let args;

  if (context.nativeSessionId) {
    args = [];
    if (approval) args.push('--ask-for-approval', approval);
    args.push('-C', context.cwd, '-m', context.model, ...permission.args);
    args.push(...buildSubcommandArgs(context.config, 'resume', {
      image: images.length === 1 ? images[0] : null,
      prompt: context.prompt,
      sessionId: context.nativeSessionId,
    }));
    for (const image of images.slice(1)) args.push('-i', image);
    args.push('--json', ...context.extraArgs);
  } else {
    args = buildArgs(context.config, {
      approvalPolicy: approval,
      cwd: context.cwd,
      image: images.length > 0 ? images : null,
      model: context.model,
      prompt: context.prompt,
    });
    args.push(...permission.args, ...context.extraArgs);
  }

  return finishPlan(context, args, permission.mode);
}
