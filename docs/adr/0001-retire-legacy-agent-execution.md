# ADR 0001: Retire Legacy Agent Execution

Date: 2026-08-02

Status: Accepted

## Context

The CLI currently contains two incompatible agent models. The legacy model
imports provider sessions into `rudi.db` and exposes daemon-owned agent,
run-group, spawn-child, orchestration, and session-management surfaces. The
current Agent Host model launches native provider CLIs while leaving each
provider in control of its model loop, session, and transcript. RUDI owns only
the local launch boundary: isolated workspaces, detached workers, a minimal
launch/group projection, reconnect events, and durable artifacts.

Keeping both models makes `src/index.js`, `src/commands/serve.js`, the daemon
contract, and process ownership ambiguous. It also leaves RUDI responsible for
session import and repair work that is outside its local-capability boundary.

## Decision

Retire the legacy agent-execution and imported-session model from the CLI
production/runtime surface.

The retirement deletes:

- the `db`, `session`, `import`, `parallel`, and `run-group` commands, plus the
  session-only `project`, `apply`, and `logs` commands;
- all legacy `/agent/*` and `/sessions/*` routes, events, and provider-process
  supervision;
- legacy run-group, spawn-child, and orchestration contracts and templates;
- the legacy spawn MCP surface and tests whose only purpose is to preserve a
  retired contract.

The retained architecture consists of:

- core package and stack execution, MCP routing, secrets, indexes, durable
  artifacts, and local-LLM capability status;
- a slim internal daemon for health, authentication, capability operations,
  and the versioned `/agent-host/v1` API;
- Agent Host foreground execution and detached RUDI workers, workspace
  isolation, launch lifecycle operations, and groups as projections over
  independent launches;
- `~/.rudi/state/agent-hosts.db` as a minimal launch/group projection, separate
  from the legacy `rudi.db` session store.

Native providers remain authoritative for transcripts and sessions. RUDI may
persist normalized content-bearing event records only as a bounded reconnect
cache. It must not copy provider transcripts into `agent-hosts.db`, import them
into another RUDI session store, or treat an Agent Host group as a provider
session or orchestration runtime.

After retirement, CLI help and dispatch use three categories: core commands,
advanced commands, and internal daemon entrypoints. There is no callable
legacy-command category.

## Migration and retirement boundary

Removal proceeds in this order:

1. Move provider configuration and argument-building helpers, plus the Claude
   and Codex event normalizers, out of legacy agent modules and into
   `src/agent-host/`.
2. Extract the neutral Git repository-root helper used by `lanes`, and rename
   `sidecar-client` to `daemon-client` while retaining only current daemon
   consumers.
3. Publish the current `/agent-host/v1` daemon contract and add contract tests
   before deleting old sidecar contracts and their focused tests.
4. Remove the legacy commands, routes, events, process supervision, templates,
   orchestration code, and spawn MCP. Remove `packages/embeddings` if no
   non-legacy consumer remains.
5. Isolate `packages/db` as a legacy compatibility package with no imports from
   the CLI entrypoint/runtime and remove the `@learnrudi/runner` DB facade.
   Delete `packages/db` only in coordination with Studio retirement or
   migration because the checked-in Studio directly depends on
   `file:../cli/packages/db`.

The checked-in Bot calls legacy `/agent/*` endpoints. It is a retired consumer,
not a compatibility constraint; this change intentionally ends that contract.

## Consequences

- Existing callers of the removed commands and endpoints must migrate to
  native provider sessions or `/agent-host/v1`; the old contracts receive no
  compatibility shim.
- Existing user `rudi.db` files are never automatically deleted. The CLI simply
  stops reading, writing, importing into, repairing, or supervising work from
  them.
- Studio can continue using the isolated compatibility package during its own
  migration, without pulling legacy session ownership back into the CLI or
  daemon.
- Agent Host can retain enough normalized event content for bounded reconnects
  and durable launch artifacts without becoming the authoritative transcript
  store.

## Invariants

- Provider-native transcripts and sessions are authoritative.
- `agent-hosts.db` contains launch/group lifecycle projection only, never
  prompts, transcript bodies, or imported provider histories.
- Reconnect event retention is explicitly bounded and is not a transcript
  archive.
- Groups never merge provider session identity or workspace ownership.
- The daemon supervises RUDI-owned detached workers and local capability jobs;
  it does not own provider model loops or resurrect legacy session
  orchestration.
- The CLI runtime has no dependency on `packages/db` or `rudi.db` after the
  retirement.
