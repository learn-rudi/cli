# Private Agent Host Automation Profile

## Phase 0: Baseline And Manual Lookup

- Status: complete.
- Scope: add a provider-neutral, stdin-only, metadata-only Agent Host profile
  for bounded private classification through exact Codex and Claude models.
- Files inspected: `AGENTS.md`, Agent Host CLI inputs, launch/workspace/event
  flow, provider builders/config, artifacts/store tests, and frontier-host docs.
- Relevant SWE manual sections: F5 trust boundaries, F12 security testing, F13
  agent security, G4 side effects, H1 artifact integrity, and Testing Doctrine.
- Current risk: normal provider plans can place prompts in argv and persist
  normalized content events; private email cannot use that path.
- Exit criteria: exact provider/model, prompt, workspace, tool, output,
  persistence, timeout, and failure invariants are explicit before code.

## Phase 1: Scope Lock

- Status: complete.
- In scope: provider-neutral profile `private-automation-v1`; exact canonical
  configured Codex or Claude model; prompt stdin; explicit JSON schema; empty read-only
  workspace; no tools/MCP/browser/shell; ephemeral execution; one bounded
  attempt; metadata-only artifacts; 165-second maximum, 2-MiB raw-stream and
  64-KiB final-result ceilings; no fallback.
- Non-goals: sessions/resume, detached/group work, writable workspaces, images,
  arbitrary provider args, provider selection, business retries, or storing
  prompts/model output.
- External inputs: CLI flags, stdin bytes, schema file, provider JSONL, stderr,
  user/provider configuration, and provider/model catalogs.
- Failure behavior: reject conflicting flags before workspace/process creation;
  fail on tool events, output overflow, model mismatch, unknown events carrying
  content, unconfirmed termination, or metadata persistence failure.
- Exit criteria: one behavior test demonstrates the existing argv/content
  persistence path fails the private contract.

## Phase 2: Red Tests

- Status: complete.
- Test: `src/__tests__/unit/agent-host-private-automation.test.js`.
- Red command: `node --test src/__tests__/unit/agent-host-private-automation.test.js`.
- Observed failure: `ERR_MODULE_NOT_FOUND` for
  `src/agent-host/private-automation-profile.js`, before the guarded launch path
  existed.

## Phase 3: Implementation

- Status: complete.
- Allowed files: the scope-locked Agent Host CLI, inputs, launch, event stream,
  provider common/Codex/Claude builders/config, focused test/docs, and tracked
  `dist/index.cjs` build output.
- Implemented: canonical model/schema profile validation; stdin-only provider
  plans; empty launch-owned read-only workspace; explicit Codex and Claude
  no-tool controls; environment allowlist; metadata-only event projection;
  raw/final output bounds; safe errors; suppressed private stderr and session
  identity; foreground-only command guard.

## Phase 4: Green Tests And Refactor

- Status: complete for focused and adjacent regression suites.
- Focused result: 16/16 passing, including pre-egress provider capability
  gating and argv/stdin/env/workspace/artifact/DB
  isolation, malformed output, closed provider event types, Claude
  missing/different observed model identity, contradictory Codex model fields,
  tool events, process-group termination, raw/final
  overflow, timeout, and forbidden command surfaces.
- Adjacent result: 42/42 passing across Agent Host command, launch, provider,
  provider-environment, workspace, and model suites.

## Phase 5: Full Verification

- Status: complete for source; compatible authenticated
  live providers remain a deployment prerequisite.
- Required: focused test, full `pnpm test`, `pnpm build`, reproducible dist
  check, changed-file debt scan, package dry-run, argv/artifact/log privacy
  smoke tests, and exact provider probes with synthetic data.
- Completed evidence:
  - full test: 633/633 passing on the combined CLI 1.10.15 lineage outside the network-bind sandbox; the initial
    sandboxed run had only the expected localhost `EPERM` smoke-test failure;
  - build: passing; two builds produced identical SHA-256 hashes
    (`dist/index.cjs` =
    `b48ce66b742dbe4990939447500e2e0d6a236435964d90acc823053e72615e97`);
  - package dry-run: six expected package entries only;
  - RUDI debt scan, `pr-review` profile: zero findings;
  - integrated synthetic privacy tests: prompt absent from provider argv,
    environment, stderr, database, native session field, and artifacts;
  - Codex 0.147.0: its official release binary accepts `view_image` as an
    explicitly disabled feature in the empty-stdin strict-config sentinel. A
    direct benign probe returned the requested closed JSON and emitted only a
    fail-closed diagnostic that Code Mode was unavailable because its host was
    disabled. The Luna lane stays disabled until that exact binary is installed
    and the integrated RUDI live probe repeats that result;
  - Claude 2.1.226: authenticated through the RUDI secret-mediated wrapper. A
    benign live provider probe with tools empty, nonessential traffic disabled,
    no fallback, simple prompt mode, and post-response schema validation
    reported no tools and only `claude-sonnet-5` model usage. Its stream also
    emits numeric-only `thinking_tokens` progress metadata, now closed-shape
    allowlisted without persistence. The installed RUDI profile must repeat that
    probe after this source is packaged.

## Phase 6: Docs, Contracts, And Closure

- Status: complete for source; live provider probe and deployment evidence are
  still gated.
- Definition of Done: private prompts appear only on stdin; launch artifacts
  and operational logs remain metadata-only; exact model/no-tool/schema/output
  contracts are enforced for both providers; rollback material is recorded.
