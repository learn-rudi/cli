# ADR 0002: External Agent CLI Ownership

Date: 2026-08-23

Status: Implemented in source

## Context

RUDI Lite and RUDI Studio originally supported a turnkey appliance model in
which RUDI could install Codex, Claude, Gemini, and other agent CLIs into a
RUDI-managed Node runtime. That model mixed two different responsibilities:
RUDI's local capability infrastructure and each provider's agent software,
authentication, update channel, and model execution.

RUDI still needs stable Node and Python runtimes on always-on machines. Those
runtimes execute the CLI, MCP router, installed tools, and stack servers. They
do not need to own provider Agent Host installations.

## Decision

Provider CLIs are external prerequisites owned by their vendors.

- Providers install, update, and authenticate their own CLIs.
- RUDI discovers supported vendor/system locations, validates readiness, and
  launches the selected native host.
- `rudi install agent:*` is rejected before any manifest, package, or shim is
  created.
- `rudi status`, `rudi check agent:*`, `rudi list agents`, and
  `rudi agent hosts` use the native Agent Host inspection boundary.
- Runnable Agent Host IDs are `antigravity`, `claude`, `codex`, and `gemini`;
  `google` remains an input alias for `antigravity`, while machine-readable
  inventory emits the canonical ID.
- RUDI shim rebuilds do not create agent shims from legacy manifests.
- RUDI-managed Node and Python remain supported for RUDI tools and MCP stacks.
- Agent Host subprocess environments do not inject RUDI's Node or Python
  runtime directories; shebang-based provider CLIs resolve the runtime supplied
  by their own installation or the user's inherited environment.
- A missing or unauthenticated provider fails closed. RUDI does not install a
  substitute or silently choose another provider.

Registry `agent:*` records remain useful as discovery and installation-guidance
metadata, but they are system-delivered and not installable RUDI packages.
The old `agent:copilot` record is removed because no governed Copilot adapter or
readiness contract exists; cataloging it would falsely imply runnable support.

## Migration

Existing `~/.rudi/agents` metadata, RUDI runtime packages, and old shims are not
automatically deleted. The agent directory is legacy compatibility state:
normal status, package inventory, initialization, doctor checks, and shim
rebuilds no longer use it as executable authority. Explicit legacy removal
support remains available for a separately approved cleanup.

Users install the selected vendor CLI, authenticate it with the vendor, then
run `rudi agent hosts --json` and the relevant `rudi integrate` command.

## Consequences

- RUDI is a capability and integration layer, not a turnkey agent appliance.
- Agent updates and authentication follow vendor-supported paths.
- RUDI's runtime lifecycle can evolve independently from provider CLI releases.
- Archived Lite/Studio-era agent artifacts can be retired without affecting
  RUDI's Node/Python-backed tools and MCP services.

## Invariants

- Provider CLIs own model execution, sessions, authentication, and updates.
- RUDI owns local tools, secrets mediation, MCP routing, indexes, artifacts,
  and its language runtimes.
- No RUDI runtime path is an Agent Host discovery candidate.
- No RUDI runtime path is injected into an Agent Host subprocess `PATH`.
- No agent package installation writes under `~/.rudi/agents`.
- No provider fallback occurs when a requested host is unavailable.
