# RUDI Local Daemon Architecture and Migration Checklist

Date: 2026-05-17

Status: accepted target architecture and historical migration record

Canonical repo: `/Users/hoff/dev/RUDI/apps/cli`

## Purpose

RUDI needs one local control-plane process that Claude, Codex, Lite, and CLI
commands can rely on for local tools, package state, stack lifecycle, auth,
health, and secret-mediated access to installed capabilities. The existing
`rudi serve` sidecar started as the Lite backend for HTTP/WebSocket agent
streaming, but the target daemon should not become an agent deployment runtime.

Storage is a separate layer. The daemon may validate requests, call storage
repositories, expose storage health, and coordinate safe maintenance, but it
should not blur daemon lifecycle with database ownership or session-store
repair policy.

This document defines the target daemon shape and records the earlier sidecar
migration. [ADR 0001](adr/0001-retire-legacy-agent-execution.md) is authoritative
for the accepted legacy-agent retirement boundary.

## 2026-08-02 Retirement Reconciliation

ADR 0001 supersedes every historical checklist item below that preserves or
extends legacy agent execution, imported sessions, run groups, spawn-child,
orchestration, spawn MCP, `/agent/*`, or `/sessions/*`. Those references remain
only as migration history and are not compatibility requirements.

The target is a slim internal daemon for health, auth, capability operations,
and `/agent-host/v1`. It retains Agent Host detached RUDI workers, isolated
workspaces, minimal launch/group projections in `agent-hosts.db`, bounded
reconnect events, and durable artifacts. Provider-native sessions and
transcripts remain authoritative. Existing `rudi.db` files remain on disk, but
the CLI stops touching them.

## Core Decision

Keep the daemon in Node for the next phase.

Reasons:

- The CLI, registry client, installer, secrets package, MCP router, and current
  sidecar are already Node.
- The daemon is local-first and I/O-heavy, not CPU-bound.
- Introducing Bun, Hono, FastAPI, or another runtime now would add deployment
  and packaging debt before the control-plane contract is stable.
- Framework migration can happen later if the daemon contract proves a specific
  need.

The daemon should be a local control plane. It should not become a provider
mega-service.

## Product Boundary

The daemon owns the local substrate:

- RUDI health and version status
- installed package and stack status
- stack tool index lifecycle
- local filesystem and artifact handoffs
- local job tracking
- Lite HTTP/WebSocket API
- bounded process supervision only for RUDI-owned local jobs and stack probes
- local auth token and security boundary
- storage health and repository access through a separate storage layer

Claude, Codex, Gemini, and other agent products own provider execution:

- prompt loops
- native model loops and provider session lifecycle
- provider transcripts
- model selection
- permission UX inside their own agent surfaces

RUDI gives those agents durable local tools, secrets, artifacts, stack MCP
access, and the Agent Host launch boundary. Agent Host may dispatch detached
RUDI workers and native CLI processes, but it owns only the isolated workspace,
launch lifecycle, bounded reconnect cache, and launch/group projection. It does
not own provider sessions, transcripts, or a cross-provider orchestration loop.

The following current sidecar surfaces are retired, not compatibility surfaces:

- imported Claude/Codex session history and session-only CLI commands
- existing `/agent/*`, `/sessions/*`, and legacy run-group routes/events
- legacy agent process supervision, spawn-child, orchestration, and spawn MCP
- the checked-in Bot's legacy `/agent/*` client

Stacks own domain behavior:

- `image-generator` owns image generation providers and image-specific policy.
- `content-extractor` owns extraction logic.
- `social-media` owns publishing workflow.
- Provider-suite stacks such as `openai` and `google-ai` own provider-specific
  breadth.

The MCP router owns agent-facing tool exposure:

- reads installed stack metadata and tool cache
- exposes tools over MCP stdio
- launches stack MCP servers with secrets injected
- stays compatible with Claude, Codex, Gemini, Cursor, and other agents

## Current System Map

```text
Lite UI
  |
  | HTTP + WebSocket
  v
rudi serve
  |
  +-- sessions
  +-- projects / notes / filesystem
  +-- legacy agent processes / run groups
  +-- package routes
  +-- shell / terminal routes

Agents
  |
  | MCP stdio
  v
rudi-router
  |
  +-- tool index cache
  +-- installed stack MCP servers
  +-- rudi mcp <stack>
```

Target system:

```text
Lite UI       CLI commands       Claude / Codex / Gemini
  |               |                         |
  | HTTP/WS       | HTTP/CLI                | MCP stdio
  v               v                         v
        RUDI local daemon             RUDI MCP router
             |                              |
             |                              v
             |                   Installed stack MCP servers
             |
             v
     Storage layer / repositories
```

## Architectural Invariants

- The daemon binds to `127.0.0.1` by default.
- Every authenticated HTTP request uses `x-rudi-token`.
- `/health` remains unauthenticated and safe.
- Secrets never appear in URLs, logs, tool cache, or error responses.
- Routes validate input before business logic.
- Business logic lives in named operations, not route handlers.
- MCP router compatibility must not depend on Lite being open.
- Storage remains a separate layer from daemon lifecycle.
- The daemon may supervise Agent Host's detached RUDI workers, but it must not
  own provider sessions, transcripts, model loops, or legacy orchestration.
- No legacy agent or imported-session command, route, event, or process manager
  remains callable after retirement.
- `agent-hosts.db` stores only minimal launch/group projection. Normalized
  content-bearing events are a bounded reconnect cache, not a transcript store.
- Existing user `rudi.db` files are never automatically deleted; the CLI stops
  reading or writing them.
- `packages/db` remains only as an isolated Studio compatibility package until
  Studio is retired or migrated. The CLI runtime and `@learnrudi/runner` do not
  import it.
- Installed stacks remain independently runnable through `rudi mcp <stack>`.
- Provider-specific behavior stays in stacks unless a shared ownership decision
  is documented.
- Generated output paths and artifacts are local resources with explicit
  ownership.
- Any future remote daemon mode is opt-in and requires a separate security
  design.

## Build Order

Follow the engineering manual sequence:

1. Schema
2. Operations
3. APIs
4. Frontend and agent integrations
5. Infrastructure and always-on lifecycle

Do not start by moving route files around. First define the contracts and the
operations the daemon must support.

## Schema Contract

Schemas are the daemon's source of truth. They should be shared by validation,
OpenAPI generation, tests, and Lite client types where practical.

Recommended location:

```text
src/daemon/schemas/
  common.js
  daemon.js
  packages.js
  tools.js
  secrets.js
  agent-host.js
  jobs.js
  artifacts.js
  events.js
  errors.js
```

### Common Envelope

Success:

```json
{
  "ok": true,
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable remediation.",
    "details": {}
  }
}
```

Checklist:

- [x] Define stable error envelope.
- [x] Define stable success envelope.
- [ ] Apply the envelope to retained `/agent-host/v1` and capability routes.
- [ ] Test retained response contracts before deleting legacy route schemas.
- [x] Document all stable error codes.

### Request Context

Fields:

- `requestId`
- `method`
- `path`
- `startedAt`
- `caller`
- `auth`
- `client`

Checklist:

- [ ] Generate a request ID for every HTTP request.
- [ ] Return request ID header on every response.
- [ ] Include request ID in structured logs.
- [ ] Pass request context into operations.

### Daemon Status

Fields:

- `version`
- `pid`
- `port`
- `uptimeMs`
- `rudiHome`
- `platform`
- `runtime`
- `startedAt`
- `toolIndexStatus`
- `dbStatus`
- `packageCounts`
- `activeAgentHostLaunchCount`
- `activeAgentHostWorkerCount`
- `activeJobCount`

Checklist:

- [x] Define `DaemonStatus` schema.
- [x] Define `DaemonHealth` schema.
- [x] Split liveness from readiness.
- [x] Keep `/health` fast and dependency-light.

### Package and Stack Status

Fields:

- `id`
- `kind`
- `name`
- `version`
- `installed`
- `path`
- `manifestPath`
- `runtime`
- `secrets`
- `mcp`
- `lastIndexedAt`
- `toolCount`
- `problems`

Checklist:

- [x] Define package ID normalization.
- [x] Define installed package status.
- [x] Define stack MCP launch metadata.
- [x] Define secret readiness without exposing secret values.
- [x] Define package problem codes such as `missing_manifest`,
      `missing_runtime`, `missing_secret`, `index_failed`.

### Tool Index

Fields:

- `version`
- `updatedAt`
- `byStack`
- `tools`
- `failures`

Tool descriptor fields:

- `stackId`
- `toolName`
- `description`
- `inputSchema`
- `indexedAt`
- `source`

Checklist:

- [x] Treat tool index as cache, not source of truth.
- [x] Preserve current router cache compatibility.
- [x] Record per-stack index failures.
- [x] Add schema snapshot tests for tool index cache format.
- [x] Add one operation to rebuild all tools.
- [x] Add one operation to rebuild one stack.

### Secrets

Fields:

- `name`
- `configured`
- `requiredFor`
- `optionalFor`
- `source`
- `lastCheckedAt`

Checklist:

- [x] Never return secret values.
- [ ] Avoid showing secrets in process args.
- [x] Return provider readiness as boolean status only.
- [x] Preserve `rudi secrets` CLI compatibility.

### Retired Legacy Run Groups and Sessions

Legacy run-group and imported-session schemas are not part of the target daemon
contract. Their commands, routes, events, process supervision, templates, and
focused compatibility tests are deleted after the `/agent-host/v1` contract
and tests are published. Existing `rudi.db` files are left untouched.

### Job

Jobs cover daemon work detached from direct HTTP request timing.

Fields:

- `id`
- `type`
- `status`
- `input`
- `result`
- `error`
- `createdAt`
- `startedAt`
- `finishedAt`
- `attempts`
- `maxAttempts`
- `idempotencyKey`

Statuses:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Checklist:

- [x] Define which operations need jobs.
- [ ] Add bounded concurrency.
- [ ] Add job timeout.
- [ ] Add retry policy only where operations are idempotent.
- [ ] Add dead-letter behavior or failed-job visibility.

### Artifact

Artifacts are local files or generated assets that other stacks and agents can
reference.

Fields:

- `id`
- `kind`
- `path`
- `mimeType`
- `bytes`
- `createdAt`
- `source`
- `owner`
- `metadata`

Checklist:

- [x] Define artifact ownership.
- [ ] Keep generated outputs under approved RUDI output roots.
- [ ] Avoid making arbitrary local files public over HTTP.
- [ ] Add safe file-serving rules for Lite preview only.

### Event

Event envelope:

```json
{
  "type": "agent.event",
  "launchId": "launch_...",
  "provider": "codex",
  "delta": false,
  "event": {
    "type": "assistant",
    "content": []
  }
}
```

Checklist:

- [ ] Define event names and payload schemas.
- [ ] Version event payloads.
- [ ] Bound reconnect-cache retention and exclude raw provider transcripts.
- [ ] Add tests for event serialization.

## Operation Layer

Recommended location:

```text
src/daemon/operations/
  health.js
  packages.js
  tool-index.js
  secrets.js
  agent-host.js
  jobs.js
  artifacts.js
```

Rules:

- Routes parse and validate.
- Operations enforce rules and perform side effects.
- Storage modules read/write persistence.
- Runtime modules supervise processes, sockets, and child execution.

### Required Operations

Health:

- `getHealth()`
- `getReadiness()`
- `getDaemonStatus()`

Packages:

- `listPackages()`
- `getPackageStatus(packageId)`
- `installPackage(packageId, options)`
- `updatePackage(packageId, options)`
- `removePackage(packageId, options)`

Tools:

- `readToolIndex()`
- `indexAllTools()`
- `indexStackTools(stackId)`
- `getTools(filter)`

Secrets:

- `listSecretStatus()`
- `getSecretStatus(name)`

Agent Host:

- `listAgentHosts()`
- `getAgentModels(provider)`
- `dispatchAgentLaunch(input)`
- `resumeAgentLaunch(id, input)`
- `getAgentLaunch(id)`
- `listAgentLaunches(filter)`
- `readAgentLaunchEvents(id, cursor)`
- `stopAgentLaunch(id)`
- `diffAgentLaunch(id)`
- `promoteAgentLaunch(id)`
- `discardAgentLaunch(id)`
- `dispatchAgentGroup(input)`
- `getAgentGroup(id)`
- `listAgentGroups(filter)`
- `stopAgentGroup(id)`

Jobs:

- `enqueueJob(input)`
- `getJob(id)`
- `listJobs(filter)`
- `cancelJob(id)`

Artifacts:

- `registerArtifact(input)`
- `getArtifact(id)`
- `listArtifacts(filter)`
- `serveArtifact(id)`

Checklist:

- [ ] Keep retained Agent Host operations independent of retired modules.
- [ ] Delete old route adapters when the `/agent-host/v1` contract tests pass.
- [ ] Add operation-level unit tests without HTTP.
- [ ] Add route-level contract tests with HTTP mocks.
- [ ] Document side effects for every operation.
- [ ] Define timeout behavior for child-process and provider-facing operations.

## API Surface

Recommended location:

```text
src/daemon/routes/
  health.js
  daemon.js
  packages.js
  tools.js
  secrets.js
  agent-host.js
  jobs.js
  artifacts.js
  events.js
```

### Baseline Endpoints

Daemon:

- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /daemon/status`

Packages:

- `GET /packages`
- `GET /packages/:id`
- `POST /packages/:id/install`
- `POST /packages/:id/update`
- `POST /packages/:id/remove`

Tools:

- `GET /tools`
- `GET /tools/:stackId`
- `POST /tools/index`
- `POST /tools/:stackId/index`

Secrets:

- `GET /secrets/status`

Agent Host:

- `GET /agent-host/v1/hosts`
- `GET /agent-host/v1/models/:provider`
- `POST /agent-host/v1/launches`
- `GET /agent-host/v1/launches`
- `GET /agent-host/v1/launches/:id`
- `POST /agent-host/v1/launches/:id/resume`
- `GET /agent-host/v1/launches/:id/events`
- `POST /agent-host/v1/launches/:id/stop`
- `GET /agent-host/v1/launches/:id/diff`
- `POST /agent-host/v1/launches/:id/promote`
- `POST /agent-host/v1/launches/:id/discard`
- `POST /agent-host/v1/groups`
- `GET /agent-host/v1/groups`
- `GET /agent-host/v1/groups/:id`
- `POST /agent-host/v1/groups/:id/stop`

Artifacts:

- `GET /artifacts`
- `GET /artifacts/:id`

Events:

- `GET /events/live`
- WebSocket on existing sidecar socket

Checklist:

- [ ] Publish `/agent-host/v1` request, response, error, and event schemas.
- [ ] Add contract tests for every retained `/agent-host/v1` endpoint before
      deleting the old sidecar contracts.
- [ ] Document every endpoint in OpenAPI.
- [ ] Validate request schemas at ingress.
- [ ] Return structured, stable errors.
- [ ] Add request/response examples.
- [ ] Add contract tests against OpenAPI or schema snapshots.

## Runtime Structure

Recommended location:

```text
src/daemon/runtime/
  server.js
  auth.js
  websocket.js
  process-manager.js
  child-process.js
  scheduler.js
  supervisor.js
  shutdown.js
  config.js
```

Runtime requirements:

- bind to `127.0.0.1` by default
- write `~/.rudi/.rudi-lite-port`
- write `~/.rudi/.rudi-lite-token`
- support graceful shutdown
- close child processes on shutdown when owned by daemon
- log startup configuration without secrets
- expose health and readiness
- support launchd lifecycle on macOS

Checklist:

- [x] Extract server bootstrap from `src/commands/serve.js`.
- [x] Keep `rudi serve` as the CLI entry point.
- [x] Add `rudi daemon status` or equivalent CLI wrapper later.
- [ ] Add launchd install/update/remove command later if needed.
- [ ] Add startup log line with version, pid, port, runtime, and RUDI home.
- [ ] Add shutdown tests for process cleanup.

## Storage Integration

Storage remains separate from daemon lifecycle. Target Agent Host state is:

- `~/.rudi/state/agent-hosts.db` for the minimal launch/group projection;
- `~/.rudi/artifacts/agent-launches/` for owned workspaces, bounded reconnect
  events, stderr, diffs, and durable launch artifacts.

`@learnrudi/db` and `rudi.db` are historical session storage, not target daemon
storage. `packages/db` remains isolated only because checked-in Studio depends
on it; the CLI entrypoint/runtime and `@learnrudi/runner` must not import it.
Existing user `rudi.db` files remain untouched.

Storage rules:

- Provider-native sessions and transcripts remain authoritative.
- `agent-hosts.db` is an Agent Host lifecycle projection, not a transcript or
  imported-session database.
- Use WAL mode where appropriate.
- Normalized content-bearing events use an explicit bounded retention policy.
- Durable artifacts have explicit ownership and safe cleanup rules.
- Studio compatibility storage cannot become a CLI or daemon dependency again.

Checklist:

- [ ] Document and test the minimal `agent-hosts.db` projection.
- [ ] Define and test reconnect-event retention bounds.
- [ ] Test that CLI and daemon startup do not open `rudi.db` or import
      `packages/db`.
- [ ] Coordinate final `packages/db` deletion with Studio migration or
      retirement.

## Security

Default local mode:

- bind to `127.0.0.1`
- require `x-rudi-token` for all non-health endpoints
- token stored in `~/.rudi/.rudi-lite-token` with user-only permissions
- no secrets in URLs
- no secrets in logs

Remote mode is a separate product:

- explicit opt-in host binding
- Tailscale or TLS
- stronger auth and token rotation
- output/artifact storage plan
- per-client audit trail
- clear threat model

Checklist:

- [ ] Keep remote access disabled by default.
- [ ] Add startup warning if binding is not localhost.
- [ ] Redact secrets from every error/log path.
- [ ] Add tests for auth failures.
- [ ] Add tests that secrets are not returned by status endpoints.
- [ ] Document remote-worker requirements before implementation.

## Observability

Required signals:

- request logs with method, path, status, latency, request ID
- auth failure logs without token values
- operation logs for package install/update/remove
- stack index success/failure logs
- Agent Host launch and detached-worker lifecycle logs
- job lifecycle logs
- startup/shutdown logs

Checklist:

- [ ] Standardize log fields.
- [ ] Include request ID in route and operation logs.
- [ ] Add health/readiness details for tool index, DB, and process supervisor.
- [ ] Keep logs bounded or rotate large logs.
- [ ] Add troubleshooting doc for common daemon failures.

## MCP Router Integration

The daemon and MCP router are separate but related.

The router should continue to:

- expose installed stack tools over MCP stdio
- read the tool cache
- launch stack MCP servers with injected secrets

The daemon should:

- rebuild the tool index
- report tool index status
- provide install/update status
- supervise long-lived local workflows where needed

Checklist:

- [x] Preserve `rudi-router` shim behavior.
- [x] Preserve `rudi mcp <stack>` behavior.
- [x] Keep tool index cache backward-compatible.
- [x] Add a daemon operation for indexing one stack.
- [x] Add a daemon operation for indexing all stacks.
- [ ] Add tests that `image-generator` appears in the router cache after
      indexing.

## Lite Integration

Lite should consume the daemon contract through a small HTTP bridge, not route
implementation details.

Checklist:

- [x] Inventory every Lite API call.
- [x] Map each Lite call to a daemon endpoint.
- [x] Preserve response shapes only for retained nonlegacy Lite routes during UI
      migration.
- [x] Add typed Lite client types generated from or validated against daemon
      schemas.
- [x] Add UI fallback behavior for daemon unavailable.
- [x] Add clear "daemon offline" state in Lite.

## CLI Integration

CLI commands should either:

- perform local package operations directly when the daemon is not required, or
- call the daemon when they need local service status, package/tool state,
  artifact handoffs, or storage-backed read models.

CLI Agent Host commands may launch native providers directly or through
detached RUDI workers. Provider sessions and transcripts remain provider-owned.

Checklist:

- [ ] Decide command-by-command whether it should call daemon or local modules.
- [x] Keep `rudi serve` as daemon start.
- [x] Add `rudi status` sidecar status detail.
- [x] Add `rudi doctor` daemon reachability checks.
- [x] Avoid requiring daemon for simple install/list commands unless necessary.
- [x] Add `rudi instructions <agent>` so RUDI owns the managed agent
      instruction block instead of relying on hand-maintained downstream
      snippets.
- [x] Keep instruction installation explicit. The default command prints a
      pasteable block; `--install` writes a managed block and `--remove`
      removes only that managed block.
- [ ] Add a higher-level onboarding wrapper, for example `rudi connect
      <agent>`, that runs MCP integration, instruction dry-run/install, router
      smoke, and daemon status checks as one user-facing flow.
- [ ] Remove every legacy command and expose only core commands, advanced
      commands, and internal daemon entrypoints.

## Always-On Lifecycle

macOS local always-on:

- LaunchAgent
- `RunAtLoad`
- `KeepAlive`
- logs under `~/.rudi`
- health check via port/token files

Initial LaunchAgent contract:

- Label: `com.learnrudi.daemon`.
- Program arguments: installed `rudi` binary plus `serve`.
- Network binding must remain localhost-only unless remote-worker mode is
  explicitly designed and approved.
- The plist must not contain daemon tokens or provider secrets; the daemon
  generates runtime token files with owner-only permissions.
- Standard output and error should write under `~/.rudi/logs`.
- Install/update/remove should be atomic and reversible where practical:
  unload old agent, write plist, load new agent, then validate `/health` and
  authenticated readiness through the current port/token files.
- Stale port/token recovery should stop the LaunchAgent, remove
  `.rudi-lite-port` and `.rudi-lite-token`, restart, then verify health.

Checklist:

- [x] Implement LaunchAgent installation through `rudi daemon install`.
- [x] Add local `rudi daemon start` wrapper.
- [x] Add local `rudi daemon stop` wrapper.
- [x] Add local `rudi daemon restart` wrapper.
- [x] Add local `rudi daemon status`.
- [ ] Ensure daemon restart does not lose active child process ownership silently.
- [ ] Document how users recover from stale port/token files.

### LaunchAgent Execution Checklist

Phase 6 local always-on lifecycle should execute in this order:

- [x] Add a small LaunchAgent module, for example
      `src/daemon/runtime/launch-agent.js`, that owns plist rendering,
      installation, removal, status probing, and launchctl calls.
- [x] Resolve the daemon executable deliberately. In development it may use the
      current Node path plus the current CLI entrypoint. In packaged installs it
      should use the installed `rudi` binary only when that binary is the
      expected version.
- [x] Refuse LaunchAgent install on non-macOS platforms with a clear error.
- [x] Refuse to install as root. RUDI should use a per-user LaunchAgent, not a
      system LaunchDaemon.
- [x] Create `~/Library/LaunchAgents/com.learnrudi.daemon.plist`.
- [x] Ensure `~/.rudi/logs` exists before loading the agent.
- [x] Render plist with:
      label `com.learnrudi.daemon`, `ProgramArguments` for `rudi serve`,
      `RunAtLoad = true`, `KeepAlive = true`, stdout/stderr log paths under
      `~/.rudi/logs`, and no tokens or provider secrets.
- [x] Before install/update, stop any manually started detached daemon to avoid
      two supervisors fighting over the same port/token files.
- [x] Remove stale `.rudi-lite-port` and `.rudi-lite-token` only after the
      currently recorded daemon is unreachable or has been stopped.
- [x] Load with modern launchctl commands:
      `launchctl bootstrap gui/$UID <plist>` and
      `launchctl enable gui/$UID/com.learnrudi.daemon`.
- [x] Validate install by waiting for `/health`, then authenticated `/ready`,
      using the generated port/token files.
- [x] Implement `rudi daemon status` so it reports both LaunchAgent state and
      HTTP daemon readiness.
- [x] Implement `rudi daemon restart` for managed installs with
      `launchctl kickstart -k gui/$UID/com.learnrudi.daemon`, then wait for
      readiness.
- [x] Define `rudi daemon stop` semantics for managed installs. With
      `KeepAlive = true`, stop should disable or boot out the LaunchAgent rather
      than sending only `SIGTERM`, because launchd may immediately restart it.
- [x] Implement `rudi daemon uninstall` by booting out the agent, removing the
      plist, cleaning stale connection files after the process is gone, and
      verifying final daemon state is `not_running`.
- [x] Add a dry-run or `--json` output path so support tooling can inspect the
      intended plist and status without changing system state.
- [x] Add unit tests for plist rendering and launchctl command construction.
- [x] Run a live manual smoke for install, status, restart, stop/start,
      uninstall, reinstall, and MCP router `tools/list`.
- [ ] Add reboot/login verification.
- [ ] Convert the live smoke into an isolated/manual smoke checklist or script.

## Remote Worker Mode

Remote MacBook mode should not be implemented by simply binding the existing
daemon to `0.0.0.0`.

Required design:

- remote auth
- transport security
- worker registration
- queue or dispatch model
- artifact synchronization
- secret ownership
- permission model
- audit log
- offline/retry behavior

Checklist:

- [ ] Write separate remote-worker architecture doc.
- [ ] Decide whether remote workers share one `~/.rudi` or have independent
      homes.
- [ ] Decide where generated artifacts live.
- [ ] Decide how secrets are provisioned and rotated.
- [ ] Decide whether jobs execute on caller machine or worker machine.
- [ ] Add explicit user confirmation before exposing any local daemon beyond
      localhost.

## Technical Debt Register

| ID | Area | Status | Severity | Debt | Cleanup Trigger |
|---|---|---|---|---|---|
| DAEMON-DEBT-001 | `serve.js` size | Open | P1 | Sidecar routing, startup, runtime wiring, and some policy live in one large command file. | Extract schemas, operations, routes, and runtime modules while preserving only retained routes. |
| DAEMON-DEBT-002 | Contract drift | Open | P1 | OpenAPI, route handlers, tests, and Lite client expectations can drift. | Shared schema source or schema snapshot tests. |
| DAEMON-DEBT-003 | Lifecycle naming | Open | P2 | "Lite sidecar" name undersells the actual daemon/control-plane role. | Rename docs and internal modules to daemon while preserving `rudi serve`. |
| DAEMON-DEBT-004 | Tool index failure UX | Open | P2 | `rudi index` reports some stack failures but not enough structured status for UI/agents. | Add index failure schema and daemon status endpoint. |
| DAEMON-DEBT-005 | Remote mode ambiguity | Open | P1 | Another MacBook can be a worker, but current daemon is localhost/local-state only. | Remote-worker design before host binding changes. |
| DAEMON-DEBT-006 | Shim drift | Open | P2 | User shell shim can point at stale CLI paths. | Add doctor check and shim repair validation. |
| DAEMON-DEBT-007 | Route contract drift | Open | P1 | Retained daemon routes, especially `/agent-host/v1`, exceed current shared schema and OpenAPI coverage; legacy orchestration routes are retired. | Publish and test retained contracts, then delete legacy routes and their sidecar contract entries under ADR 0001. |
| DAEMON-DEBT-008 | Token-in-URL serving | Open | P1 | Lite builds `/fs/serve?path=...&token=...`, which violates the target rule that secrets never appear in URLs. | Replace with header-authenticated blob/artifact serving or short-lived non-secret artifact URLs. |
| DAEMON-DEBT-009 | WebSocket event drift | Open | P2 | Lite listens for `terminal:error`, but the server does not currently broadcast it; package events are emitted without a known Lite consumer; `ws:*` events are client-internal. | Define server event schemas and separate daemon events from Lite bridge lifecycle events. |
| DAEMON-DEBT-010 | Legacy status vocabulary drift | Superseded | P2 | Legacy run-group schemas and DB statuses disagree. ADR 0001 retires both from the CLI runtime. | Delete the route family, schemas, and focused tests; do not add compatibility adapters. |
| DAEMON-DEBT-011 | Admin endpoint classification | Retirement approved | P2 | Legacy session backfill and repair endpoints are authenticated but ad hoc and outside the target daemon boundary. | Delete session backfill/repair endpoints under ADR 0001; classify only retained admin operations. |
| DAEMON-DEBT-012 | RUDI-owned process supervisor split | Open | P1 | Terminal tasks, package jobs, stack probes, and file watchers are in memory, while SQLite stores durable runtime state; restart repair is partial. Target architecture excludes external AI agent process ownership. | Extract supervisor boundaries for RUDI-owned jobs only and define restart ownership/repair semantics. |
| DAEMON-DEBT-013 | Package job durability | Open | P2 | Package install jobs are stored in an in-memory map, but target jobs require bounded, inspectable lifecycle state. | Persist long-running daemon jobs or explicitly classify package jobs as ephemeral. |
| DAEMON-DEBT-014 | Legacy route module location | Superseded | P2 | Retired route modules still live under `src/commands/serve` and transitional re-exports blur the daemon boundary. | Delete retired modules and re-exports under ADR 0001; move only retained daemon routes when necessary. |
| DAEMON-DEBT-015 | LaunchAgent lifecycle verification | Open | P2 | `rudi daemon install`, `uninstall`, managed `status`, `start`, `stop`, and `restart` are implemented and live-smoked. Remaining gaps are reboot/login verification, packaged-binary version checks, and active child-process restart semantics. | Run reboot/login smoke and close remaining restart-ownership questions. |
| DAEMON-DEBT-016 | Runtime smoke coverage | Open | P2 | Phase 4 and Phase 5 have isolated manual smoke commands and the LaunchAgent path has a live manual smoke, but this is not yet committed as an automated or repeatable manual runbook. | Add a non-flaky isolated `RUDI_HOME` integration test or CI-safe/manual smoke script for daemon lifecycle. |
| DAEMON-DEBT-017 | Codex desktop app verification | Open | P2 | `rudi integrate codex` now targets Codex `~/.codex/config.toml`, matching current Codex CLI and IDE extension MCP docs, but the macOS Codex desktop app integration path still needs a real app smoke test. | Verify Codex desktop app discovers the `rudi` MCP server from `config.toml` or document any separate app-server integration path. |
| DAEMON-DEBT-018 | Session DB maintenance warnings | Retirement approved | P1 | Legacy startup reconciliation and session ingestion can log `database disk image is malformed` even when `sqlite3 PRAGMA integrity_check` returns `ok`. | Remove session maintenance from daemon startup; leave existing `rudi.db` files untouched. |
| DAEMON-DEBT-019 | Residual stack index failures | Open | P2 | Tool index improved from 3 failures to 2 after local config repair. Remaining failures are expected missing `SLACK_BOT_TOKEN` and `stack:codebase-memory` timing out on MCP `tools/list` even after 60s with large scan logs. | Improve missing-secret UX and update/isolate the codebase-memory stack so it responds to MCP discovery within daemon index budgets. |
| DAEMON-DEBT-020 | Legacy LaunchAgent migration | Open | P2 | A legacy `com.rudi.sidecar` LaunchAgent can run a second `rudi serve` alongside `com.learnrudi.daemon`, causing port-file and SQLite contention. The new install path stops legacy labels and this machine's legacy plist was disabled, but migration still needs a doctor check/release note. | Add `rudi doctor` detection and a documented cleanup path for legacy LaunchAgents. |
| DAEMON-DEBT-021 | Legacy agent deployment retirement | Retirement approved | P1 | Existing `/agent/*`, run-group, spawn-child, orchestration, and active-session routes reflect the older RUDI-as-agent-runner direction. | Apply ADR 0001 after extracting retained Agent Host dependencies and publishing the `/agent-host/v1` contract tests. |
| DAEMON-DEBT-022 | Storage boundary hardening | Retirement approved | P1 | Legacy `rudi.db` session import/search and repair are interleaved with daemon startup; Studio still depends on `packages/db`. | Remove legacy storage work from the daemon, isolate `packages/db` for Studio only, and test that CLI runtime no longer imports or opens it. |
| DAEMON-DEBT-023 | Agent onboarding wrapper | Open | P2 | `rudi integrate <agent>` now owns MCP router config and `rudi instructions <agent>` owns the managed instruction block, but a new user still needs to know the sequence. | Add `rudi connect <agent>` or installer onboarding that performs integration, instruction install/print, daemon status, router smoke, and restart guidance. |

Debt tracking rule:

- Every migration note that says "later", "if needed", "temporary",
  "transitional", or "legacy" must map to a `DAEMON-DEBT-*` row or an unchecked
  phase checklist item.
- A debt row can close only when the implementation, contract docs, and relevant
  tests all move together.
- Phase notes should name the debt ID when choosing not to resolve it in the
  current slice.

## Migration Phases

### Phase 0: Baseline and Inventory

- [x] Record current `rudi serve` endpoints.
- [x] Record current WebSocket messages.
- [x] Record current Lite API consumers.
- [x] Record current CLI consumers.
- [x] Record current router/tool-index behavior.
- [x] Record current database tables used by sidecar.
- [x] Add known debt to this register.

#### Phase 0 Baseline Inventory (2026-05-17)

Inventory scope:

- CLI repo: `/Users/hoff/dev/RUDI/apps/cli`
- Lite repo: `/Users/hoff/dev/RUDI/apps/lite`
- Current daemon entry point: `src/commands/serve.js`
- Current Lite bridge: `/Users/hoff/dev/RUDI/apps/lite/src/services/httpBridge.ts`
- Current Lite sidecar lifecycle: `/Users/hoff/dev/RUDI/apps/lite/src/services/sidecar.ts`
- Current MCP router: `src/router-mcp.js`
- Current tool-index cache module: `packages/core/src/tool-index.js`

Current `rudi serve` bootstrap behavior:

- `src/commands/serve.js` creates an HTTP server plus one WebSocket server.
- The server binds to `127.0.0.1` unless explicitly configured otherwise.
- The server writes `~/.rudi/.rudi-lite-port` and
  `~/.rudi/.rudi-lite-token` with user-only file permissions.
- `/health` is unauthenticated. Other HTTP routes require the real daemon token
  through `x-rudi-token`.
- WebSocket upgrades require the real daemon token through protocol
  `rudi-token.<token>`; host-based same-origin trust and query-token transport
  are not authentication.
- Startup calls `initSchema()`, repairs stale runtime state, refreshes legacy
  run-group aggregates, kills orphan Claude CLI processes from the old
  daemon-owned agent path, and runs conservative orphan worktree cleanup through
  `src/commands/serve/startup.js`.
- After listening, it starts session watching, DB reconciliation/backfills,
  title/metadata backfills, and periodic runtime reconciliation.
- Shutdown removes legacy owned agent processes while compatibility routes
  exist, terminal processes, file watchers, package timers, session resources,
  and the port/token files.

Current HTTP endpoint inventory:

| Area | Source file | Current endpoints and behavior |
|---|---|---|
| Core | `src/commands/serve.js` | `OPTIONS *` CORS preflight.<br>`GET /health` returns liveness and sidecar API version without auth.<br>`GET /env` returns home/platform with auth.<br>Optional static `GET` fallback serves Lite web root when `--web-root` is used. |
| Logs | `src/commands/serve/routes/logs.js` | `GET /logs`, `POST /logs`, `GET /logs/stream` SSE with a bounded client set. |
| Filesystem | `src/commands/serve/routes/fs.js` | `GET /fs/read`, `POST /fs/write`, `POST /fs/write-binary`, `GET /fs/readdir`, `GET /fs/stat`, `GET /fs/serve`, `POST /fs/mkdir`, `POST /fs/remove`, `POST /fs/rename`, `POST /fs/watch`, `POST /fs/unwatch`.<br>Broadcasts `fs:change` for watched paths. `GET /fs/serve` is currently used by Lite with query-token auth. |
| Auth | `src/commands/serve/routes/auth.js` | `GET /auth/status`, `POST /auth/login`. |
| Projects | `src/commands/serve/routes/projects.js` | `GET /projects`, `POST /projects`, `POST /projects/:id`, `DELETE /projects/:id`. |
| Notes | `src/commands/serve/routes/notes.js` | `GET /notes`, `POST /notes`, `GET /notes/:id`, `POST /notes/:id`, `DELETE /notes/:id`. |
| Sessions | `src/commands/serve/sessions.js` | `GET /sessions`, `GET /sessions/projects`, `GET /sessions/search`, `GET /sessions/:id/messages`, `GET /sessions/:id/diffs`, `GET /sessions/:id/subagents`, `POST /sessions/:id/title`.<br>Legacy `tail` is translated to `count`; `before` is rejected. |
| Packages | `src/commands/serve/routes/packages.js` | `GET /packages/search`, `GET /packages/list`, `GET /packages/installed`, `GET /packages/jobs/:jobId`, `POST /packages/install`, `GET /packages/secrets`, `POST /packages/secrets`, `DELETE /packages/secrets/:name`.<br>Install jobs are in-memory and emit package progress events. |
| Git | `src/commands/serve/git.js` | `GET /git/status`, `POST /git/stage`, `POST /git/unstage`, `POST /git/revert`, `POST /git/commit`, `GET /git/branches`, `POST /git/branch/create`, `POST /git/checkout`, `GET /git/worktrees`, `POST /git/worktree/add`, `POST /git/branch/delete`, `POST /git/worktree/remove`, `POST /git/stash`, `POST /git/init`. |
| Agent start/lifecycle | `src/commands/agent/routes/start.js`, `src/commands/agent/routes/lifecycle.js` | `POST /agent/start`, `POST /agent/stop`, `POST /agent/send`, `POST /agent/tool-result`, `GET /agent/status/:sessionId`, `GET /agent/sessions`, `POST /agent/kill-all`. |
| Agent providers/suggest | `src/commands/serve/routes/providers.js`, `src/commands/serve/routes/suggest.js` | `GET /agent/providers`, `POST /agent/suggest`, `POST /agent/name-session`, `POST /agent/generate-branch-name`. |
| Agent permissions | `src/commands/agent/permissions.js` | `POST /agent/permission-request`, `GET /agent/permission-decision/:requestId`, `POST /agent/permission-response`, `GET /agent/permissions`.<br>Used by provider hooks and Lite approval UI. |
| Agent worktrees | `src/commands/agent/routes/worktree-routes.js` | `POST /agent/cleanup-worktree`, `POST /agent/delete-worktree-branch`, `GET /git/worktrees/status`, `GET /git/worktrees/diff/:branch`. |
| Run groups | `src/commands/agent/routes/run-group.js` | `POST /agent/run-group`, `GET /agent/run-groups`, `GET /agent/run-group/:id`, `GET /agent/run-group/:id/live`, `GET /agent/run-group/:id/diffs`, `POST /agent/run-group/:id/stop`, `POST /agent/run-group/:id/merge`, `POST /agent/run-group/:id/cleanup`. |
| Orchestration | `src/commands/agent/routes/orchestrate.js` | `POST /agent/orchestrate`, `GET /agent/orchestration/:id`, `POST /agent/orchestration/:id/execute`, `POST /agent/orchestration/:id/cancel`. |
| Child sessions | `src/commands/agent/routes/spawn-child.js` | `POST /agent/spawn-child`, `GET /agent/children/:parentSessionId`.<br>`POST /agent/spawn-child` expects `x-rudi-caller-session` to match the parent session. |
| Shell | `src/commands/serve/routes/shell.js` | `POST /shell/reveal`, `POST /shell/open`. |
| Terminal | `src/commands/serve/routes/terminal.js` | `POST /terminal/open`, `POST /terminal/write`, `POST /terminal/resize`, `POST /terminal/close`.<br>Streams terminal output and exit events over WebSocket. |
| Analytics | `src/commands/serve/routes/analytics.js` | `GET /analytics/tools`, `GET /analytics/tools/files`, `GET /analytics/tools/timeline`, `GET /analytics/tools/errors`, `GET /analytics/session-summary`, `GET /analytics/overview`, `GET /analytics/daily-activity`, `GET /analytics/cost-breakdown`, `GET /analytics/stats`, `GET /analytics/cost-timeline`, `GET /analytics/stats-cache`. |
| Plans | `src/commands/serve/routes/plans.js` | `GET /plans`, `GET /plans/:id`. |
| Admin/backfill | `src/commands/serve.js` | `GET /admin/ingester`, `POST /admin/backfill`, `POST /admin/repair-no-text`, `GET /admin/title-backfill`, `POST /admin/title-backfill`, `GET /admin/metadata-backfill`, `POST /admin/metadata-backfill`. |

Current WebSocket inventory:

- WebSocket setup lives in `src/commands/serve.js`.
- Incoming messages are delegated through `handleSessionsWsMessage` in
  `src/commands/sessions/tail.js`.
- Current client-to-server messages: `session:follow`, `session:unfollow`.
- Current server-to-client messages:
  - Files: `fs:change`
  - Sessions: `sessions:updated`, `session:lines-added`,
    `session:tool-updated`, `session:follow-error`, `session:follow-ended`,
    `session:titled`
  - Agents: `agent:event`, `agent:done`, `agent:error`, `agent:stopped`,
    `agent:process-count`
  - Run groups: `run-group:session-activity`, `run-group:started`,
    `run-group:session-done`, `run-group:phase-started`,
    `run-group:completed`, `run-group:stopped`
  - Orchestration: `orchestration:plan-ready`,
    `orchestration:plan-failed`
  - Terminal: `terminal:data`, `terminal:exit`
  - Packages: `package:progress`, `package:complete`
- Lite bridge lifecycle events such as `ws:disconnected` and `ws:reconnected`
  are client-internal events emitted by `httpBridge.ts`, not daemon messages.

Current Lite consumers:

| Lite file | Current daemon usage |
|---|---|
| `/Users/hoff/dev/RUDI/apps/lite/src/services/httpBridge.ts` | Sole HTTP/WS API bridge. Exports `fs`, `env`, `shell`, `terminal`, `auth`, `projects`, `notes`, `sessions`, `agent`, `git`, `analytics`, and `plans` clients. Handles `configure(port, token)`, `healthCheck()`, `connectWs()`, `wsSend()`, and `onWsEvent()`. |
| `/Users/hoff/dev/RUDI/apps/lite/src/services/sidecar.ts` | Owns Lite-side daemon lifecycle. In development it reads an existing port/token; in production it starts `binaries/rudi serve` through Tauri sidecar. Deletes stale port/token files before spawn, health-checks before connecting WS, and auto-restarts up to `MAX_RESTARTS = 5`. |
| `/Users/hoff/dev/RUDI/apps/lite/src/stores/useSessionsStore.ts` | Consumes session listing/messages/diffs/title routes and session WebSocket events. Sends `session:follow` and `session:unfollow` through the bridge. |
| `/Users/hoff/dev/RUDI/apps/lite/src/stores/useActiveSessionsStore.ts` | Consumes agent session lifecycle/status events, active session tracking, and process-count updates. |
| `/Users/hoff/dev/RUDI/apps/lite/src/stores/useRunGroupsStore.ts` | Consumes run-group HTTP routes and run-group WebSocket events. |
| `/Users/hoff/dev/RUDI/apps/lite/src/hooks/useFileWatcher.ts` | Uses filesystem watch/unwatch routes and `fs:change`. |
| `/Users/hoff/dev/RUDI/apps/lite/src/components/features/Preview/PreviewPanel.tsx` | Uses `fs.serveUrl(path)` for preview assets. Current implementation appends token in the URL. |
| `/Users/hoff/dev/RUDI/apps/lite/src/components/features/Chat/TerminalDrawer.tsx` | Uses terminal open/write/resize/close routes and terminal WebSocket events. It listens for `terminal:error`, but the server currently has no matching broadcast. |
| `/Users/hoff/dev/RUDI/apps/lite/src/components/features/Chat/ActiveProcessesBadge.tsx` | Consumes active process-count WebSocket state. |
| `/Users/hoff/dev/RUDI/apps/lite/src/components/features/Shell/ConnectionGate.tsx` | Consumes sidecar connection lifecycle and offline/reconnect state. |

Current CLI consumers:

| CLI file | Current daemon usage |
|---|---|
| `src/commands/sidecar-client.js` | Reads `~/.rudi/.rudi-lite-port` and `~/.rudi/.rudi-lite-token`, then calls `http://127.0.0.1:<port>` with `X-Rudi-Token`. |
| `src/commands/parallel.js` | Starts run groups through `POST /agent/run-group` and polls `GET /agent/run-group/:id`. |
| `src/commands/run-group.js` | Uses `GET /agent/run-groups`, `GET /agent/run-group/:id`, `POST /agent/run-group/:id/stop`, `POST /agent/run-group/:id/merge`, and `POST /agent/run-group/:id/cleanup`. |
| `src/spawn-mcp.js` | Reads `RUDI_SIDECAR_URL`, `RUDI_SIDECAR_TOKEN`, and `RUDI_SESSION_ID`. Proxies MCP tools to `POST /agent/spawn-child` and `GET /agent/children/:sessionId`. |
| `src/commands/agent/routes/start.js` | Injects sidecar URL/token/session env vars into spawned agent processes. |
| `src/commands/agent/routes/run-group.js` | Injects sidecar URL/token/session env vars into run-group agent processes. |
| `src/commands/agent/routes/spawn-child.js` | Injects sidecar URL/token/session env vars into child sessions. |
| `src/commands/agent/routes/orchestrate.js` | Injects sidecar URL/token/session env vars into orchestrated child processes. |

Current MCP router and tool-index behavior:

- `src/router-mcp.js` is an MCP stdio server and does not require Lite or
  `rudi serve` to be open.
- The router reads installed package metadata from `~/.rudi/rudi.json`.
- The router reads the cache at `~/.rudi/cache/tool-index.json`.
- The router reads secrets from `~/.rudi/secrets.json` and injects stack secrets
  into launched stack MCP server environments.
- `tools/list` primarily uses the cache, then inline `rudi.json` tool metadata,
  then optional live stack discovery only when `RUDI_ROUTER_LIVE_TOOL_LIST=1`.
- `tools/call` parses `stack.tool`, lazy-spawns the stack MCP server from the
  stack launch config, and keeps a bounded idle process pool.
- `packages/core/src/tool-index.js` owns the cache shape:
  `{ version: 1, updatedAt, byStack: {} }`.
- Each stack cache entry contains `indexedAt`, `tools`, `error`, and optional
  `missingSecrets`.
- `src/commands/index-tools.js` implements `rudi index` by calling
  `indexAllStacks()` and reporting indexed, failed, orphaned, and missing
  stacks.
- `src/commands/mcp.js` implements `rudi mcp <stack>` as a direct stack runner
  with bundled runtime resolution and secret injection.
- Daemon work must preserve router cache compatibility and `rudi mcp <stack>`
  behavior while adding daemon operations for index status and rebuilds.

Current storage tables touched by sidecar surfaces:

- Schema source: `packages/db/src/schema.js`
- Current schema version: `SCHEMA_VERSION = 27`
- Startup initializes schema via `src/commands/serve/startup.js`.
- Session/history/search/analytics tables: `projects`, `sessions`, `turns`,
  `turns_fts`, `sessions_fts`, `tool_calls`, `tags`, `session_tags`,
  `model_pricing`, `file_positions`.
- Agent/runtime/run-group tables: `run_groups`, `session_runtime_state`,
  `session_runtime_events`, `task_artifacts`, `task_validation_results`,
  `orchestration_plans`, `system_events`, `file_changes`.
- Package/run/security metadata tables: `packages`, `package_deps`, `runs`,
  `artifacts`, `lockfiles`, `secrets_meta`.
- Observability table: `logs`.
- Current package routes primarily use `@learnrudi/core` config data and
  `@learnrudi/secrets` file-backed secrets; the DB package tables are not the
  primary package route source today.
- Current `session_runtime_state.status` values are `starting`, `running`,
  `retrying`, `completed`, `error`, `stopped`, and `crashed`.
- Current `run_groups.status` values are `pending`, `running`, `completed`,
  `partial`, `failed`, and `stopped`.
- Current `sessions.status` values are `active`, `archived`, and `deleted`;
  process liveness is represented separately in runtime state tables.

Historical contract and compatibility inventory (non-normative):

- `src/contracts/sidecar-openapi.js` exists, but it covers only part of the
  implemented sidecar surface. It currently omits or under-specifies multiple
  agent lifecycle, permissions, packages, orchestration, admin, and analytics
  routes.
- `src/commands/agent/index.js` composes agent route modules in this order:
  start, lifecycle, permissions, worktree, run-group, orchestrate, spawn-child.
- `ensurePermissionHook(log)` is installed when agent handlers are created.
- Lite path compatibility was preserved during the earlier `httpBridge.ts`
  migration. ADR 0001 supersedes that requirement for retired routes; only
  retained nonlegacy daemon routes keep stable client contracts.
- The MCP router must stay independent from daemon uptime. The daemon may add
  index operations, but the router must still read the cache and launch stacks
  directly.

Exit gate:

- A reviewer can see every current consumer and endpoint before refactor begins.

### Phase 1: Schema and Error Model

- [x] Add daemon schema modules.
- [x] Add common success/error envelope.
- [x] Add request context schema.
- [x] Add event envelope schema.
- [x] Add package/tool/run-group/session/job/artifact schemas.
- [x] Add schema snapshot tests.
- [x] Update OpenAPI generation or validation.

Exit gate:

- Contract changes fail tests when schemas drift.

### Phase 2: Operation Extraction

- [x] Extract health/status operations.
- [x] Extract package status operations.
- [x] Extract tool-index operations.
- [x] Extract secrets status operations.
- [x] Extract run-group operations.
- [x] Extract session operations.
- [x] Extract artifact operations.
- [x] Add operation-level tests.

Exit gate:

- Existing routes call operations; behavior remains compatible.

### Phase 3: Route Cleanup

- [x] Move route handlers under `src/daemon/routes`.
- [x] Keep `src/commands/serve.js` as bootstrap.
- [x] Preserve current Lite paths.
- [x] Add additive daemon status routes.
- [x] Add route-level contract tests.
- [x] Regenerate or validate OpenAPI.

Exit gate:

- Lite still works, existing tests pass, OpenAPI matches implementation.

Current route cleanup status:

- `src/commands/serve.js` now delegates daemon-owned health, readiness, version,
  status, environment, and admin routes to `src/daemon/routes`.
- Existing Lite paths are preserved. `/health` remains unauthenticated; `/ready`,
  `/version`, and `/daemon/status` are additive authenticated routes.
- Legacy route modules still exist under `src/commands/serve/routes` and are
  exposed through `src/daemon/routes/index.js` while the physical file move
  continues in smaller slices. Tracked as `DAEMON-DEBT-014`.

### Phase 4: Runtime and Supervisor

- [x] Extract server bootstrap.
- [x] Extract auth middleware.
- [x] Extract WebSocket event bus.
- [x] Extract process manager.
- [x] Add graceful shutdown.
- [ ] Add bounded job queue if needed.
- [x] Add launchd lifecycle command or docs.

Exit gate:

- Daemon starts, stops, restarts, reports health, and cleans up owned processes.

#### Phase 4 Runtime Extraction (2026-05-17)

- `src/daemon/runtime/bootstrap.js` owns daemon startup helpers: web-root
  validation, requested-port parsing, port/token file writes, startup banner,
  and listen binding.
- `src/daemon/runtime/auth.js` owns CORS preflight and HTTP token gating.
  `/health` remains public; other routes require the real daemon token through
  `x-rudi-token`.
- `src/daemon/runtime/websocket.js` owns WebSocket upgrade auth, accepted
  protocol selection, connection logging, JSON message dispatch, and disconnect
  cleanup.
- `src/daemon/runtime/process-manager.js` currently owns legacy in-memory
  agent-process and resume-session indexes. ADR 0001 deletes those indexes and
  their cleanup; retained supervision is limited to detached Agent Host workers
  and RUDI-owned jobs or stack probes.
- `src/daemon/runtime/shutdown.js` closes the HTTP server and WebSocket server
  before bounded cleanup. The target cleanup covers daemon connection files,
  detached Agent Host workers, and RUDI-owned jobs or resources. Legacy agent
  processes, session watchers, resume indexes, and the idle reaper are deleted.
- No new bounded durable job queue was added in this slice. Package install jobs
  remain explicitly tracked as `DAEMON-DEBT-013` until the package-job durability
  decision is made.
- Runtime validation included an isolated `RUDI_HOME` smoke test: start
  `rudi serve` on a dynamic localhost port, verify `/health`, send `SIGTERM`,
  verify exit code `0`, and verify port/token files are removed. Committed
  automated coverage remains tracked as `DAEMON-DEBT-016`.
- LaunchAgent behavior is documented, but plist install/update/remove remains
  tracked as `DAEMON-DEBT-015` for the always-on lifecycle slice.

### Phase 5: CLI and Lite Integration

- [x] Update `rudi status` with daemon status.
- [x] Update `rudi doctor` with daemon reachability.
- [x] Add daemon lifecycle command if approved.
- [x] Update Lite HTTP bridge to use stable daemon client.
- [x] Add Lite daemon-offline state.
- [x] Verify MCP router remains independent.

Exit gate:

- Users can tell whether daemon is installed, running, healthy, and indexing
  tools.

#### Phase 5 CLI Status Integration (2026-05-17)

- `src/commands/sidecar-client.js` now exposes a shared daemon probe. It reads
  the existing port/token files, calls authenticated `/ready` and
  `/daemon/status`, and returns a structured local state:
  `not_running`, `unreachable`, `not_ready`, or `ok`.
- `rudi status` includes a `daemon` object in JSON output and a human-readable
  daemon section. `rudi status daemon` can be used to inspect only the daemon
  state.
- `rudi doctor` includes daemon reachability. A daemon that has never been
  started is informational and does not fail local package/runtime health. Stale
  connection files, unreachable daemon process, or not-ready daemon state are
  actionable doctor issues.
- Local lifecycle command work is now available through `rudi daemon status`,
  `rudi daemon start`, `rudi daemon stop`, and `rudi daemon restart`.
  LaunchAgent plist install/update/remove remains tracked as
  `DAEMON-DEBT-015`.

#### Phase 5 Local Daemon Lifecycle Command (2026-05-17)

- `src/commands/daemon.js` adds `rudi daemon status`, `start`, `stop`, and
  `restart` as a local lifecycle wrapper around `rudi serve`.
- `rudi daemon start` launches the current CLI entrypoint with `serve` in a
  detached Node process, writes daemon stdout/stderr under `~/.rudi/logs`, and
  waits for authenticated readiness through the current port/token files.
- `rudi daemon stop` reads daemon status, sends `SIGTERM` to the daemon PID,
  waits for the connection files to go offline, and removes stale files after a
  confirmed stop.
- `rudi daemon install`, `uninstall`, and `remove` intentionally fail with a
  clear message. LaunchAgent installation, update, removal, and restart
  ownership validation remain `DAEMON-DEBT-015`.
- Validation included unit tests for command helpers plus isolated live smokes
  against both `src/index.js` and the built `dist/index.cjs` entrypoint with
  temporary `RUDI_HOME`: `daemon start --json`, `daemon status --json`,
  `daemon stop --json`, and final `daemon status --json` returning
  `not_running`.

#### Always-On LaunchAgent Implementation (2026-05-17)

- `src/daemon/runtime/launch-agent.js` owns LaunchAgent plist rendering,
  launchctl command construction, launchctl status probing, install, stop,
  start/restart, and uninstall helpers.
- `rudi daemon install` now writes the per-user LaunchAgent plist, stops a
  manually supervised daemon first, loads with `launchctl bootstrap`, enables
  `gui/$UID/com.learnrudi.daemon`, and waits for authenticated daemon readiness.
- `rudi daemon uninstall` disables and boots out the LaunchAgent, removes the
  plist, cleans connection files after managed stop, and reports final daemon
  state.
- `rudi daemon status` reports both LaunchAgent state and daemon HTTP
  readiness. When a LaunchAgent plist is installed, `start`, `stop`, and
  `restart` use launchd semantics instead of raw detached process control.
- `rudi daemon install --dry-run --json` returns the intended plist and
  launchctl commands without changing system state.
- Validation includes unit tests for plist rendering, command construction,
  launchctl output parsing, install/uninstall helpers, and managed lifecycle
  command branches.
- Live smoke on 2026-05-17 America/New_York validated real launchctl
  install, status, restart, stop/start, uninstall, reinstall, and daemon
  readiness. `~/.rudi/.rudi-lite-port` ended on the launchd-owned daemon port
  and only one `dist/index.cjs serve` process remained after cleanup.
- The smoke found two LaunchAgent bugs and one migration issue:
  start/reinstall must enable before bootstrap after a previous disable, stopped
  status should not surface launchctl "service not found" as an error, and the
  legacy `com.rudi.sidecar` LaunchAgent must be stopped during migration.
  These are covered by unit tests and runtime changes.
- Reboot/login verification, packaged-binary version checks, and durable
  active child-process restart semantics remain tracked as `DAEMON-DEBT-015`
  and `DAEMON-DEBT-016`.

#### Codex MCP Integration Review (2026-05-17)

- Current Codex docs state that Codex MCP configuration lives in
  `~/.codex/config.toml` and is shared by the CLI and IDE extension.
- `rudi integrate codex` previously targeted legacy JSON config under
  `~/.codex/config.json`, while older direct stack registration code already
  knew about Codex TOML. That split could leave Codex CLI/IDE without the RUDI
  router and keep stale direct stack entries active.
- The Codex integration now prefers `~/.codex/config.toml`, writes one
  `[mcp_servers.rudi]` entry pointing at `~/.rudi/bins/rudi-router`, and removes
  direct RUDI stack MCP entries such as `slack`, `google-workspace`, and
  `content-extractor` when their commands or cwd point into `~/.rudi/stacks`.
- RUDI MCP detection now parses Codex TOML so detected-agent summaries report
  the same config surface that Codex CLI/IDE use.
- Live MCP smoke through `~/.rudi/bins/rudi-router` successfully completed
  MCP `initialize` and `tools/list` against the launchd daemon, returning 116
  tools from the repaired tool index.
- The macOS Codex desktop app still needs a real smoke test. It is tracked as
  `DAEMON-DEBT-017` until verified against the app itself.

#### Agent Instruction Registration (2026-05-18)

- Added `rudi instructions <agent>` as the upstream source for the agent
  instruction layer. It is intentionally separate from `rudi integrate`:
  integration registers tools through MCP config, while instructions tell the
  agent how to reason about RUDI once those tools are visible.
- The command supports `claude`, `codex`, and `generic`; aliases such as
  `claude-code` normalize to `claude` and `openai` normalizes to `codex`.
- Default behavior prints a pasteable managed block. Writes require
  `--install`; removals require `--remove`; `--project`, `--global`, and
  `--path` control the target file. The managed block is bounded by
  `<!-- RUDI BEGIN -->` and `<!-- RUDI END -->` so downstream files can be
  updated idempotently without overwriting user-owned instructions.
- The block uses discovery commands (`rudi list stacks --json`,
  `rudi index --json`, `rudi daemon status --json`) and explicitly avoids a
  hardcoded stack inventory. It also states the product boundary: RUDI owns
  local tools, secrets, stack/tool index, daemon health, artifacts, and MCP
  access; Claude/Codex/Gemini own normal agent execution.
- Remaining onboarding work is tracked as `DAEMON-DEBT-023`: add a single
  `rudi connect <agent>` or installer flow that combines MCP integration,
  instruction install/print, daemon status, router smoke, and restart guidance.

#### Runtime Smoke Findings (2026-05-17)

- `rudi index` now discovers 116 tools from 12 of 14 stacks. The local
  `stack:web-export` launch config was repaired to use `node dist/index.js`,
  matching its manifest and returning 3 MCP tools.
- Slack's installed secret metadata had lost `key`-based secret names and
  produced `rudi secrets set undefined`. Source normalization now accepts both
  `name` and `key`, and local `rudi.json` was repaired to report
  `SLACK_BOT_TOKEN`.
- `stack:codebase-memory` still fails MCP discovery. A direct 60s smoke timed
  out and emitted large scan logs before returning `tools/list`. This remains
  `DAEMON-DEBT-019`.
- The daemon is ready after final restart, but session maintenance still emits
  `database disk image is malformed` warnings despite `PRAGMA integrity_check`
  returning `ok`. This remains `DAEMON-DEBT-018`.

#### Accepted Boundary Update: Agents and Storage (2026-08-02)

- ADR 0001 retires legacy agent execution and imported-session ownership; there
  is no read-only or temporary compatibility tier.
- Before deletion, retained provider helpers and normalizers move under
  `src/agent-host/`, the neutral repo-root helper is extracted, and
  `sidecar-client` becomes a daemon-only client.
- The current `/agent-host/v1` contract and tests must be published before old
  sidecar contracts and focused tests are deleted.
- `packages/db` stays only as an isolated Studio compatibility package until
  Studio migrates or retires. The checked-in Bot is a retired `/agent/*`
  consumer. Existing user `rudi.db` files are left in place and ignored.

#### Phase 5 Lite and MCP Integration (2026-05-17)

- `/Users/hoff/dev/RUDI/apps/lite/src/services/httpBridge.ts` exposes a typed
  `daemon` client for `/health`, `/ready`, and `/daemon/status`.
- `/Users/hoff/dev/RUDI/apps/lite/src/services/sidecar.ts` and
  `/Users/hoff/dev/RUDI/apps/lite/src/components/features/Shell/ConnectionGate.tsx`
  now distinguish `offline` daemon state from hard startup errors. Dev-mode
  "skip sidecar" connection failure and WebSocket disconnects surface as
  daemon-offline state with retry.
- Lite tests cover the daemon client and offline connection gate state.
- MCP router independence was verified by source scan and syntax check:
  `src/router-mcp.js` continues to read local config/tool-index directly and has
  no sidecar daemon dependency. The legacy sidecar-bound `src/spawn-mcp.js` is
  retired by ADR 0001.

### Phase 6: Remote Worker Design

- [ ] Write remote-worker architecture doc.
- [ ] Define threat model.
- [ ] Define worker registration.
- [ ] Define artifact synchronization.
- [ ] Define secret handling.
- [ ] Define job dispatch model.
- [ ] Do not expose daemon off localhost until this phase is complete.

Exit gate:

- Remote MacBook mode has a reviewed design and explicit security controls.

## Verification Checklist

Run before declaring daemon work complete:

- [ ] Unit tests for schemas.
- [ ] Unit tests for operations.
- [ ] Route contract tests.
- [ ] WebSocket event tests.
- [ ] OpenAPI contract validation.
- [ ] `rudi doctor`.
- [ ] `rudi status --json`.
- [ ] `rudi index`.
- [ ] `rudi mcp image-generator` can call `list_models`.
- [ ] Lite can connect to daemon.
- [ ] LaunchAgent can start/restart daemon.
- [ ] Health check works after restart.
- [ ] Secrets are not printed in logs or responses.
- [ ] Invalid auth returns stable error.
- [ ] Stale port/token behavior is handled.
- [ ] `agent-hosts.db` integrity diagnostic documented without opening or
      repairing legacy `rudi.db`.

## Next Session Starting Point

Execute ADR 0001 in dependency order: extract the retained Agent Host helpers,
publish and test the `/agent-host/v1` contract, then delete the legacy surface.
Do not add compatibility shims or touch existing user `rudi.db` files.
