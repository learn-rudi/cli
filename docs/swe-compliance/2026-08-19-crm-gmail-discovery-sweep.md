# CRM Gmail Discovery Sweep

## Phase 0: Baseline

- Status: complete.
- Scope: publish the follower Mac's unmatched `rudi crm sweep-gmail` work as a
  preview-first, bounded contact-discovery workflow.
- Source boundaries inspected: CLI command routing/help, canonical RUDI router
  naming, Google Workspace `gmail_profile` and `gmail_search_headers`, and RUDI
  CRM discovery, heuristic, ingest-log, and validator contracts.
- Invariants: header metadata only; explicit account and dates; no message body,
  snippet, or subject; no person creation/merge/attachment/promotion; no secret
  values in output; unrelated dirty CLI work remains untouched.

## Phase 1: Scope Lock

- Add one `crm sweep-gmail` command and its help/routing tests.
- Add one bounded stdio MCP client used only through the local RUDI router.
- Default to a private preview artifact. Permit CRM discovery writes only with
  `--record`, in batches of at most 500 observations.
- Validate every provider response, pagination token, address, timestamp,
  counter, account match, and output option at its boundary.
- No live Gmail or CRM mutation is part of source verification on this follower
  host.

## Phase 2: Behavior Evidence

- Existing feature tests define the command contract, preview/write separation,
  owner-only artifact mode, header normalization, idempotency keys, pagination,
  and no-promotion invariant.
- The feature arrived as uncommitted recovery work with implementation and tests
  already present, so its original red runs are unavailable. Publication review
  therefore adds failure-path coverage and records this explicit RGR limitation
  rather than inventing retrospective red evidence.
- Focused command: `node scripts/run-tests.js src/__tests__/unit/mcp-stdio-client.test.js`.
- Added boundary: a router spawn failure rejects the tool call and `close()`
  settles promptly instead of leaving the caller waiting.

## Phase 3: Implementation

- Preserve the existing behavior-bearing source from the dirty primary checkout
  on an isolated branch based on the current CLI PR stack.
- Verify router startup/shutdown terminal state so spawn failure rejects pending
  requests and `close()` settles promptly.
- Replace personal mailbox examples with neutral documentation/test fixtures.
- Add no dependencies.

## Phase 4: Green And Refactor

- Rerun the unchanged MCP failure-path test.
- Run the CRM command, MCP client, routing, command-surface, and export tests.
- Refactor only code covered by the focused tests, then rerun them unchanged.

## Phase 5: Full Verification

- `pnpm test`
- `pnpm build`, followed by a clean reproducibility check
- `node scripts/agent-debt-runner.mjs --changed-since fix/17-tool-index-process-trees --no-log`
- `npm pack --dry-run --json`
- `git diff --check fix/17-tool-index-process-trees...HEAD`
- Confirm the PR contains only CRM/MCP source, focused docs/tests, command help,
  and the generated CLI bundle.

## Phase 6: Closure

- Publish a ready stacked PR linked to the issue.
- Do not execute a real Gmail sweep or write CRM discovery state during source
  acceptance. That remains a separately authorized operator action after merge.
- Do not reconcile the follower Mac's primary dirty CLI checkout until every
  remaining path is mapped to durable history.
