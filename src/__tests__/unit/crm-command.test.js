import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildDiscoveryObservations,
  cmdCrm,
  executeGmailSweep,
  normalizeGmailSweepOptions,
} from '../../commands/crm.js';

test('CRM Gmail sweep requires an explicit account and bounded date window', () => {
  assert.deepEqual(
    normalizeGmailSweepOptions({
      account: 'operator@example.com',
      after: '2026-01-01',
      before: '2026-08-05',
    }),
    {
      account: 'operator@example.com',
      after: '2026-01-01',
      before: '2026-08-05',
      pageSize: 100,
      maxMessages: null,
      record: false,
      output: null,
    },
  );

  assert.throws(
    () => normalizeGmailSweepOptions({ after: '2026-01-01', before: '2026-08-05' }),
    /--account is required/,
  );
  assert.throws(
    () => normalizeGmailSweepOptions({ account: 'operator@example.com', after: '2026-08-05', before: '2026-08-05' }),
    /--before must be later than --after/,
  );
});

test('CRM command writes a private preview artifact through its output boundary', async () => {
  let written = null;
  const result = await cmdCrm(['sweep-gmail'], {
    account: 'operator@example.com',
    after: '2026-08-01',
    before: '2026-08-05',
    json: true,
  }, {
    callTool: async (name) => {
      if (name === 'stack:google-workspace.gmail_profile') {
        return { emailAddress: 'operator@example.com' };
      }
      return { messages: [] };
    },
    writeArtifact: async (artifact, options) => {
      written = { artifact, options };
      return '/private/sweep.json';
    },
    log: () => {},
    now: () => new Date('2026-08-05T12:00:00.000Z'),
  });

  assert.equal(result.outputPath, '/private/sweep.json');
  assert.equal(written.artifact.generatedAt, '2026-08-05T12:00:00.000Z');
  assert.equal(written.options.requestedPath, null);
  assert.equal(written.artifact.mode, 'preview');
});

test('CRM command stores default sweep artifacts with owner-only permissions', async () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rudi-crm-output-'));
  const previousRudiHome = process.env.RUDI_HOME;
  process.env.RUDI_HOME = tempHome;
  try {
    const result = await cmdCrm(['sweep-gmail'], {
      account: 'operator@example.com',
      after: '2026-08-01',
      before: '2026-08-05',
    }, {
      callTool: async (name) => name === 'stack:google-workspace.gmail_profile'
        ? { emailAddress: 'operator@example.com' }
        : { messages: [] },
      log: () => {},
    });

    assert.equal(fs.statSync(result.outputPath).mode & 0o777, 0o600);
    assert.equal(result.outputPath.startsWith(tempHome), true);
  } finally {
    if (previousRudiHome == null) delete process.env.RUDI_HOME;
    else process.env.RUDI_HOME = previousRudiHome;
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});

test('CRM Gmail preview validates the account, paginates headers, and never writes CRM state', async () => {
  const calls = [];
  const headerPages = [
    {
      messages: [{
        messageId: 'message-1',
        threadId: 'thread-1',
        observedAt: '2026-02-01T12:00:00.000Z',
        from: 'Alice <alice@example.com>',
        to: 'operator@example.com',
        cc: '',
        bcc: '',
      }],
      nextPageToken: 'page-2',
    },
    {
      messages: [{
        messageId: 'message-2',
        threadId: 'thread-2',
        observedAt: '2026-03-01T12:00:00.000Z',
        from: 'Alice Example <ALICE@example.com>',
        to: 'operator@example.com, Bob <bob@example.com>',
        cc: '',
        bcc: '',
      }],
    },
  ];
  const callTool = async (name, input) => {
    calls.push({ name, input });
    if (name === 'stack:google-workspace.gmail_profile') {
      return { emailAddress: 'operator@example.com', messagesTotal: 20 };
    }
    if (name === 'stack:google-workspace.gmail_search_headers') {
      return headerPages.shift();
    }
    throw new Error(`Unexpected tool call: ${name}`);
  };

  const result = await executeGmailSweep({
    account: 'operator@example.com',
    after: '2026-01-01',
    before: '2026-08-05',
    pageSize: 100,
    maxMessages: null,
    record: false,
    output: null,
  }, { callTool });

  assert.equal(result.mode, 'preview');
  assert.equal(result.messagesSeen, 2);
  assert.equal(result.observationsSeen, 3);
  assert.deepEqual(result.contacts.map((contact) => contact.email), [
    'alice@example.com',
    'bob@example.com',
  ]);
  assert.equal(result.contacts[0].observationCount, 2);
  assert.equal(result.contacts[0].messageCount, 2);
  assert.deepEqual(calls.map((call) => call.name), [
    'stack:google-workspace.gmail_profile',
    'stack:google-workspace.gmail_search_headers',
    'stack:google-workspace.gmail_search_headers',
  ]);
  assert.equal(
    calls[1].input.query,
    'in:anywhere -in:spam -in:trash after:2026/01/01 before:2026/08/05',
  );
  assert.equal(calls[2].input.next_page_token, 'page-2');
});

test('CRM Gmail sweep fails closed when a provider repeats a pagination token', async () => {
  let pageCalls = 0;
  const callTool = async (name) => {
    if (name === 'stack:google-workspace.gmail_profile') {
      return { emailAddress: 'operator@example.com' };
    }
    if (name === 'stack:google-workspace.gmail_search_headers') {
      pageCalls += 1;
      return { messages: [], nextPageToken: 'repeated-page' };
    }
    throw new Error(`Unexpected tool call: ${name}`);
  };

  await assert.rejects(
    executeGmailSweep({
      account: 'operator@example.com',
      after: '2026-01-01',
      before: '2026-08-05',
      pageSize: 100,
      maxMessages: null,
      record: false,
      output: null,
    }, { callTool }),
    /repeated pagination token repeated-page/,
  );
  assert.equal(pageCalls, 2);
});

test('CRM Gmail record mode writes discovery evidence but never promotes people', async () => {
  const calls = [];
  const callTool = async (name, input) => {
    calls.push({ name, input });
    switch (name) {
      case 'stack:rudi-crm.rudi_crm_setup_status':
        return { ok: true, checks: [] };
      case 'stack:google-workspace.gmail_profile':
        return { emailAddress: 'operator@example.com' };
      case 'stack:google-workspace.gmail_search_headers':
        return {
          messages: [{
            messageId: 'message-record',
            threadId: 'thread-record',
            observedAt: '2026-04-01T12:00:00.000Z',
            from: 'Alice <alice@example.com>',
            to: 'operator@example.com',
            cc: '',
            bcc: '',
          }],
        };
      case 'stack:rudi-crm.rudi_crm_record_discovery_observations':
        return { received: 1, inserted: 1, updated: 0, duplicates: 0, new_domains: 1 };
      case 'stack:rudi-crm.rudi_crm_apply_discovery_heuristics':
        return { updated: 1 };
      case 'stack:rudi-crm.rudi_crm_log_ingest_batch':
        return { batch_id: 'batch-1' };
      case 'stack:rudi-crm.rudi_crm_run_validators':
        return { ok: true, total_violations: 0 };
      default:
        throw new Error(`Unexpected tool call: ${name}`);
    }
  };

  const result = await executeGmailSweep({
    account: 'operator@example.com',
    after: '2026-01-01',
    before: '2026-08-05',
    pageSize: 100,
    maxMessages: null,
    record: true,
    output: null,
  }, { callTool });

  assert.equal(result.mode, 'record');
  assert.equal(result.crm.recorded.inserted, 1);
  assert.equal(result.crm.validators.ok, true);
  assert.deepEqual(calls.map((call) => call.name), [
    'stack:rudi-crm.rudi_crm_setup_status',
    'stack:google-workspace.gmail_profile',
    'stack:google-workspace.gmail_search_headers',
    'stack:rudi-crm.rudi_crm_record_discovery_observations',
    'stack:rudi-crm.rudi_crm_apply_discovery_heuristics',
    'stack:rudi-crm.rudi_crm_log_ingest_batch',
    'stack:rudi-crm.rudi_crm_run_validators',
  ]);
  assert.equal(
    calls.some((call) => call.name.includes('promote_contact')),
    false,
  );
});

test('CRM Gmail sweep converts headers into normalized external observations', () => {
  const result = buildDiscoveryObservations([
    {
      messageId: 'message-1',
      threadId: 'thread-1',
      observedAt: '2026-08-04T14:30:00.000Z',
      from: 'Client Person <CLIENT@example.com>',
      to: 'operator@example.com, "Doe, Jane" <Jane@example.com>',
      cc: 'Client Person <client@example.com>',
      bcc: 'HubSpot relay <1axc2dl8emii2ouijre1gpzzvbm9svxxudxb8u-operator=example.com@bf53x.hubspotemail.net>, undisclosed-recipients:;',
    },
  ], 'operator@example.com');

  assert.deepEqual(
    result.observations.map((observation) => ({
      role: observation.address_role,
      address: observation.address,
      name: observation.display_name,
      key: observation.idempotency_key,
    })),
    [
      {
        role: 'from',
        address: 'client@example.com',
        name: 'Client Person',
        key: 'message-1:from:client@example.com',
      },
      {
        role: 'to',
        address: 'jane@example.com',
        name: 'Doe, Jane',
        key: 'message-1:to:jane@example.com',
      },
      {
        role: 'cc',
        address: 'client@example.com',
        name: 'Client Person',
        key: 'message-1:cc:client@example.com',
      },
    ],
  );
  assert.equal(result.skippedAddresses, 1);
  assert.deepEqual(result.observations[0].raw, { mailbox: 'operator@example.com' });
});
