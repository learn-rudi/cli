# RUDI CLI

Local capability CLI, daemon lifecycle manager, and MCP router. Node.js, plain
JavaScript. See `AGENTS.md` for the complete repository contract.

RUDI owns installed tools, secrets, MCP/index state, durable artifacts, safe
workspaces, and bounded detached-launch lifecycle. Native agent hosts own model
execution, sessions, transcripts, and provider-native orchestration.

## Common Commands

```bash
rudi search --all
rudi install <package>
rudi list [kind]
rudi run <stack>
rudi secrets list
rudi integrate claude
rudi skills sync claude
rudi index --json
rudi agent hosts
rudi agent launch claude --workspace . --prompt-file task.md
rudi daemon status
```

Default help separates core, advanced, internal, and retired command names.
Retired `db`, `session`, `import`, `parallel`, `run-group`, `project`, `apply`,
and `logs` names only print migration notices and exit nonzero. Their runtime,
routes, schemas, and templates were removed.

## Architecture

```text
src/index.js
├── commands/       CLI adapters
├── agent-host/     native-provider launch and workspace core
├── daemon/         loopback capability and Agent Host API
├── router-mcp.js   installed-stack MCP router
└── packages/       reusable core/env/runner/MCP packages
```

- Foreground Agent Host work is daemon-independent.
- Detached work uses dedicated RUDI workers and `/agent-host/v1`.
- Provider-native transcripts remain authoritative.
- The daemon connection files are `~/.rudi/daemon.port` and
  `~/.rudi/daemon.token`; authenticated requests use `x-rudi-token`.
- `packages/db` is isolated for Studio compatibility. CLI production code must
  not import it or open `~/.rudi/rudi.db`.
- The current API contract is `docs/daemon/openapi.json`, generated from
  `src/contracts/daemon-openapi.js`.

## Development

```bash
pnpm test
pnpm build
node scripts/agent-debt-runner.mjs --changed-since origin/main --no-log
npm pack --dry-run
```

Keep CLI/HTTP modules as validation and translation adapters. Preserve argv
arrays, input bounds, ownership checks, authenticated loopback access, and
idempotent lifecycle behavior. Do not add a RUDI-owned agent execution engine,
transcript store, or compatibility sidecar.
