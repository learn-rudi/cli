## Phase 0: Baseline And Manual Lookup

- Scope: Normalize Claude Code `rate_limit_event` payloads and prove native Claude/Codex stack calls through the RUDI router.
- Files to inspect before editing: `src/commands/agent/normalizers/claude.js`, `src/commands/agent/normalizers/index.js`, `src/__tests__/unit/claude-normalizer.test.js`, Agent Host event streaming and launch persistence modules.
- Relevant SWE manual sections: Appendix C (data-normalization tests and red-green-refactor) and Appendix D (reproduce, localize, minimally correct).
- Current-state commands: foreground Claude JSON launch to capture the native payload; targeted normalizer test; `rudi agent hosts --json`; `rudi list stacks --json`.
- Risks and invariants: provider payloads are untrusted; preserve typed fields only; the event must stop appearing as `system/unknown`; native session ownership remains with Claude/Codex.
- Exit criteria: native payload reproduced and the divergence localized to the Claude normalizer fallback.

## Phase 1: Scope Lock

- In scope: one normalized `system/rate_limit` contract, its behavior test, canonical schema documentation, verification, and read-only live stack demonstrations.
- Non-goals: changing provider session storage, stack implementations, permissions, launch lifecycle, or unrelated unknown-event behavior.
- Expected files touched: this record, `src/__tests__/unit/claude-normalizer.test.js`, `src/commands/agent/normalizers/claude.js`, and `src/commands/agent/normalizers/index.js` only if its schema comment must reflect the new field.
- External inputs and trust boundaries: Claude stream-JSON `rate_limit_info`; accept only explicitly typed fields.
- Failure behavior to define: malformed or missing fields still produce a recognized rate-limit event with safe defaults, not an exception or raw payload leak.
- Exit criteria: no new dependencies and no unrelated refactor.

## Phase 2: Red Tests

- Observable behavior to prove: `rate_limit_event` becomes `system/rate_limit` and retains validated reset/overage metadata.
- Test files to add or edit: `src/__tests__/unit/claude-normalizer.test.js`.
- Red command: `node --test src/__tests__/unit/claude-normalizer.test.js`.
- Expected failure: current normalizer returns subtype `unknown` and has no typed rate-limit metadata.
- Exit criteria: failure occurs at the new expectation for the intended reason.

## Phase 3: Implementation

- Implementation rules: smallest explicit mapper; camelCase canonical output; no raw-object pass-through.
- Files allowed to change: Claude normalizer and canonical schema comment.
- Validation and error-handling requirements: copy strings, finite numeric timestamps, and booleans only; supply a stable status/message fallback.
- Observability requirements: status, limit type, reset timestamps, and overage state remain visible in normalized artifacts.
- Exit criteria: unchanged red command passes.

## Phase 4: Green Tests And Refactor

- Green command: `node --test src/__tests__/unit/claude-normalizer.test.js`.
- Refactor constraints: none unless duplication materially obscures validation.
- Regression checks: Agent Host event and provider normalizer suites.
- Exit criteria: targeted and adjacent suites pass without weakening assertions.

## Phase 5: Full Verification

- Targeted tests: Claude normalizer and Agent Host event tests.
- Full suite: package test command if feasible.
- Build/typecheck/lint: repository build command.
- JS/TS debt scan, if applicable: repository runner or direct scanner against edited JS files using `.debt-scan.json`.
- Live smoke checks: Claude emits `system/rate_limit`; Claude and Codex each invoke `swe-engineering.swe_manual_search` through the RUDI MCP router.
- Exit criteria: no blocking findings, both provider launches terminate, and daemon reports zero active jobs.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: canonical event schema comment only; no user documentation needed for an internal normalization correction.
- Final files touched: record exact list at closure.
- Commands run and results: record red, green, full verification, debt scan, and smoke launch IDs.
- Accepted debt: record any provider-native events still intentionally classified as unknown.
- Definition of Done: recognized rate-limit event, green verification, successful stack calls from both providers, exact session/artifact locations reported.

## Closure Evidence

- Red: `node --test src/__tests__/unit/claude-normalizer.test.js` failed because `rate_limit_event` normalized to `system/unknown`.
- Green: the unchanged command passed 2/2 tests after the typed mapper was added.
- Adjacent regression: Claude normalizer plus Agent Host launch, attach, and detached suites passed 11/11 tests.
- Full suite: `npm test` passed 1,108/1,108 tests.
- Build: `npm run build` completed successfully.
- Debt scan: `node scripts/agent-debt-runner.mjs --edited src/commands/agent/normalizers/claude.js,src/commands/agent/normalizers/index.js,src/__tests__/unit/claude-normalizer.test.js` reported zero findings.
- Claude smoke: `launch_30dcc28e0816450a99eeddd7270f459b` persisted `system/rate_limit`, successfully called `mcp__rudi__stack_swe-engineering_swe_manual_search`, and had an empty worktree diff.
- Codex smoke: `launch_4d1052b1a1554f4e97c70eb1a6560353` successfully called `stack:swe-engineering.swe_manual_search`, returned three matches, and had an empty worktree diff.
- Daemon closure: healthy and ready with zero active sessions and zero active jobs.
- Accepted debt: Claude tool-result messages currently arrive as provider event type `user` and remain `system/unknown`; they do not prevent tool-use/result completion, but deserve a separately scoped normalization contract.
