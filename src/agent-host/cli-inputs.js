import fs from 'node:fs';
import path from 'node:path';

import { resolveAgentProviderId } from './providers/index.js';

export const MAX_PROMPT_BYTES = 10 * 1024 * 1024;

export function flagValue(flags, kebab, camel = null) {
  return flags[kebab] ?? (camel ? flags[camel] : undefined);
}

function requiredFlagString(value, name) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    throw new Error(`${name} requires a non-empty value`);
  }
  return value;
}

async function readPromptStream(stdin) {
  let value = '';
  let size = 0;
  for await (const chunk of stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > MAX_PROMPT_BYTES) {
      throw new Error(`stdin prompt exceeds ${MAX_PROMPT_BYTES} bytes`);
    }
    value += buffer.toString('utf8');
  }
  return value;
}

export async function resolveAgentPrompt(flags, {
  originDirectory = process.cwd(),
  stdin = process.stdin,
} = {}) {
  const inline = flags.prompt;
  const promptFile = flagValue(flags, 'prompt-file', 'promptFile');
  if (inline != null && promptFile != null) {
    throw new Error('Use exactly one of --prompt or --prompt-file');
  }

  let prompt;
  if (inline != null) {
    prompt = requiredFlagString(inline, '--prompt');
  } else if (promptFile != null) {
    const fileValue = requiredFlagString(promptFile, '--prompt-file');
    const filePath = path.resolve(originDirectory, fileValue);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      throw new Error(`Prompt file does not exist: ${filePath}`);
    }
    if (!stat.isFile()) throw new Error(`Prompt file is not a regular file: ${filePath}`);
    if (stat.size > MAX_PROMPT_BYTES) throw new Error(`Prompt file exceeds ${MAX_PROMPT_BYTES} bytes`);
    prompt = fs.readFileSync(filePath, 'utf8');
  } else if (stdin && stdin.isTTY === false) {
    prompt = await readPromptStream(stdin);
  } else {
    throw new Error('Prompt required via --prompt, --prompt-file, or stdin');
  }

  if (!prompt.trim()) throw new Error('Prompt must not be empty');
  if (prompt.includes('\0')) throw new Error('Prompt must not contain NUL bytes');
  if (Buffer.byteLength(prompt, 'utf8') > MAX_PROMPT_BYTES) {
    throw new Error(`Prompt exceeds ${MAX_PROMPT_BYTES} bytes`);
  }
  return prompt;
}

export function parseWorkspaceMode(flags) {
  const requested = flagValue(flags, 'workspace-mode', 'workspaceMode') || flags.mode || 'auto';
  if (flags['read-only'] === true || flags.readOnly === true) {
    if (requested !== 'auto' && requested !== 'read-only') {
      throw new Error('--read-only conflicts with the requested workspace mode');
    }
    return 'read-only';
  }
  return requested;
}

export function parseImages(flags, originDirectory) {
  const value = flags.image ?? flags.images;
  if (value == null) return [];
  return requiredFlagString(value, '--image')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map((item) => {
      const imagePath = path.resolve(originDirectory, item);
      let stat;
      try {
        stat = fs.statSync(imagePath);
      } catch {
        throw new Error(`Image attachment does not exist: ${imagePath}`);
      }
      if (!stat.isFile()) throw new Error(`Image attachment is not a regular file: ${imagePath}`);
      return imagePath;
    });
}

export function parseTimeout(flags) {
  const value = flagValue(flags, 'timeout-ms', 'timeoutMs');
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 86_400_000) {
    throw new Error('--timeout-ms must be an integer between 1 and 86400000');
  }
  return parsed;
}

export function buildLaunchOptions(provider, prompt, flags, passthrough, originDirectory) {
  return {
    approvalMode: flagValue(flags, 'approval-mode', 'approvalMode'),
    extraArgs: passthrough,
    images: parseImages(flags, originDirectory),
    json: flags.json === true,
    model: flags.model,
    originDirectory,
    outputDirectory: flagValue(flags, 'output-dir', 'outputDirectory'),
    permissionMode: flagValue(flags, 'permission-mode', 'permissionMode'),
    prompt,
    provider,
    timeoutMs: parseTimeout(flags),
    workspace: flags.workspace,
    workspaceMode: parseWorkspaceMode(flags),
  };
}

export function buildDetachedOptions(options, operation) {
  const common = {
    approvalMode: options.approvalMode,
    extraArgs: options.extraArgs,
    images: options.images,
    model: options.model,
    permissionMode: options.permissionMode,
    prompt: options.prompt,
    timeoutMs: options.timeoutMs,
  };
  if (operation === 'resume') return { ...common, launchId: options.launchId };
  return {
    ...common,
    originDirectory: options.originDirectory,
    outputDirectory: options.outputDirectory,
    provider: options.provider,
    workspace: options.workspace,
    workspaceMode: options.workspaceMode,
  };
}

export function readGroupTaskFiles(taskFlag, originDirectory, common = {}) {
  const specs = Array.isArray(taskFlag) ? taskFlag : taskFlag == null ? [] : [taskFlag];
  if (specs.length < 2 || specs.length > 10) {
    throw new Error('rudi agent group launch requires between 2 and 10 --task provider:file values');
  }
  return specs.map((spec, index) => {
    const value = requiredFlagString(spec, `--task #${index + 1}`);
    const separator = value.indexOf(':');
    if (separator < 1 || separator === value.length - 1) {
      throw new Error(`--task #${index + 1} must use provider:file syntax`);
    }
    const provider = value.slice(0, separator);
    resolveAgentProviderId(provider);
    const filePath = path.resolve(originDirectory, value.slice(separator + 1));
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      throw new Error(`Task file does not exist: ${filePath}`);
    }
    if (!stat.isFile()) throw new Error(`Task file is not a regular file: ${filePath}`);
    if (stat.size > MAX_PROMPT_BYTES) throw new Error(`Task file exceeds ${MAX_PROMPT_BYTES} bytes`);
    const prompt = fs.readFileSync(filePath, 'utf8');
    if (!prompt.trim()) throw new Error(`Task file must not be empty: ${filePath}`);
    if (prompt.includes('\0')) throw new Error(`Task file must not contain NUL bytes: ${filePath}`);
    return { ...common, prompt, provider };
  });
}
