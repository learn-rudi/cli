# Shared router dispatch core and local stdio parity

Status: Phase 5 verification and independent-review remediation. Cross-repository
authority and deployment gates are recorded in the System compliance ledger.

## Phase 0: Baseline And Manual Lookup

- Baseline: clean GitHub-main worktree at `f69e76c`.
- Inspect: `src/router-mcp.js`, `src/router-tool-names.js`, `packages/mcp`, test
  runner, package/build metadata, and tracked `dist` output.
- Risk: High because all installed local stacks use this router.
- Invariant: the stdio wire behavior, tool names, cache precedence, lazy stack
  execution, error isolation, pool lifecycle, and no-network boundary remain
  unchanged.

## Phase 1: Scope Lock

- Add one transport/execution-independent dispatcher API to `packages/mcp`;
  retain subprocess/config/secrets/pool ownership in the local adapter.
- Modify `src/router-mcp.js` only to compose the shared core with that adapter.
- Add characterization/parity tests and package API declarations. Refresh
  tracked build output in its own verified slice.
- Non-goals: local OAuth, HTTP listener, relay, stack behavior changes, secrets
  migration, or unrelated router hardening.
- Commits/push/PR are authorized; package publication is a later release gate.
- Add a package-specific, manual, main-only trusted-publishing workflow for
  `@learnrudi/mcp`; configuring npm trust and invoking publication remain later
  release gates.

## Phase 2: Red Tests

- Prove canonical/portable names, cache > inline > live precedence, skipped
  stacks, unknown/malformed tool denial, downstream error propagation,
  initialize/list/call/ping/notification/method-not-found handling.
- Historical proof gap: the exact pre-extraction characterization command was
  not durably recorded before implementation and cannot be reconstructed.
  Independent review later reproduced two expected red behaviors against the
  pre-remediation design: an undiscovered canonical call reached its adapter,
  and one malformed live `tools/list` result hid healthy stacks. Those findings
  are preserved as review evidence, not rewritten as an invented original red
  command.
- Release-workflow contract red, Node `v20.20.2`:
  `node --test src/__tests__/unit/quality-workflow-contract.test.js` -> six
  passed and one failed because `.github/workflows/publish-mcp-npm.yml` did not
  exist. The failure established the missing package publication path before
  implementation.

## Phase 3: Implementation

- Core accepts explicit adapters and policy predicates; it never reads local
  files, environment, secrets, stdio, HTTP, or process-global tenant state.
- Public errors remain stable; inputs are validated before adapter invocation.
- The package release path uses exact manual version input, immutable action
  pins, the npm trusted-publishing runtime floor, registry immutability checks,
  package-focused tests, dependency audit, and an exact packed-file allowlist.
  It contains no npm token fallback.

## Phase 4: Green Tests And Refactor

- Release-workflow contract green, Node `v20.20.2`: the exact red command now
  passes 7/7 after adding the package metadata and workflow. The workflow YAML
  parses successfully and all eight embedded run scripts pass `bash -n`.
- Exact Node 20.20.2 focused core/parity command passed 11/11.
- Exact Node 20.20.2 stdio characterization passed 2/2 and now proves canonical
  and portable calls, cache over competing inline declarations, inline over
  live discovery, disabled-live skipping, malformed-live isolation,
  downstream JSON-RPC call failure propagation, notifications, ping, and
  method-not-found behavior.
- Matching-native-runtime full suite passed 783/783 after extraction and
  tracked `dist` regeneration. After merging current `origin/main` at
  `a7c5b4d`, the same suite passed 786/786; the three additional tests are from
  the upstream CLI 1.10.26 release slice. The later docs-only current-main head
  `606c586` was also merged before final publication without changing router
  behavior or test inventory.

## Phase 5: Full Verification

Reproduction record (working directory
`/Users/hoff/RUDI/worktrees/hosted-router-v1/cli` unless noted):

- Focused, Node `v20.20.2`: `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH node --test packages/mcp/src/__tests__/unit/router-core.test.js src/__tests__/unit/router-tool-names.test.js src/__tests__/unit/router-mcp-characterization.test.js` -> 11/11.
- Full, Node `v25.2.1`: `pnpm test` -> 783/783 before the current-main merge;
  rerunning the same command after merging `a7c5b4d`, and again after the
  docs-only `606c586` merge -> 786/786.
- Build, Node `v20.20.2`: `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH pnpm build` -> pass.
- Current-main lock/build reconciliation, Node `v20.20.2`:
  `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH pnpm install --frozen-lockfile`
  followed by the recorded build command -> pass; the regenerated tracked
  bundles matched the merged index byte-for-byte.
- Root package, Node `v20.20.2`: `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH npm pack --dry-run --json` -> six files.
- MCP package, working directory `packages/mcp`, Node `v20.20.2`:
  `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH npm pack --dry-run --json` -> nine files.
- Historical pre-remediation production audit: `pnpm audit --prod` reported
  five high and three moderate findings. The current release-path audit below
  supersedes that historical result.
- Node 20 environment gap: `PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH pnpm test` -> blocked when unchanged `better-sqlite3` ABI 141 was loaded by ABI 115.
- Debt tool: `swe_debt_scan` with repo equal to the workdir, config
  `.debt-scan.json`, profile `pr-review`, and the seven edited implementation/
  test JS files -> 276 files in graph, seven reported, zero findings.
- Built-router smoke: create an empty root with
  `router_smoke_root=$(mktemp -d /private/tmp/rudi-router-dist-smoke.XXXXXX)`,
  then pipe JSON-RPC `initialize` and `ping` lines to
  `RUDI_HOME="$router_smoke_root" PATH=/Users/hoff/.nvm/versions/node/v20.20.2/bin:$PATH node dist/router-mcp.js` -> protocol `2024-11-05` and `{}` ping result.
- Whitespace: `git diff --check` -> pass.

- Exact Node 20.20.2 `pnpm build`: pass; temporary outputs matched tracked
  generated artifacts byte-for-byte.
- Current release-path verification: `pnpm install --frozen-lockfile` passed;
  `pnpm test` passed 787/787; `pnpm build` passed and left `dist` plus
  `src/packages-manifest.json` unchanged; changed-file debt scan reported zero
  findings; `pnpm audit --prod --audit-level=moderate` reported no known
  vulnerabilities; root pack remained six files.
- Root `npm pack --dry-run`: six intended files. `@learnrudi/mcp@1.1.0`
  package dry-run: nine intended source/declaration files; tests excluded.
- The nine-file dry-run exactly matches the workflow allowlist. Both action
  references are immutable 40-character pins; the workflow YAML parsed and
  all embedded shell scripts passed syntax validation. `actionlint` was not
  installed locally, so that optional linter was not run.
- Edited-file SWE debt scan: zero findings. `git diff --check`: pass.
- Built `dist/router-mcp.js` completed an isolated Node 20 stdio
  initialize/ping smoke with an empty temporary RUDI home.
- Current production dependency audit reports no known vulnerabilities. Root
  dependency metadata and lockfile are unchanged by this release-workflow
  slice, and `@learnrudi/mcp` has no runtime dependencies.
- Exact Node 20 full-suite proof is locally blocked by the unchanged
  `better-sqlite3` native binary compiled for ABI 141 instead of Node 20 ABI
  115. The full suite passes on the matching native runtime; a fresh-install
  Node 20 CI run remains the closing environment proof.
- Independent final review: Standards pass, Spec pass, Proof pass, overall
  pass; no P0-P3 findings remain after ledger and characterization remediation.

## Phase 6: Docs, Contracts, And Closure

- Package publication, merge, and hosted activation remain separately gated.
- `@learnrudi/mcp@1.0.0` exists on npm; `1.1.0` is not published. After merge,
  npm must trust the exact `publish-mcp-npm.yml` workflow before an authorized
  manual run can publish it.
- Record final commit/PR, CI result, admin-Mac verification, review verdict,
  and worktree closeout receipt before closure.
