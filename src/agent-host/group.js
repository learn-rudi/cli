import crypto from 'node:crypto';

import { assertLaunchId } from './artifacts.js';
import { dispatchDetachedAgent } from './detached.js';
import {
  assertAgentGroupId,
  createLaunchStore,
} from './launch-store.js';
import { stopAgentLaunch } from './lifecycle.js';
import { resolveAgentProviderId } from './providers/index.js';

const ACTIVE_STATUSES = new Set(['starting', 'running']);
const MAX_PROMPT_BYTES = 10 * 1024 * 1024;

function requiredText(value, field, maxBytes = 4096) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    throw new Error(`${field} must be a non-empty string without NUL bytes`);
  }
  if (Buffer.byteLength(value, 'utf8') > maxBytes) {
    throw new Error(`${field} exceeds ${maxBytes} bytes`);
  }
  return value;
}

function validateTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length < 2 || tasks.length > 10) {
    throw new Error('Agent Host group requires between 2 and 10 tasks');
  }
  const validated = tasks.map((task, index) => ({
    approvalMode: task.approvalMode,
    extraArgs: Array.isArray(task.extraArgs) ? [...task.extraArgs] : [],
    images: Array.isArray(task.images) ? [...task.images] : [],
    launchId: assertLaunchId(task.launchId),
    model: task.model,
    permissionMode: task.permissionMode,
    prompt: requiredText(task.prompt, `tasks[${index}].prompt`, MAX_PROMPT_BYTES),
    provider: resolveAgentProviderId(task.provider),
    timeoutMs: task.timeoutMs,
  }));
  if (new Set(validated.map(task => task.launchId)).size !== validated.length) {
    throw new Error('Agent Host group launch IDs must be unique');
  }
  return validated;
}

export function createAgentGroupId() {
  return `group_${crypto.randomUUID().replaceAll('-', '')}`;
}

export async function launchDetachedAgentGroup(request, dependencies = {}) {
  const groupId = assertAgentGroupId(request?.groupId);
  const originDirectory = requiredText(request?.originDirectory, 'originDirectory');
  const workspace = requiredText(request?.workspace, 'workspace');
  const workspaceMode = request?.workspaceMode || 'auto';
  const tasks = validateTasks(request?.tasks);
  const ownsStore = !dependencies.store;
  const store = dependencies.store || createLaunchStore();
  const dispatchImpl = dependencies.dispatchImpl || dispatchDetachedAgent;

  try {
    const existing = store.getGroup(groupId);
    if (existing) return existing;
    store.createGroup({
      groupId,
      originDirectory,
      tasks,
      workspace,
      workspaceMode,
    });

    await Promise.all(tasks.map(async (task) => {
      try {
        await dispatchImpl({
          launchId: task.launchId,
          operation: 'launch',
          options: {
            approvalMode: task.approvalMode,
            extraArgs: task.extraArgs,
            images: task.images,
            model: task.model,
            originDirectory,
            permissionMode: task.permissionMode,
            prompt: task.prompt,
            provider: task.provider,
            timeoutMs: task.timeoutMs,
            workspace,
            workspaceMode,
          },
        });
      } catch (error) {
        store.setGroupLaunchError(groupId, task.launchId, error.message);
      }
    }));

    return store.getGroup(groupId);
  } finally {
    if (ownsStore) store.close();
  }
}

export async function stopAgentGroup(groupId, dependencies = {}) {
  assertAgentGroupId(groupId);
  const ownsStore = !dependencies.store;
  const store = dependencies.store || createLaunchStore();
  const stopImpl = dependencies.stopImpl || stopAgentLaunch;
  try {
    const group = store.getGroup(groupId);
    if (!group) throw new Error(`Agent Host group not found: ${groupId}`);
    const active = group.launches.filter(launch => ACTIVE_STATUSES.has(launch.status));
    await Promise.all(active.map(launch => stopImpl(launch.launchId)));
    return { group: store.getGroup(groupId), stoppedLaunchIds: active.map(launch => launch.launchId) };
  } finally {
    if (ownsStore) store.close();
  }
}
