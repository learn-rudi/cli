# CLI Platform Consolidation Compliance Checklist

Date: 2026-08-02

Status: Complete

Architecture decision: [ADR 0001](../adr/0001-retire-legacy-agent-execution.md)

## Phase 0: Baseline And Manual Lookup

- Scope: add blocking GitHub quality checks; expose a clear core/advanced/internal command taxonomy; retire legacy agent execution and imported-session ownership; preserve a thin Agent Host boundary; decompose oversized adapters where responsibility is mixed.
- Files inspected before editing: `AGENTS.md`, `CLAUDE.md`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `.debt-scan.json`, `src/index.js`, `packages/utils/src/help.js`, `src/commands/serve.js`, `src/commands/daemon.js`, `src/commands/agent-host.js`, `src/commands/agent/**`, `src/commands/sessions/**`, `src/agent-host/**`, `src/daemon/**`, `packages/db/**`, `packages/embeddings/**`, `packages/runner/**`, focused tests, daemon/Agent Host architecture docs, and checked-in sibling Bot/Studio consumers.
- Relevant SWE manual sections: Master Doctrine Sections I-III and Appendix C; Infrastructure Standard H1 build artifacts and H6 observability; Build Order phase gates; security guidance for CI, local auth, secrets, agents, and destructive cleanup.
- Current-state commands:
  - `npm test` -> pass: 1,112 tests, 0 failures.
  - `npm run build` -> pass.
  - `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` -> pass: 0 findings.
  - GitHub -> no workflows, no branch protection, no rulesets, and no PR checks.
- Risks and invariants:
  - Native providers own sessions, transcripts, model loops, and provider-native orchestration.
  - RUDI owns capability discovery/install/run, secrets, MCP, indexes, durable artifacts, safe workspaces, bounded launch lifecycle, and daemon health.
  - `agent-hosts.db` contains lifecycle projection only; normalized event artifacts are a bounded reconnect cache, not the authoritative transcript.
  - Existing user `rudi.db` files are never automatically deleted.
  - `packages/db` remains isolated until checked-in Studio is retired or migrated; the CLI runtime must not import it.
  - Checked-in Bot calls retired `/agent/*` routes and is intentionally no longer supported by this CLI contract.
- Exit criteria: baseline is reproducible; retirement decision is evidence-backed and reviewed; user-owned work is identified before edits.

## Phase 1: Scope Lock

- In scope:
  - `.github/workflows/quality.yml` with tests, build reproducibility, debt scan, and package smoke checks; configure `main` to require the resulting check after it runs on GitHub.
  - Core/advanced/internal/retired CLI help sections and tests; replace every
    legacy implementation with a bounded nonzero migration notice.
  - Current `/agent-host/v1` contract and contract tests before old sidecar contract removal.
  - Move retained provider config/argv helpers and Claude/Codex normalizers into `src/agent-host/`.
  - Rename `sidecar-client` to `daemon-client`; extract neutral Git repo-root behavior used by `lanes`.
  - Slim the daemon to retained health/auth/capability/Agent Host control-plane behavior.
  - Delete retired CLI commands, session/import/run-group/spawn-child/orchestration modules, templates, spawn MCP, focused tests, generated contract output, and unused embeddings package.
  - Remove the unused `@learnrudi/runner` DB facade and root runtime dependencies used only by retired terminal/legacy surfaces.
  - Update docs, instructions, manifests, lockfile, debt-scan policy, and built distribution.
- Non-goals:
  - Deleting existing user data.
  - Migrating or modifying the sibling Studio or Bot repositories in this CLI PR.
  - Adding a new orchestration engine, transcript store, provider abstraction, or package dependency.
  - Refactoring cohesive stores solely to meet an arbitrary line-count target.
- Expected files touched:
  - `.github/workflows/quality.yml`, `package.json`, `pnpm-lock.yaml`, `.debt-scan.json`.
  - `src/index.js`, `packages/utils/src/help.js`, focused CLI tests.
  - `src/agent-host/**`, `src/commands/agent-host*`, `src/daemon/**`, retained daemon tests/contracts.
  - Deletions under `src/commands/agent/**`, `src/commands/sessions/**`, legacy command/serve routes, `src/schema/rudi-session/**`, `src/contracts/sidecar-openapi.js`, `src/spawn-mcp.js`, `templates/run-groups/**`, `packages/embeddings/**`, and focused legacy tests.
  - `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/frontier-agent-hosts.md`, `docs/rudi-local-daemon-architecture.md`, ADR/checklist records, and `dist/**`.
- External inputs and trust boundaries: CLI argv/stdin, provider JSONL, daemon HTTP body/path/query/auth token, filesystem paths, Git workspaces, environment variables, GitHub Actions events, and package registry inputs remain validated at ingress.
- Failure behavior to define:
  - Retired command names fail nonzero with migration guidance and never load
    removed implementation code.
  - Removed endpoints return the normal authenticated 404; no compatibility adapter remains.
  - Daemon readiness cannot depend on `rudi.db`, provider session discovery, or legacy cleanup.
  - Agent Host rejects invalid provider args, workspace paths, launch IDs, lifecycle transitions, and destructive disposition requests exactly as before.
- Exit criteria: file boundary, public contract, invariants, and removal order are documented before behavior changes.

## Phase 2: Red Tests

- Observable behavior to prove:
  1. CI workflow exists and invokes the canonical test/build/debt/package proofs.
  2. Help visibly labels core, advanced, internal, and retired command groups;
     retired topics expose migration text only.
  3. Legacy commands are absent from entrypoint dispatch and legacy endpoints/modules/build assets are absent.
  4. `/agent-host/v1` retained endpoints are represented in a current contract.
  5. Agent Host has no imports from the retired `src/commands/agent` namespace.
  6. Core CLI/daemon startup does not import, create, probe, or repair `rudi.db`.
- Test files to add or edit: focused command/help, architecture-boundary, Agent Host contract, daemon runtime, build/package, and home/init tests under `src/__tests__/unit/` plus package tests where ownership moves.
- Red commands: run each focused test file with `node scripts/run-tests.js <file>` before its implementation slice.
- Expected failure: missing workflow/contract/category, still-callable legacy command/route, forbidden cross-import, legacy package asset, or DB initialization.
- Exit criteria: each behavior-bearing slice records an expected red failure before implementation.

## Phase 3: Implementation

- Implementation rules:
  - Extract retained neutral code before deleting legacy namespaces.
  - Keep CLI and HTTP layers as validation/translation adapters over Agent Host and daemon operations.
  - Preserve argv-array execution; never introduce shell interpolation.
  - Preserve authenticated daemon access and exact ownership validation for stop/promote/discard.
  - Prefer deletion over compatibility shims because the user explicitly states there are no compatibility users.
  - Make one concern per targeted commit.
- Files allowed to change: only the Phase 1 paths and generated outputs directly derived from them.
- Validation and error-handling requirements: retain existing Agent Host input bounds, stable structured daemon errors, path/branch ownership checks, idempotent stop, and conflict-safe promotion/discard.
- Observability requirements: retained daemon health and Agent Host lifecycle events remain structured; no session/import/backfill metrics or logs remain.
- Exit criteria: focused green test passes without weakening assertions; no legacy production import is reachable from `src/index.js`.

## Phase 4: Green Tests And Refactor

- Green command: rerun every red command unchanged after the smallest implementation slice.
- Refactor constraints:
  - Split `src/commands/agent-host.js`, `src/daemon/routes/agent-host.js`, or `src/agent-host/lifecycle.js` only where a module mixes independently testable responsibilities.
  - Keep `launch-store.js` cohesive unless the audit finds ownership beyond persistence/schema/query behavior.
  - Refactors cannot expand Agent Host ownership into provider sessions, transcript storage, or automatic cross-provider delegation.
- Regression checks: combined Agent Host, daemon, CLI/help, integration, and package tests after every extraction/deletion cluster.
- Exit criteria: relevant suites stay green after refactor and architecture-boundary tests prevent legacy recoupling.

Implementation evidence:

- `e4b7da7 refactor: remove legacy execution runtime` deleted the imported
  session/run-group/spawn-child/orchestration runtime, old daemon route families,
  schemas/templates/contracts, spawn MCP, unused embeddings package, and their
  focused tests. `packages/db` remains isolated for Studio compatibility.
- The isolated daemon-process smoke passes public health, authenticated
  readiness, mode-0600 connection files, clean shutdown cleanup, and proves
  that startup does not create `rudi.db`.
- `db35673 refactor: decompose agent host lifecycle` split CLI input, daemon
  transport, HTTP validation, process lifecycle, workspace lifecycle, daemon
  client, and daemon lifecycle responsibilities. The Agent Host command fell
  from 567 to 357 lines, its route from 459 to 255, and the daemon command from
  542 to 170 without changing their contracts.
- Current retained suite after retirement/decomposition and CI portability fixes:
  606 tests across 42 suites, all green.
- Current build: pass, bundled CLI approximately 1.3 MB.
- Normal builds now consume the checked-in package manifest and do not require
  the sibling registry repository. Explicit regeneration remains available as
  `pnpm generate:manifest`.
- Current package smoke: pass with exactly six published files and approximately
  1.38 MB unpacked; retired spawn MCP and run-group templates are absent.
- Current focused debt scan: 0 findings.

## Phase 5: Full Verification

- Targeted tests: all edited/added test files through `scripts/run-tests.js`.
- Full suite: `npm test`.
- Build/typecheck/lint: `npm run build`; syntax checks for retained entrypoints; `git diff --check`.
- JS/TS debt scan: `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log` and focused edited-file scans as commits are prepared.
- Live smoke checks:
  - source and bundled `rudi --help`, core command, advanced command, and internal daemon lifecycle help.
  - isolated `RUDI_HOME` daemon start/health/status/stop without `rudi.db` creation.
  - isolated Agent Host preflight and a safe provider smoke where local credentials/quota permit.
  - `npm pack --dry-run` proves retired spawn MCP/templates are absent.
  - GitHub workflow completes on the pushed branch and `main` requires its check.
- Exit criteria: all proofs pass or an explicit external limitation and residual risk are recorded.

Verification evidence:

- Red: GitHub Quality run
  [30758886495](https://github.com/learnrudi/cli/actions/runs/30758886495)
  failed because `checkIndexed` depended on a developer-home tool index. The
  focused red command `node --test packages/core/src/__tests__/unit/stack-lifecycle.test.js`
  then reproduced the missing injection boundary locally with 2 failures.
- Green: the same focused command passed 19/19 after an explicit temporary
  `indexPath` seam separated missing-index and missing-stack behavior.
- Red: GitHub Quality run
  [30759057362](https://github.com/learnrudi/cli/actions/runs/30759057362)
  passed 605 tests and then failed because `pnpm build` assumed a sibling
  registry checkout. The focused contract test reproduced the unwanted
  `prebuild` coupling locally.
- Green: `node --test src/__tests__/unit/quality-workflow-contract.test.js`
  passed 3/3 after normal build and explicit manifest generation were separated.
- Full local verification: `pnpm test` -> 606 tests, 42 suites, 0 failures;
  `pnpm build` -> pass; `git diff --exit-code -- dist src/packages-manifest.json`
  -> pass; `git diff --check` -> pass.
- Debt: edited-file scans and
  `node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log`
  -> 0 findings.
- Package: `npm pack --dry-run --json` -> pass, six files only: license,
  readme, package metadata, CLI bundle, router bundle, and package manifest.
- Runtime smoke: source and bundled help expose all four command groups;
  retired commands exit nonzero; isolated daemon health/readiness/auth/start/stop
  passes without creating `rudi.db`; bundled Agent Host provider discovery passes.
- GitHub: Quality run
  [30759300296](https://github.com/learnrudi/cli/actions/runs/30759300296)
  passed tests, build, distribution drift, debt scan, and package verification
  on the current Node 24 GitHub action runtime while testing the CLI on Node 20.
- Protection: `main` now requires strict `quality` status checks, enforces them
  for administrators, requires conversation resolution, and disallows force
  pushes and deletion.

## Phase 6: Docs, Contracts, And Closure

- Docs or API contracts to update: CLI command inventory, Agent Host/daemon ownership, `/agent-host/v1` contract, retired Bot/Studio boundary, home layout, generated/package file list, and this checklist.
- Final files touched: 321 paths. The exact auditable inventory, including
  rename similarity and deletion status, is produced by
  `git diff --name-status origin/main...HEAD`.
- Commands run and results: recorded in Phase 5 with the red/green commands,
  full suite, build, debt scan, package smoke, daemon/Agent Host smoke, GitHub
  check, and branch protection response.
- Accepted debt:
  - `packages/db` remains only for checked-in Studio compatibility and is not imported by CLI runtime/runner.
  - No billable live-provider prompt was sent. Provider discovery, argv/env
    contracts, event normalization, detached process behavior, and lifecycle
    failure paths are covered without making external provider state part of
    repository verification.
- Definition of Done:
  - Targeted and full tests pass.
  - Build and packaging pass reproducibly.
  - Debt scan has no unexplained blocking findings.
  - Source/bundled/daemon/Agent Host smoke checks pass.
  - GitHub reports the quality workflow and `main` requires it.
  - No callable legacy command, route, build asset, or runtime import remains.
  - Docs/contracts match verified behavior.
  - Targeted commits are pushed to the existing PR branch.

Closure evidence:

- Consolidation work is split by concern across commits `cf75b03`, `97ff647`,
  `df66353`, `60fee08`, `83a04bc`, `3f985b8`, `e4b7da7`, `db35673`,
  `89d32c5`, `952c69c`, `bcdbb43`, `a384721`, `580a7ae`, and `d167780`.
- Pull request: [#9](https://github.com/learnrudi/cli/pull/9).
- All Definition of Done items are satisfied. Existing user data remains
  untouched, and the only retained legacy storage code is the explicitly
  isolated `packages/db` boundary for Studio.
