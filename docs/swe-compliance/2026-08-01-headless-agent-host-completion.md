# Headless Agent Host — Completion Record

## Phase 0: Scope And Invariants

- Objective: make RUDI CLI the complete provider-neutral headless Agent Host engine and make Lite an optional client of the same engine.
- Shared ownership boundary: RUDI resolves workspaces, launches native hosts, stores minimal projections and normalized reconnect events, and manages lifecycle operations. Claude, Codex, Antigravity, and Gemini retain their native transcripts and session IDs.
- Safety invariants: no implicit home-directory fallback, no automatic `git init`, no worktree failure fallback to shared writes, no prompt persistence for detached handoff, no secret values in logs or artifacts, and no destructive cleanup outside launch-owned paths.
- Interfaces in scope: foreground and detached launch/resume, lifecycle commands, versioned authenticated service routes, cross-provider launch groups, current host/model discovery, and the Lite client migration.

## Phase 1: Interfaces Delivered

- Reusable core under `src/agent-host/` for workspace resolution, provider plans, launch projections, artifacts, normalized event streaming, detached workers, lifecycle operations, and groups.
- CLI commands: `rudi agent hosts|models|launch|resume|list|status|attach|stop|diff|promote|discard` and `rudi agent group launch|list|status|stop`.
- Authenticated service: `/agent-host/v1/hosts`, `/models/:provider`, `/launches`, launch lifecycle/event routes, and `/groups` routes.
- Lite loads current host/model contracts, launches and resumes through `/agent-host/v1`, polls normalized event artifacts, and exposes stop, diff, promote, discard, and group controls. It no longer owns Agent Host execution state.
- Legacy run-group surfaces remain callable for migration compatibility; new CLI and Lite execution use the Agent Host core.

## Phase 2: Red-Green-Refactor Evidence

- Each observable core behavior was introduced with focused Node tests: safe workspace resolution, launch/store projection, native resume identity, normalized events, detached ownership, event paging, attach/stop, diff/promotion/discard, group projection, command parsing, and service validation.
- The Google live MCP gate exposed incompatible `stack:name.tool` names. Focused portable-name and integration tests first failed, then passed after adding per-client aliases with reversible canonical dispatch and a bounded client-safe length.
- The Gemini live gate exposed two boundaries: RUDI-managed provider credentials were not injected and headless worktrees still triggered interactive trust. Focused environment/provider tests first failed, then passed after declared-secret filtering, launch-local API-key auth selection, and `--skip-trust` following RUDI workspace validation.
- Final focused refactor verification: `node --test src/__tests__/unit/agent-host-provider-environment.test.js src/__tests__/unit/agent-host-providers.test.js src/__tests__/unit/router-tool-names.test.js src/__tests__/unit/agent-host-launch.test.js` passed 20/20 tests.

## Phase 3: Live Provider And Lifecycle Evidence

| Gate | Evidence |
| --- | --- |
| Claude native MCP | `launch_9a9d7cd9c92f417a8e5330eb92b9ce91`, native session `a8dc8fb1-a30a-4808-be93-7ca2ea50bb08`, returned `RUDI_CLAUDE_MCP_OK` after executing `swe_manual_list`. |
| Codex MCP | `launch_f76e51aeeba5400782eb84df648167bf`, native session `019fc02c-6f73-7db1-944b-e553ca3ffa17`, returned `RUDI_CODEX_MCP_OK`. |
| Codex skill and subagent | `launch_63f396374e7c4f89bc018809a7ee33cb` activated the synchronized `explain-this` skill and completed native subagent `019fc02b-a978-76c1-985b-05a6c607cb60`. |
| Antigravity MCP | `launch_ab8f734278bb4f2bb83c3f75ce5c81b6`, native conversation `66a6dbd1-2b74-47b2-babc-9e7e3d2a87ce`, returned `RUDI_GOOGLE_MCP_OK` through the portable router alias. |
| Antigravity skill and subagent | `launch_6acda3d7aa524eeca5bcfa172281909b`, native conversation `b5cb798c-6c4e-48d2-9f4e-7ba1e5161fb4`, completed native tool, skill, and subagent steps. |
| Gemini MCP, skill, subagent | `launch_cced13f8bb47462481fcab10bb4a46ac`, native session `ed21cb9a-d806-4bca-9c28-eb3d79b41ef2`, used the managed API-key path and returned `RUDI_GEMINI_CAPABILITIES_OK`. |
| Provider-neutral group | `group_98ac3c09c1b04c169608b193abe0e77c` completed two independent detached Codex children with distinct native sessions and artifacts. |
| Resume identity | Live resume created a child RUDI launch while preserving the original Codex native session pointer. |
| Detached reconnect and service independence | A detached launch continued after CLI exit, reattached from persisted normalized events, survived a service restart, and supported explicit stop/resume. No Lite process was required. |
| Diff and promotion | `launch_e1aeb09da0a3430eace181417ce7cd7e` produced a worktree diff and promoted through the conflict-checked lifecycle. |

All live Git write checks used isolated worktrees. Read-only launches executed directly, and non-Git write plus failed-worktree behavior is covered by the workspace behavior tests. Foreground and detached JSON output was exercised. Persisted `events.jsonl` artifacts exclude raw provider events and prompts; provider transcripts remain in native storage.

## Phase 4: Final Verification

- CLI tests: `npm test` passed 1,107/1,107 tests across 117 suites.
- CLI build: `npm run build` passed, including the bundled standalone MCP router.
- CLI package: `npm pack --dry-run` passed with 11 files and a 660.5 kB package.
- Lite tests: `pnpm test -- --run` passed 367/367 tests across 18 files.
- Lite production build: `pnpm build` passed. Existing chunk-size/dynamic-import and stale Browserslist warnings remain non-blocking.
- CLI policy-aware debt scan: zero errors, warnings, or info findings after declaring the intentional versioned-route contract-test boundary.
- Lite structural fallback debt scan: zero findings across all edited TypeScript/TSX files.
- `git diff --check` passed in both repositories.
- The rebuilt daemon was restarted only after confirming zero active sessions/jobs; it returned healthy/ready with 27 indexed stack entries, 387 tools, and zero index failures.

## Phase 5: Closure

The supported execution path is now CLI/core-first. Foreground commands need neither Lite nor the daemon; detached jobs are independently owned workers controlled by the background service; Lite displays and controls the same launch projections through the versioned API. Provider-specific authentication, permissions, models, native session semantics, skills, MCP behavior, and subagents remain explicit rather than being flattened into a false common contract.
