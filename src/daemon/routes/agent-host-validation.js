import path from 'node:path';

import { assertLaunchId } from '../../agent-host/artifacts.js';
import { assertAgentGroupId } from '../../agent-host/launch-store.js';

export const MAX_AGENT_HOST_BODY_BYTES = 12 * 1024 * 1024;

const LAUNCH_FIELDS = new Set([
  'approvalMode',
  'extraArgs',
  'images',
  'launchId',
  'model',
  'permissionMode',
  'originDirectory',
  'outputDirectory',
  'prompt',
  'provider',
  'timeoutMs',
  'workspace',
  'workspaceMode',
]);
const RESUME_FIELDS = new Set([
  'approvalMode',
  'extraArgs',
  'images',
  'launchId',
  'model',
  'permissionMode',
  'prompt',
  'timeoutMs',
]);
const GROUP_FIELDS = new Set([
  'groupId',
  'originDirectory',
  'tasks',
  'workspace',
  'workspaceMode',
]);
const GROUP_TASK_FIELDS = new Set([
  'approvalMode',
  'extraArgs',
  'images',
  'launchId',
  'model',
  'permissionMode',
  'prompt',
  'provider',
  'timeoutMs',
]);

function requireText(value, field, maxBytes = 4096) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    const error = new Error(`${field} must be a non-empty string without NUL bytes`);
    error.statusCode = 400;
    error.field = field;
    throw error;
  }
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    const error = new Error(`${field} exceeds ${maxBytes} bytes`);
    error.statusCode = 400;
    error.field = field;
    throw error;
  }
  return value;
}

function validateStringArray(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 100) {
    const error = new Error(`${field} must be an array of at most 100 strings`);
    error.statusCode = 400;
    error.field = field;
    throw error;
  }
  return value.map((item, index) => requireText(item, `${field}[${index}]`, 64 * 1024));
}

function validateRequest(body, allowed, { resume = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object');
    error.statusCode = 400;
    throw error;
  }
  for (const field of Object.keys(body)) {
    if (!allowed.has(field)) {
      const error = new Error(`Unknown request field: ${field}`);
      error.statusCode = 400;
      error.field = field;
      throw error;
    }
  }

  const options = {
    approvalMode: body.approvalMode == null ? undefined : requireText(body.approvalMode, 'approvalMode'),
    extraArgs: validateStringArray(body.extraArgs, 'extraArgs'),
    images: validateStringArray(body.images, 'images'),
    model: body.model == null ? undefined : requireText(body.model, 'model'),
    permissionMode: body.permissionMode == null
      ? undefined
      : requireText(body.permissionMode, 'permissionMode'),
    prompt: requireText(body.prompt, 'prompt', 10 * 1024 * 1024),
    timeoutMs: body.timeoutMs,
  };
  if (body.timeoutMs != null && (
    !Number.isSafeInteger(body.timeoutMs)
    || body.timeoutMs < 1
    || body.timeoutMs > 86_400_000
  )) {
    const error = new Error('timeoutMs must be an integer between 1 and 86400000');
    error.statusCode = 400;
    error.field = 'timeoutMs';
    throw error;
  }

  if (!resume) {
    Object.assign(options, {
      originDirectory: path.resolve(requireText(body.originDirectory, 'originDirectory')),
      outputDirectory: body.outputDirectory == null
        ? undefined
        : requireText(body.outputDirectory, 'outputDirectory'),
      provider: requireText(body.provider, 'provider', 64),
      workspace: body.workspace == null ? undefined : requireText(body.workspace, 'workspace'),
      workspaceMode: body.workspaceMode == null
        ? 'auto'
        : requireText(body.workspaceMode, 'workspaceMode', 32),
    });
  }
  return options;
}

export function validateAgentLaunchRequest(body) {
  return validateRequest(body, LAUNCH_FIELDS);
}

export function validateAgentResumeRequest(body) {
  return validateRequest(body, RESUME_FIELDS, { resume: true });
}

export function validateAgentGroupRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('Request body must be a JSON object');
    error.statusCode = 400;
    throw error;
  }
  for (const field of Object.keys(body)) {
    if (!GROUP_FIELDS.has(field)) {
      const error = new Error(`Unknown request field: ${field}`);
      error.statusCode = 400;
      error.field = field;
      throw error;
    }
  }
  if (!Array.isArray(body.tasks) || body.tasks.length < 2 || body.tasks.length > 10) {
    const error = new Error('tasks must contain between 2 and 10 task objects');
    error.statusCode = 400;
    error.field = 'tasks';
    throw error;
  }
  const tasks = body.tasks.map((task, index) => {
    if (!task || typeof task !== 'object' || Array.isArray(task)) {
      const error = new Error(`tasks[${index}] must be an object`);
      error.statusCode = 400;
      error.field = `tasks[${index}]`;
      throw error;
    }
    for (const field of Object.keys(task)) {
      if (!GROUP_TASK_FIELDS.has(field)) {
        const error = new Error(`Unknown request field: tasks[${index}].${field}`);
        error.statusCode = 400;
        error.field = `tasks[${index}].${field}`;
        throw error;
      }
    }
    if (task.timeoutMs != null && (
      !Number.isSafeInteger(task.timeoutMs)
      || task.timeoutMs < 1
      || task.timeoutMs > 86_400_000
    )) {
      const error = new Error(`tasks[${index}].timeoutMs must be between 1 and 86400000`);
      error.statusCode = 400;
      error.field = `tasks[${index}].timeoutMs`;
      throw error;
    }
    return {
      approvalMode: task.approvalMode == null
        ? undefined
        : requireText(task.approvalMode, `tasks[${index}].approvalMode`),
      extraArgs: validateStringArray(task.extraArgs, `tasks[${index}].extraArgs`),
      images: validateStringArray(task.images, `tasks[${index}].images`),
      launchId: assertLaunchId(task.launchId),
      model: task.model == null ? undefined : requireText(task.model, `tasks[${index}].model`),
      permissionMode: task.permissionMode == null
        ? undefined
        : requireText(task.permissionMode, `tasks[${index}].permissionMode`),
      prompt: requireText(task.prompt, `tasks[${index}].prompt`, 10 * 1024 * 1024),
      provider: requireText(task.provider, `tasks[${index}].provider`, 64),
      timeoutMs: task.timeoutMs,
    };
  });
  return {
    groupId: assertAgentGroupId(body.groupId),
    originDirectory: path.resolve(requireText(body.originDirectory, 'originDirectory')),
    tasks,
    workspace: requireText(body.workspace, 'workspace'),
    workspaceMode: body.workspaceMode == null
      ? 'auto'
      : requireText(body.workspaceMode, 'workspaceMode', 32),
  };
}

export function parseAgentHostIntegerQuery(value, fallback, { min, max, field }) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const error = new Error(`${field} must be an integer between ${min} and ${max}`);
    error.statusCode = 400;
    error.field = field;
    throw error;
  }
  return parsed;
}
