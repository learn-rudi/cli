# Headless Agent Host — Lifecycle, Service API, And Promotion

## Phase 0: Baseline And Manual Lookup

- Scope: Stage 2 of the approved Agent Host sequence: detached worker execution, reconnect/attach, stop, event retrieval, diff, promote, discard, and a versioned local service API over the existing authenticated daemon.
- Files to read before implementation: `src/commands/serve.js`, `src/commands/daemon.js`, `src/commands/sidecar-client.js`, daemon auth/runtime helpers, legacy lifecycle/worktree routes, the Stage 1 core/store/workspace/event modules, and their focused tests.
- Relevant doctrine: API E2/E3/E5/E7/E9, Infrastructure H6, Backend lifecycle/state-machine guidance, Security F13, and Testing Appendix C.
- Invariants: prompts remain pipe-only for detached workers and are never persisted by RUDI; detached jobs survive the invoking terminal and Lite; local service requests retain `x-rudi-token` authentication; stop signals only a verified RUDI worker; promotion is explicit, conflict-checked, and never overwrites a changed project; discard only removes launch-owned artifacts/worktrees; legacy routes remain callable until migration.
- Exit criteria: current daemon ownership, auth, shutdown, process, diff, and worktree behaviors are understood before editing.

## Phase 1: Scope Lock

- New core/API surface: detached worker dispatcher and internal worker entrypoint; artifact event logs; launch-store execution/disposition metadata; attach/event reading; stop; diff; promote; discard; `/agent-host/v1/launches` routes.
- CLI surface: `rudi agent launch|resume --detach`, `attach`, `stop`, `diff`, `promote`, and `discard`.
- Expected files to modify: Stage 1 Agent Host modules, `src/commands/agent-host.js`, `src/commands/serve.js`, daemon process/status plumbing if required, CLI help/docs, and focused tests. New files stay under `src/agent-host/`, `src/daemon/routes/`, and `src/__tests__/unit/`.
- Non-goals for this phase: launch groups, provider contract expansion beyond what lifecycle needs, and Lite component migration.
- Failure behavior: startup failure is reported before detach returns; worker crash becomes a failed launch; stop is idempotent for terminal launches; attach ends on terminal state; promotion refuses dirty/diverged destinations; cleanup refuses unowned paths.

## Phase 2: Red Tests

- Add one behavior-level test at a time for store migration/metadata, artifact ownership and event paging, detached dispatch without prompt persistence, service route validation, stop identity checks, lifecycle diff/promotion/discard safety, and CLI routing.
- Run each focused test before implementation and record expected failures as missing modules/behavior rather than fixture errors.

## Phase 3: Implementation

- Use argv arrays and stdin JSON for worker handoff; never place prompts in argv, files, database rows, logs, or responses.
- Keep the daemon a dispatcher/control plane. A dedicated worker owns each detached provider process and updates the same launch projection, allowing the job to outlive the invoking terminal and Lite window.
- Use append-only JSONL event artifacts and bounded paged reads for reconnecting clients.
- Use explicit ownership markers and exact path/branch validation for destructive cleanup.
- Require terminal launches and conflict-free destinations before promotion.

## Phase 4: Green Tests And Refactor

- Rerun each red command unchanged, then the combined Stage 1 and Stage 2 suite.
- Refactor only within the new Agent Host core/service boundary; do not redesign unrelated legacy session code.

## Phase 5: Full Verification

- Full CLI suite, build, package dry-run, diff check, and architecture-aware debt scan.
- Live detached launch, CLI exit while launch continues, attach/status, stop, writable diff, promote, discard, and daemon/Lite independence smoke checks.

## Phase 6: Docs And Closure

- Update public help, README, architecture docs, and this record with exact commands/results.
- Record any external/provider limitation separately from code gaps.
