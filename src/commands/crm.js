import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMcpStdioClient } from '../mcp-stdio-client.js';

function requireFlagString(flags, name) {
  const value = flags?.[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`--${name} is required`);
  }
  return value.trim();
}

function requireIsoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`--${name} must use YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`--${name} must be a valid calendar date`);
  }
  return value;
}

function optionalBoundedInteger(value, name, { defaultValue, minimum, maximum }) {
  if (value == null) return defaultValue;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`--${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

const EMAIL_PATTERN = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+/gi;
// Keep the extraction boundary aligned with the CRM's current Zod email contract.
const CRM_EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;
const HEADER_ROLES = ['from', 'to', 'cc', 'bcc'];
const GOOGLE_WORKSPACE_STACK = 'stack:google-workspace';
const RUDI_CRM_STACK = 'stack:rudi-crm';

function splitAddressHeader(value) {
  if (typeof value !== 'string' || value.trim() === '') return [];
  const tokens = [];
  let token = '';
  let quoted = false;
  let escaped = false;
  let angleDepth = 0;

  for (const character of value) {
    if (escaped) {
      token += character;
      escaped = false;
      continue;
    }
    if (quoted && character === '\\') {
      token += character;
      escaped = true;
      continue;
    }
    if (character === '"') quoted = !quoted;
    if (!quoted && character === '<') angleDepth += 1;
    if (!quoted && character === '>' && angleDepth > 0) angleDepth -= 1;
    if (!quoted && angleDepth === 0 && (character === ',' || character === ';')) {
      if (token.trim()) tokens.push(token.trim());
      token = '';
      continue;
    }
    token += character;
  }
  if (token.trim()) tokens.push(token.trim());
  return tokens;
}

function displayNameForToken(token, emailIndex) {
  const angleIndex = token.lastIndexOf('<', emailIndex);
  let value = angleIndex >= 0 ? token.slice(0, angleIndex) : token.slice(0, emailIndex);
  const groupIndex = value.lastIndexOf(':');
  if (groupIndex >= 0) value = value.slice(groupIndex + 1);
  value = value.trim().replace(/^"|"$/g, '').replace(/\\(["\\])/g, '$1').trim();
  return value ? value.slice(0, 200) : undefined;
}

function parseAddressHeader(value) {
  const addresses = [];
  let skipped = 0;
  for (const token of splitAddressHeader(value)) {
    const matches = [...token.matchAll(EMAIL_PATTERN)];
    if (matches.length === 0) {
      if (token.includes('@')) skipped += 1;
      continue;
    }
    for (const match of matches) {
      const address = match[0].toLowerCase();
      if (address.length > 320 || !CRM_EMAIL_PATTERN.test(address)) {
        skipped += 1;
        continue;
      }
      addresses.push({
        address,
        displayName: displayNameForToken(token, match.index ?? 0),
      });
    }
  }
  return { addresses, skipped };
}

function requireProviderString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function requireObservedAt(value, field) {
  const normalized = requireProviderString(value, field);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) || Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${field} must be an offset-aware timestamp`);
  }
  return new Date(normalized).toISOString();
}

export function buildDiscoveryObservations(messages, mailbox) {
  if (!Array.isArray(messages)) throw new Error('messages must be an array');
  const normalizedMailbox = requireProviderString(mailbox, 'mailbox').toLowerCase();
  const observations = [];
  let skippedAddresses = 0;

  messages.forEach((message, messageIndex) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new Error(`messages[${messageIndex}] must be an object`);
    }
    const sourceId = requireProviderString(message.messageId, `messages[${messageIndex}].messageId`);
    const sourceThreadId = requireProviderString(message.threadId, `messages[${messageIndex}].threadId`);
    const observedAt = requireObservedAt(message.observedAt, `messages[${messageIndex}].observedAt`);

    for (const role of HEADER_ROLES) {
      const parsed = parseAddressHeader(message[role]);
      skippedAddresses += parsed.skipped;
      const seen = new Set();
      for (const candidate of parsed.addresses) {
        if (candidate.address === normalizedMailbox || seen.has(candidate.address)) continue;
        seen.add(candidate.address);
        observations.push({
          source: 'gmail',
          source_id: sourceId,
          source_thread_id: sourceThreadId,
          observed_at: observedAt,
          address_role: role,
          address: candidate.address,
          ...(candidate.displayName ? { display_name: candidate.displayName } : {}),
          idempotency_key: `${sourceId}:${role}:${candidate.address}`,
          raw: { mailbox: normalizedMailbox },
        });
      }
    }
  });

  return { observations, skippedAddresses };
}

function buildGmailQuery(after, before) {
  const gmailDate = (value) => value.replaceAll('-', '/');
  return `in:anywhere -in:spam -in:trash after:${gmailDate(after)} before:${gmailDate(before)}`;
}

function updateContactRollups(rollups, observations) {
  for (const observation of observations) {
    let rollup = rollups.get(observation.address);
    if (!rollup) {
      rollup = {
        email: observation.address,
        bestDisplayName: null,
        observationCount: 0,
        messageIds: new Set(),
        threadIds: new Set(),
        firstSeen: observation.observed_at,
        lastSeen: observation.observed_at,
        roles: {},
      };
      rollups.set(observation.address, rollup);
    }
    rollup.observationCount += 1;
    rollup.messageIds.add(observation.source_id);
    rollup.threadIds.add(observation.source_thread_id);
    if (observation.observed_at < rollup.firstSeen) rollup.firstSeen = observation.observed_at;
    if (observation.observed_at >= rollup.lastSeen) {
      rollup.lastSeen = observation.observed_at;
      if (observation.display_name) rollup.bestDisplayName = observation.display_name;
    } else if (!rollup.bestDisplayName && observation.display_name) {
      rollup.bestDisplayName = observation.display_name;
    }
    rollup.roles[observation.address_role] = (rollup.roles[observation.address_role] || 0) + 1;
  }
}

function serializeContactRollups(rollups) {
  return [...rollups.values()]
    .map((rollup) => ({
      email: rollup.email,
      bestDisplayName: rollup.bestDisplayName,
      observationCount: rollup.observationCount,
      messageCount: rollup.messageIds.size,
      threadCount: rollup.threadIds.size,
      firstSeen: rollup.firstSeen,
      lastSeen: rollup.lastSeen,
      roles: rollup.roles,
    }))
    .sort((left, right) =>
      right.observationCount - left.observationCount
      || right.lastSeen.localeCompare(left.lastSeen)
      || left.email.localeCompare(right.email));
}

function requireToolObject(value, toolName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${toolName} returned malformed data`);
  }
  return value;
}

export async function executeGmailSweep(options, dependencies) {
  if (!dependencies || typeof dependencies.callTool !== 'function') {
    throw new Error('executeGmailSweep requires a callTool dependency');
  }
  const { callTool } = dependencies;
  let crm = null;
  if (options.record) {
    const readiness = requireToolObject(
      await callTool(`${RUDI_CRM_STACK}.rudi_crm_setup_status`, {}),
      'rudi_crm_setup_status',
    );
    if (readiness.ok !== true) {
      throw new Error('RUDI CRM is not ready; run rudi_crm_setup_status for details');
    }
    crm = {
      readiness,
      recorded: {
        received: 0,
        inserted: 0,
        updated: 0,
        duplicates: 0,
        newDomains: 0,
      },
    };
  }
  const profile = requireToolObject(
    await callTool(`${GOOGLE_WORKSPACE_STACK}.gmail_profile`, { account: options.account }),
    'gmail_profile',
  );
  const profileEmail = requireProviderString(profile.emailAddress, 'gmail_profile.emailAddress').toLowerCase();
  if (options.account.includes('@') && options.account.toLowerCase() !== profileEmail) {
    throw new Error(`Authenticated Gmail profile ${profileEmail} does not match --account ${options.account}`);
  }

  const query = buildGmailQuery(options.after, options.before);
  const rollups = new Map();
  const seenPageTokens = new Set();
  let nextPageToken;
  let messagesSeen = 0;
  let observationsSeen = 0;
  let skippedAddresses = 0;
  let recordBuffer = [];

  const flushRecordBuffer = async (force = false) => {
    while (recordBuffer.length >= 500 || (force && recordBuffer.length > 0)) {
      const size = recordBuffer.length >= 500 ? 500 : recordBuffer.length;
      const batch = recordBuffer.splice(0, size);
      const recorded = requireToolObject(
        await callTool(`${RUDI_CRM_STACK}.rudi_crm_record_discovery_observations`, {
          observations: batch,
        }),
        'rudi_crm_record_discovery_observations',
      );
      for (const field of ['received', 'inserted', 'updated', 'duplicates']) {
        const value = Number(recorded[field] ?? 0);
        if (!Number.isInteger(value) || value < 0) {
          throw new Error(`rudi_crm_record_discovery_observations returned invalid ${field}`);
        }
        crm.recorded[field] += value;
      }
      const newDomains = Number(recorded.new_domains ?? 0);
      if (!Number.isInteger(newDomains) || newDomains < 0) {
        throw new Error('rudi_crm_record_discovery_observations returned invalid new_domains');
      }
      crm.recorded.newDomains += newDomains;
    }
  };

  do {
    const remaining = options.maxMessages == null
      ? options.pageSize
      : Math.min(options.pageSize, options.maxMessages - messagesSeen);
    if (remaining <= 0) break;
    const pageInput = {
      query,
      max_results: remaining,
      account: options.account,
      ...(nextPageToken ? { next_page_token: nextPageToken } : {}),
    };
    const page = requireToolObject(
      await callTool(`${GOOGLE_WORKSPACE_STACK}.gmail_search_headers`, pageInput),
      'gmail_search_headers',
    );
    if (!Array.isArray(page.messages)) {
      throw new Error('gmail_search_headers returned malformed messages');
    }
    const selectedMessages = options.maxMessages == null
      ? page.messages
      : page.messages.slice(0, options.maxMessages - messagesSeen);
    const extracted = buildDiscoveryObservations(selectedMessages, profileEmail);
    messagesSeen += selectedMessages.length;
    observationsSeen += extracted.observations.length;
    skippedAddresses += extracted.skippedAddresses;
    updateContactRollups(rollups, extracted.observations);
    if (options.record) {
      recordBuffer.push(...extracted.observations);
      await flushRecordBuffer();
    }

    const returnedToken = page.nextPageToken;
    if (returnedToken == null || returnedToken === '') {
      nextPageToken = undefined;
    } else {
      nextPageToken = requireProviderString(returnedToken, 'gmail_search_headers.nextPageToken');
      if (seenPageTokens.has(nextPageToken)) {
        throw new Error(`gmail_search_headers repeated pagination token ${nextPageToken}`);
      }
      seenPageTokens.add(nextPageToken);
    }
  } while (nextPageToken && (options.maxMessages == null || messagesSeen < options.maxMessages));

  if (options.record) {
    await flushRecordBuffer(true);
    crm.heuristics = requireToolObject(
      await callTool(`${RUDI_CRM_STACK}.rudi_crm_apply_discovery_heuristics`, {}),
      'rudi_crm_apply_discovery_heuristics',
    );
    crm.ingestBatch = requireToolObject(
      await callTool(`${RUDI_CRM_STACK}.rudi_crm_log_ingest_batch`, {
        source: 'gmail',
        window_start: options.after,
        window_end: options.before,
        messages_seen: messagesSeen,
        messages_inserted: crm.recorded.inserted,
        messages_updated: crm.recorded.updated,
        skipped_noise: skippedAddresses,
        triage_count: rollups.size,
        notes: `Header-only Gmail contact sweep for ${profileEmail}; observations=${observationsSeen}`,
      }),
      'rudi_crm_log_ingest_batch',
    );
    crm.validators = requireToolObject(
      await callTool(`${RUDI_CRM_STACK}.rudi_crm_run_validators`, { include_rows: false }),
      'rudi_crm_run_validators',
    );
  }

  return {
    schemaVersion: 1,
    kind: 'rudi-crm.gmail-contact-sweep',
    mode: options.record ? 'record' : 'preview',
    account: options.account,
    profileEmail,
    window: { after: options.after, before: options.before },
    query,
    messagesSeen,
    observationsSeen,
    skippedAddresses,
    contactCount: rollups.size,
    contacts: serializeContactRollups(rollups),
    ...(crm ? { crm } : {}),
  };
}

export function normalizeGmailSweepOptions(flags = {}) {
  const account = requireFlagString(flags, 'account');
  const after = requireIsoDate(requireFlagString(flags, 'after'), 'after');
  const before = requireIsoDate(requireFlagString(flags, 'before'), 'before');
  if (before <= after) {
    throw new Error('--before must be later than --after');
  }
  if (flags.record === true && flags.preview === true) {
    throw new Error('--record and --preview cannot be used together');
  }

  return {
    account,
    after,
    before,
    pageSize: optionalBoundedInteger(flags['page-size'], 'page-size', {
      defaultValue: 100,
      minimum: 1,
      maximum: 500,
    }),
    maxMessages: optionalBoundedInteger(flags['max-messages'], 'max-messages', {
      defaultValue: null,
      minimum: 1,
      maximum: 1_000_000,
    }),
    record: flags.record === true,
    output: typeof flags.output === 'string' && flags.output.trim() ? flags.output.trim() : null,
  };
}

function crmHelpText() {
  return `
rudi crm - Operate local CRM workflows

USAGE
  rudi crm sweep-gmail --account <email> --after <YYYY-MM-DD> --before <YYYY-MM-DD> [options]

OPTIONS
  --account <email>       Configured Google Workspace account (required)
  --after <date>          Inclusive sweep start, YYYY-MM-DD (required)
  --before <date>         Exclusive sweep end, YYYY-MM-DD (required)
  --preview               Extract to a private artifact without CRM writes (default)
  --record                Record idempotent discovery evidence in CRM; never promotes people
  --page-size <n>         Gmail page size, 1-500 (default: 100)
  --max-messages <n>      Optional message cap within the bounded window
  --output <path>         Override the private JSON artifact path
  --json                  Print the result as JSON

EXAMPLES
  rudi crm sweep-gmail --account operator@example.com --after 2026-01-01 --before 2026-08-05
  rudi crm sweep-gmail --account operator@example.com --after 2026-01-01 --before 2026-08-05 --record

The sweep reads From, To, Cc, and Bcc metadata only. It excludes spam and trash,
deduplicates exact normalized addresses, and never creates or attaches CRM people.
`;
}

function defaultRudiHome() {
  return process.env.RUDI_HOME || path.join(os.homedir(), '.rudi');
}

function defaultSweepOutputPath(options) {
  const accountSlug = options.account.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return path.join(
    defaultRudiHome(),
    'outputs',
    'rudi-crm',
    'gmail-sweeps',
    accountSlug,
    `${options.after}_${options.before}-${options.record ? 'record' : 'preview'}.json`,
  );
}

async function writePrivateArtifact(artifact, { requestedPath, options }) {
  const targetPath = requestedPath
    ? path.resolve(process.cwd(), requestedPath)
    : defaultSweepOutputPath(options);
  const directory = path.dirname(targetPath);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = `${targetPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(artifact, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    await fs.rename(temporaryPath, targetPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
  return targetPath;
}

function createDefaultToolClient(verbose) {
  const routerPath = path.join(defaultRudiHome(), 'bins', 'rudi-router');
  if (!existsSync(routerPath)) {
    throw new Error(`RUDI router not found at ${routerPath}; run rudi integrate codex`);
  }
  return createMcpStdioClient({
    command: routerPath,
    env: {
      ...process.env,
      RUDI_ROUTER_TOOL_NAMES: 'canonical',
    },
    onStderr: verbose ? (message) => process.stderr.write(message) : () => {},
  });
}

function printSweepSummary(result, outputPath, log) {
  log(`Gmail contact sweep ${result.mode}`);
  log(`Account: ${result.profileEmail}`);
  log(`Window: ${result.window.after} through ${result.window.before} (end exclusive)`);
  log(`Messages: ${result.messagesSeen}`);
  log(`Unique contacts: ${result.contactCount}`);
  log(`Header observations: ${result.observationsSeen}`);
  if (result.crm) {
    log(`CRM observations inserted: ${result.crm.recorded.inserted}`);
    log(`CRM duplicates: ${result.crm.recorded.duplicates}`);
    log(`CRM validators: ${result.crm.validators.ok === true ? 'passed' : 'violations found'}`);
  } else {
    log('CRM changes: none');
  }
  log('CRM people promoted: 0');
  log(`Artifact: ${outputPath}`);
}

export async function cmdCrm(args, flags, dependencies = {}) {
  const subcommand = args[0];
  const log = dependencies.log || console.log;
  if (!subcommand || subcommand === 'help' || flags.help || flags.h) {
    log(crmHelpText());
    return null;
  }
  if (subcommand !== 'sweep-gmail') {
    throw new Error(`Unknown CRM command: ${subcommand}. Run 'rudi help crm' for usage.`);
  }

  const options = normalizeGmailSweepOptions(flags);
  let client = null;
  const callTool = dependencies.callTool || (() => {
    client = createDefaultToolClient(flags.verbose === true);
    return client.callJsonTool.bind(client);
  })();

  try {
    const result = await executeGmailSweep(options, { callTool });
    const artifact = {
      ...result,
      generatedAt: (dependencies.now ? dependencies.now() : new Date()).toISOString(),
    };
    const writer = dependencies.writeArtifact || writePrivateArtifact;
    const outputPath = await writer(artifact, {
      requestedPath: options.output,
      options,
    });
    const commandResult = { ...artifact, outputPath };
    if (flags.json === true) {
      log(JSON.stringify(commandResult, null, 2));
    } else {
      printSweepSummary(commandResult, outputPath, log);
    }
    return commandResult;
  } finally {
    await client?.close();
  }
}
