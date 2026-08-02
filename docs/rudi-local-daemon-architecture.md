# RUDI Local Daemon Architecture

Status: Implemented

Contract version: `1.0.0`

Last verified: 2026-08-02

The RUDI daemon is a loopback capability service and a thin Agent Host control
plane. It is not a GUI sidecar, an imported-session database service, or an
agent execution engine.

## Ownership

RUDI owns:

- package discovery, installation, removal, and status;
- secrets-mediated stack execution and MCP indexing;
- daemon lifecycle and authenticated loopback access;
- durable RUDI artifacts and safe workspace isolation;
- detached worker launch/stop and bounded launch/group projections;
- diff, promote, and discard for RUDI-owned isolated workspaces.

Native providers own:

- model loops and normal agent execution;
- provider sessions and resume identity;
- complete, authoritative transcripts;
- provider-native subagents and orchestration.

The daemon must not import provider transcripts, repair `rudi.db`, merge
provider session identity, or resurrect a RUDI-owned run-group engine.

## Runtime Topology

```text
CLI foreground launch ──────────────> native provider CLI

CLI detached command
        │
        ▼
authenticated loopback daemon ─────> dedicated RUDI worker
        │                                  │
        │                                  ├─ native provider CLI
        │                                  └─ durable launch artifacts
        ▼
minimal launch/group projection
```

Foreground launches are daemon-independent. A detached worker survives the
invoking terminal and continues if the daemon restarts. The daemon can inspect
or stop only a worker whose recorded PID and command identity match the launch.

## Source Layout

| Layer | Canonical source | Responsibility |
| --- | --- | --- |
| Process entry | `src/commands/serve.js` | Compose retained routes, auth, HTTP server, and shutdown |
| CLI lifecycle | `src/commands/daemon.js` | Terminal dispatch and presentation only |
| Daemon lifecycle | `src/daemon/runtime/lifecycle.js` | Start, stop, restart, LaunchAgent install/uninstall |
| Connection client | `src/daemon/client.js` | Read connection files, make authenticated requests, probe readiness |
| HTTP context | `src/daemon/http/context.js` | Request IDs, bounded JSON bodies, response/error envelopes, logging |
| Routes | `src/daemon/routes/` | Health, environment, local LLM, packages, Agent Host |
| Agent Host core | `src/agent-host/` | Providers, workspaces, worker process lifecycle, artifacts, projections |
| API contract | `src/contracts/daemon-openapi.js` | Versioned retained daemon contract |
| Generated contract | `docs/daemon/openapi.json` | Checked-in OpenAPI artifact |

Large lifecycle responsibilities are physically split:

- `src/agent-host/process-lifecycle.js` verifies and stops detached workers;
- `src/agent-host/workspace-lifecycle.js` owns diff/promote/discard;
- `src/agent-host/lifecycle.js` is the stable facade;
- `src/daemon/routes/agent-host-validation.js` owns HTTP ingress validation;
- `src/agent-host/cli-inputs.js` owns CLI prompt/path/timeout parsing;
- `src/commands/agent-host-service.js` owns CLI-to-daemon transport.

## Connection And Authentication

The daemon binds to `127.0.0.1` on an explicit or dynamic port and writes:

- `~/.rudi/daemon.port`
- `~/.rudi/daemon.token`

Both files are mode `0600`. `GET /health` is public liveness. Every other
route requires the token in the `x-rudi-token` header. Tokens must never appear
in URLs, logs, startup banners, errors, or JSON payloads.

`OPTIONS` preflight is unauthenticated. Each request receives a correlation ID
and a structured completion log without body or secret content.

## Active HTTP Contract

The generated OpenAPI document is authoritative for request/response details.
The active families are:

### Health and environment

- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /daemon/status`
- `GET /env`

Readiness depends on retained route composition and tool-index state. It never
depends on `rudi.db`, imported sessions, or legacy cleanup.

### Local LLM capability

- `GET /local-llm/status`
- `GET /local-llm/models`
- `GET /local-llm/env/{consumer}`
- `GET /runtimes/{runtime}/status`

### Packages and secrets metadata

- `GET /packages/search`
- `GET /packages/list`
- `GET /packages/installed`
- `POST /packages/install`
- `GET /packages/jobs/{jobId}`
- `GET|POST /packages/secrets`
- `DELETE /packages/secrets/{name}`

Secret values are never returned. Package jobs are RUDI-owned local jobs and
may be cleaned during daemon shutdown.

### Agent Host v1

- `GET /agent-host/v1/hosts`
- `GET /agent-host/v1/models/{provider}`
- `GET|POST /agent-host/v1/launches`
- `GET /agent-host/v1/launches/{launchId}`
- `GET /agent-host/v1/launches/{launchId}/events`
- `POST /agent-host/v1/launches/{launchId}/resume`
- `GET|POST /agent-host/v1/launches/{launchId}/{operation}`
- `GET|POST /agent-host/v1/groups`
- `GET /agent-host/v1/groups/{groupId}`
- `POST /agent-host/v1/groups/{groupId}/stop`

The operation route models `diff` as `GET` and `stop`, `promote`, and `discard`
as `POST`. Launch and group creation are idempotent by caller-provided IDs.

## Data Model

Each launch owns a directory under the canonical RUDI output/artifact layout.
It contains request metadata, normalized JSONL events, provider output, logs,
and an isolated workspace when required.

`agent-hosts.db` is a minimal SQLite projection for launch and group lifecycle:

- launch ID, provider/model, parent/native session pointer;
- origin/project/execution workspace and isolation mode;
- worker ownership, status, timestamps, disposition, and error summary;
- group membership and ordering.

It does not store prompts or complete transcripts. Normalized JSONL events are
bounded reconnect and artifact material; the provider transcript remains
authoritative.

`packages/db` and existing `~/.rudi/rudi.db` files are a separate compatibility
boundary for checked-in Studio consumers. CLI production code, daemon startup,
and `packages/runner` do not import that package or open those files. RUDI does
not automatically delete existing data.

## Workspace Safety

| Project | Requested access | Execution location |
| --- | --- | --- |
| Git repository | writable | dedicated `rudi/agent/<launch-id>` worktree |
| Git repository | read-only | original project directly |
| Non-Git directory | writable | isolated copy under launch artifacts |
| Non-Git directory | read-only | original directory directly |

The resolver fails closed. It never initializes Git, falls back to the home
directory, silently shares a writable project, or reuses a pre-existing output
destination.

Promotion requires ownership and terminal-state checks. Git promotion requires
the destination HEAD and working tree to match the launch baseline. Isolated
copy promotion compares manifests, rejects escaping or external symlinks,
creates a rollback backup, and verifies the final manifest. Discard removes
only the verified RUDI-owned launch directory/worktree.

## Failure Behavior

- Missing or invalid connection files produce explicit offline/stale states.
- Invalid auth returns `401` without token disclosure.
- Unknown retained paths return the normal authenticated `404`.
- JSON bodies are bounded and undeclared Agent Host fields are rejected.
- Invalid IDs, providers, models, permission modes, timeouts, and paths fail at
  ingress before process launch or destructive work.
- Duplicate launch/group creation replays the existing projection.
- Stop refuses unverified PIDs and escalates to `SIGKILL` only after a bounded
  graceful timeout.
- Promote/discard conflicts return controlled client errors rather than partial
  ownership changes.

## Removed Architecture

ADR 0001 removed the old `/agent/*`, `/sessions/*`, run-group, spawn-child,
orchestration, filesystem, shell, terminal, project, notes, analytics, plan,
embedded UI, and WebSocket sidecar surfaces. Their commands, routes, schemas,
templates, spawn MCP, generated contract, provider-session importers, process
supervisor, and focused tests are not shipped.

Retired CLI names print migration notices and exit nonzero; they never dispatch
to compatibility implementations. Removed HTTP paths have no compatibility
adapter.

## Verification

The repository enforces:

```bash
pnpm test
pnpm build
node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log
npm pack --dry-run
```

Key contracts additionally prove:

- source and package artifacts contain no retired runtime;
- the daemon can start in an isolated `RUDI_HOME`, serve health/readiness,
  authenticate requests, stop cleanly, and avoid creating `rudi.db`;
- Agent Host does not import retired provider/execution namespaces;
- generated OpenAPI matches source;
- CLI help keeps core, advanced, internal, and retired names distinct.

GitHub's `quality` workflow runs tests, build/dist drift, changed-file debt
scanning, and package validation. Consolidation closure requires the `main`
branch to enforce that check.

## Remaining Compatibility Debt

- `packages/db` remains only until Studio migrates or retires.
- `src/daemon/runtime/launch-agent.js` recognizes the old
  `com.rudi.sidecar` label solely to stop it during daemon installation.
- Existing `rudi.db`, `rudi.db-wal`, and `rudi.db-shm` files require an explicit
  user-directed archival decision; the CLI leaves them untouched.
