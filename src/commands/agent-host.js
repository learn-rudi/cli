import fs from 'node:fs';
import path from 'node:path';

import { attachAgentLaunch } from '../agent-host/attach.js';
import {
  createAgentGroupId,
} from '../agent-host/group.js';
import {
  readDetachedWorkerRequest,
  runDetachedAgentWorker,
} from '../agent-host/detached.js';
import { createLaunchId, launchAgent } from '../agent-host/launch.js';
import { createLaunchStore } from '../agent-host/launch-store.js';
import {
  diffAgentLaunch,
  discardAgentLaunch,
  promoteAgentLaunch,
} from '../agent-host/lifecycle.js';
import { inspectAgentHost } from '../agent-host/preflight.js';
import {
  getAgentProviderConfig,
  listAgentProviders,
  resolveAgentProviderId,
} from '../agent-host/providers/index.js';
import { resumeAgent } from '../agent-host/resume.js';
import { startDaemonLifecycle } from './daemon.js';
import { daemonRequest, readDaemonInfo } from './daemon-client.js';

const MAX_PROMPT_BYTES = 10 * 1024 * 1024;

function flagValue(flags, kebab, camel = null) {
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

function parseWorkspaceMode(flags) {
  const requested = flagValue(flags, 'workspace-mode', 'workspaceMode') || flags.mode || 'auto';
  if (flags['read-only'] === true || flags.readOnly === true) {
    if (requested !== 'auto' && requested !== 'read-only') {
      throw new Error('--read-only conflicts with the requested workspace mode');
    }
    return 'read-only';
  }
  return requested;
}

function parseImages(flags, originDirectory) {
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

function parseTimeout(flags) {
  const value = flagValue(flags, 'timeout-ms', 'timeoutMs');
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 86_400_000) {
    throw new Error('--timeout-ms must be an integer between 1 and 86400000');
  }
  return parsed;
}

function launchOptions(provider, prompt, flags, passthrough, originDirectory) {
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

function printAgentHelp() {
  console.log(`
rudi agent - Run and inspect native headless agent hosts

USAGE
  rudi agent hosts [--json]
  rudi agent models <claude|codex|google|gemini> [--json]
  rudi agent launch <provider> --prompt <text> [options] [-- <provider-args...>]
  rudi agent resume <launch-id> --prompt <text> [options] [-- <provider-args...>]
  rudi agent list [--status <status>] [--limit <n>] [--json]
  rudi agent status <launch-id> [--json]
  rudi agent attach <launch-id> [--json] [--no-follow]
  rudi agent stop <launch-id> [--json]
  rudi agent diff <launch-id> [--json]
  rudi agent promote <launch-id> [--json]
  rudi agent discard <launch-id> [--json]
  rudi agent group launch --task <provider:file> --task <provider:file> --detach
  rudi agent group list [--limit <n>] [--json]
  rudi agent group status <group-id> [--json]
  rudi agent group stop <group-id> [--json]

PROMPT INPUT
  --prompt <text>              Prompt argument
  --prompt-file <path>         Read the prompt from a file
  stdin                        Used when neither prompt flag is present

WORKSPACE
  --workspace <path>           Project path (default: originating directory)
  --workspace-mode <mode>      auto, read-only, worktree, or isolated-copy
  --read-only                  Shortcut for --workspace-mode read-only

PROVIDER OPTIONS
  --model <model>              Provider model ID or declared alias
  --permission-mode <mode>     Provider-native permission profile
  --approval-mode <mode>       Codex approval policy
  --image <a,b>                Image or attachment paths where modeled
  --timeout-ms <ms>            Bounded runtime (maximum 24 hours)
  --json                       Emit normalized JSONL events
  --detach                     Run through the local background service

Foreground execution needs neither the daemon nor Lite. Detached execution is
owned by a dedicated RUDI worker and survives the invoking terminal and Lite.
`);
}

function printLaunchSummary(launch) {
  console.error(`Launch ${launch.launchId}: ${launch.status}`);
  console.error(`  provider: ${launch.provider || 'unknown'}`);
  if (launch.nativeSessionId) console.error(`  native session: ${launch.nativeSessionId}`);
  if (launch.executionWorkspace) console.error(`  workspace: ${launch.executionWorkspace}`);
}

function printLaunchList(launches) {
  if (launches.length === 0) {
    console.log('No Agent Host launches found.');
    return;
  }
  for (const launch of launches) {
    console.log(`${launch.launchId}  ${launch.status}  ${launch.provider}  ${launch.model}`);
  }
}

function printGroupSummary(group) {
  console.error(`Group ${group.groupId}: ${group.status}`);
  for (const launch of group.launches || []) {
    console.error(`  ${launch.launchId}: ${launch.status} (${launch.provider})`);
  }
}

function readGroupTaskFiles(taskFlag, originDirectory, common = {}) {
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

async function requestAgentHostService(pathname, {
  body = undefined,
  method = 'GET',
} = {}, dependencies = {}) {
  const startDaemonImpl = dependencies.startDaemonImpl || startDaemonLifecycle;
  const readDaemonInfoImpl = dependencies.readDaemonInfoImpl || readDaemonInfo;
  const daemonRequestImpl = dependencies.daemonRequestImpl || daemonRequest;
  await startDaemonImpl();
  const daemon = readDaemonInfoImpl();
  return daemonRequestImpl({ ...daemon, body, method, pathname, timeoutMs: 120_000 });
}

async function dispatchDetachedThroughService(request, dependencies = {}) {
  const pathname = request.operation === 'resume'
    ? `/agent-host/v1/launches/${encodeURIComponent(request.options.launchId)}/resume`
    : '/agent-host/v1/launches';
  const body = { ...request.options, launchId: request.launchId };
  const response = await requestAgentHostService(pathname, {
    body,
    method: 'POST',
  }, dependencies);
  return response.launch;
}

async function stopDetachedThroughService(launchId, dependencies = {}) {
  return requestAgentHostService(
    `/agent-host/v1/launches/${encodeURIComponent(launchId)}/stop`,
    { body: {}, method: 'POST' },
    dependencies,
  );
}

async function dispatchGroupThroughService(request, dependencies = {}) {
  const response = await requestAgentHostService('/agent-host/v1/groups', {
    body: request,
    method: 'POST',
  }, dependencies);
  return response.group;
}

async function stopGroupThroughService(groupId, dependencies = {}) {
  return requestAgentHostService(
    `/agent-host/v1/groups/${encodeURIComponent(groupId)}/stop`,
    { body: {}, method: 'POST' },
    dependencies,
  );
}

function detachedOptions(options, operation) {
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

function requiredLaunchId(args, command) {
  const launchId = args[1];
  if (!launchId) throw new Error(`Usage: rudi agent ${command} <launch-id>`);
  return launchId;
}

export async function cmdAgent(args = [], flags = {}, passthrough = [], dependencies = {}) {
  const subcommand = args[0];
  const originDirectory = dependencies.originDirectory || process.cwd();
  const stdin = dependencies.stdin || process.stdin;

  if (subcommand === '_worker') {
    const launchId = requiredLaunchId(args, '_worker');
    const readWorkerRequestImpl = dependencies.readWorkerRequestImpl || readDetachedWorkerRequest;
    const runWorkerImpl = dependencies.runWorkerImpl || runDetachedAgentWorker;
    const request = await readWorkerRequestImpl(stdin);
    const result = await runWorkerImpl({ launchId, request });
    if (result.status === 'failed' || result.status === 'stopped') process.exitCode = 1;
    return result;
  }

  if (!subcommand || subcommand === 'help' || flags.help || flags.h) {
    printAgentHelp();
    return null;
  }

  if (subcommand === 'hosts') {
    const inspectHostImpl = dependencies.inspectHostImpl || inspectAgentHost;
    const hosts = [];
    for (const provider of listAgentProviders()) {
      const inspected = await inspectHostImpl(provider);
      hosts.push({ ...inspected, provider });
    }
    if (flags.json) console.log(JSON.stringify({ hosts }, null, 2));
    else {
      for (const host of hosts) {
        console.log(
          `${host.provider}: installed=${host.installed ? 'yes' : 'no'} `
          + `auth=${host.authentication} router=${host.routerConfigured ? 'yes' : 'no'} `
          + `skills=${host.skillsSynchronized ? 'yes' : 'no'} version=${host.version || '-'}`,
        );
      }
    }
    return { hosts };
  }

  if (subcommand === 'models') {
    const requestedProvider = args[1];
    const nativeProvider = resolveAgentProviderId(requestedProvider);
    const config = getAgentProviderConfig(nativeProvider);
    const payload = {
      default: config.models.default,
      models: config.models.available,
      nativeProvider,
      provider: requestedProvider,
    };
    if (flags.json) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(`${requestedProvider} models (default: ${payload.default})`);
      for (const model of payload.models) console.log(`  ${model.alias}: ${model.id} — ${model.name}`);
    }
    return payload;
  }

  if (subcommand === 'launch') {
    const provider = args[1];
    resolveAgentProviderId(provider);
    const prompt = await resolveAgentPrompt(flags, { originDirectory, stdin });
    const options = launchOptions(provider, prompt, flags, passthrough, originDirectory);
    let launch;
    if (flags.detach === true) {
      const createLaunchIdImpl = dependencies.createLaunchIdImpl || createLaunchId;
      const dispatchDetachedImpl = dependencies.dispatchDetachedImpl || dispatchDetachedThroughService;
      launch = await dispatchDetachedImpl({
        launchId: createLaunchIdImpl(),
        operation: 'launch',
        options: detachedOptions(options, 'launch'),
      }, dependencies);
      if (flags.json) console.log(JSON.stringify({ launch, type: 'launch.detached' }));
    } else {
      const launchImpl = dependencies.launchImpl || launchAgent;
      launch = await launchImpl(options, dependencies.launchDependencies);
    }
    if (!flags.json) printLaunchSummary(launch);
    if (launch.status === 'failed' || launch.status === 'stopped') process.exitCode = 1;
    return launch;
  }

  if (subcommand === 'resume') {
    const launchId = args[1];
    if (!launchId) throw new Error('Usage: rudi agent resume <launch-id> --prompt <text>');
    const prompt = await resolveAgentPrompt(flags, { originDirectory, stdin });
    const options = {
      ...launchOptions(null, prompt, flags, passthrough, originDirectory),
      launchId,
    };
    let launch;
    if (flags.detach === true) {
      const createLaunchIdImpl = dependencies.createLaunchIdImpl || createLaunchId;
      const dispatchDetachedImpl = dependencies.dispatchDetachedImpl || dispatchDetachedThroughService;
      launch = await dispatchDetachedImpl({
        launchId: createLaunchIdImpl(),
        operation: 'resume',
        options: detachedOptions(options, 'resume'),
      }, dependencies);
      if (flags.json) console.log(JSON.stringify({ launch, type: 'launch.detached' }));
    } else {
      const resumeImpl = dependencies.resumeImpl || resumeAgent;
      launch = await resumeImpl(options, dependencies.launchDependencies);
    }
    if (!flags.json) printLaunchSummary(launch);
    if (launch.status === 'failed' || launch.status === 'stopped') process.exitCode = 1;
    return launch;
  }

  if (subcommand === 'group') {
    const groupCommand = args[1];
    if (groupCommand === 'launch') {
      if (flags.detach !== true) {
        throw new Error('rudi agent group launch currently requires --detach');
      }
      if (passthrough.length > 0) {
        throw new Error('Provider-specific passthrough arguments are not supported for grouped tasks');
      }
      const createGroupIdImpl = dependencies.createGroupIdImpl || createAgentGroupId;
      const createLaunchIdImpl = dependencies.createLaunchIdImpl || createLaunchId;
      const groupId = createGroupIdImpl();
      const commonTaskOptions = {
        approvalMode: flagValue(flags, 'approval-mode', 'approvalMode'),
        images: parseImages(flags, originDirectory),
        model: flags.model,
        permissionMode: flagValue(flags, 'permission-mode', 'permissionMode'),
        timeoutMs: parseTimeout(flags),
      };
      const tasks = readGroupTaskFiles(flags.task, originDirectory, commonTaskOptions)
        .map(task => ({ ...task, launchId: createLaunchIdImpl() }));
      const request = {
        groupId,
        originDirectory,
        tasks,
        workspace: flags.workspace || originDirectory,
        workspaceMode: parseWorkspaceMode(flags),
      };
      const dispatchGroupImpl = dependencies.dispatchGroupImpl || dispatchGroupThroughService;
      const group = await dispatchGroupImpl(request, dependencies);
      if (flags.json) console.log(JSON.stringify({ group, type: 'group.detached' }));
      else printGroupSummary(group);
      return group;
    }

    if (groupCommand === 'list' || groupCommand === 'status') {
      const storeFactory = dependencies.storeFactory || (() => createLaunchStore());
      const store = storeFactory();
      try {
        if (groupCommand === 'list') {
          const groups = store.listGroups({ limit: flags.limit || 50 });
          if (flags.json) console.log(JSON.stringify({ groups }, null, 2));
          else for (const group of groups) printGroupSummary(group);
          return { groups };
        }
        const groupId = args[2];
        if (!groupId) throw new Error('Usage: rudi agent group status <group-id>');
        const group = store.getGroup(groupId);
        if (!group) throw new Error(`Agent Host group not found: ${groupId}`);
        if (flags.json) console.log(JSON.stringify({ group }, null, 2));
        else printGroupSummary(group);
        return { group };
      } finally {
        store.close();
      }
    }

    if (groupCommand === 'stop') {
      const groupId = args[2];
      if (!groupId) throw new Error('Usage: rudi agent group stop <group-id>');
      const stopGroupImpl = dependencies.stopGroupImpl || stopGroupThroughService;
      const result = await stopGroupImpl(groupId, dependencies);
      if (flags.json) console.log(JSON.stringify(result));
      else printGroupSummary(result.group);
      return result;
    }

    throw new Error(`Unknown rudi agent group command: ${groupCommand || '(missing)'}`);
  }

  if (['attach', 'stop', 'diff', 'promote', 'discard'].includes(subcommand)) {
    const launchId = requiredLaunchId(args, subcommand);
    if (subcommand === 'attach') {
      const attachImpl = dependencies.attachImpl || attachAgentLaunch;
      const launch = await attachImpl(launchId, {
        follow: flags['no-follow'] !== true,
        jsonOutput: flags.json === true,
      });
      if (!flags.json) printLaunchSummary(launch);
      return launch;
    }
    if (subcommand === 'stop') {
      const stopDetachedImpl = dependencies.stopDetachedImpl || stopDetachedThroughService;
      const result = await stopDetachedImpl(launchId, dependencies);
      if (flags.json) console.log(JSON.stringify(result));
      else printLaunchSummary(result.launch);
      return result;
    }

    const implementation = subcommand === 'diff'
      ? (dependencies.diffImpl || diffAgentLaunch)
      : subcommand === 'promote'
        ? (dependencies.promoteImpl || promoteAgentLaunch)
        : (dependencies.discardImpl || discardAgentLaunch);
    const result = await implementation(launchId);
    if (flags.json) console.log(JSON.stringify(result));
    else if (subcommand === 'diff') {
      if (result.patch) console.log(result.patch);
      else if (result.changes?.length) {
        for (const change of result.changes) console.log(`${change.status}  ${change.path}`);
      } else console.log('No changes.');
    } else {
      printLaunchSummary(result.launch);
    }
    return result;
  }

  if (subcommand === 'list' || subcommand === 'status') {
    const storeFactory = dependencies.storeFactory || (() => createLaunchStore());
    const store = storeFactory();
    try {
      if (subcommand === 'list') {
        const launches = store.list({ limit: flags.limit || 50, status: flags.status || null });
        if (flags.json) console.log(JSON.stringify({ launches }, null, 2));
        else printLaunchList(launches);
        return { launches };
      }

      const launchId = args[1];
      if (!launchId) throw new Error('Usage: rudi agent status <launch-id>');
      const launch = store.get(launchId);
      if (!launch) throw new Error(`Launch not found: ${launchId}`);
      if (flags.json) console.log(JSON.stringify({ launch }, null, 2));
      else printLaunchSummary(launch);
      return { launch };
    } finally {
      store.close();
    }
  }

  throw new Error(`Unknown rudi agent command: ${subcommand}`);
}
