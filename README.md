# RUDI CLI

A universal tool manager for MCP stacks, CLI tools, runtimes, and AI agents.

RUDI provides a unified installation and management system for:
- **MCP Stacks** - Model Context Protocol servers for Claude, Codex, and Gemini
- **CLI Tools** - Any npm package or upstream binary (ffmpeg, ripgrep, etc.)
- **Runtimes** - Node.js, Python, Deno, Bun
- **AI Agents** - Claude Code, Codex CLI, Gemini CLI, Antigravity CLI

## Installation

```bash
npm install -g @learnrudi/cli
```

Requires Node.js 18 or later. The installer creates `~/.rudi/`.

Shims are opt-in. If you want PATH exposure for installed tools:

```bash
rudi shims rebuild
export PATH="$HOME/.rudi/bins:$PATH"
```

## Core Concepts

### Shim-Based Architecture

When you opt in (`rudi shims rebuild`), tools installed through RUDI get a wrapper script (shim) in `~/.rudi/bins/`. This provides:

- Clean PATH integration without modifying system directories
- Version isolation per package
- Ownership tracking for clean uninstalls
- Consistent invocation across different package sources

When you run `tsc`, the shell finds `~/.rudi/bins/tsc`, which delegates to the actual TypeScript installation at `~/.rudi/binaries/npm/typescript/node_modules/.bin/tsc`.

### Package Sources

RUDI supports three installation sources:

1. **Dynamic npm** (`npm:<package>`) - Any npm package with a `bin` field
2. **Curated Registry** - Pre-configured stacks and binaries with documentation
3. **Upstream Binaries** - Direct downloads from official sources

### Secret Management

MCP stacks often require API keys and tokens. RUDI stores secrets in `~/.rudi/secrets.json` (mode 0600) and injects them as environment variables when running stacks. Secrets are never exposed in process listings or logs.

## Usage

### Installing Packages

```bash
# Install any npm CLI tool
rudi install npm:typescript       # Installs tsc, tsserver
rudi install npm:@stripe/cli      # Installs stripe
rudi install npm:vercel           # Installs vercel

# Install from curated registry
rudi install slack                # MCP stack for Slack
rudi install binary:ffmpeg        # Upstream ffmpeg binary
rudi install binary:supabase      # Supabase CLI

# Install with scripts enabled (when needed)
rudi install npm:puppeteer --allow-scripts

# Optional: create shims immediately (opt-in)
rudi install binary:ffmpeg --with-shims
```

### Listing Installed Packages

```bash
rudi list                # All installed packages
rudi list stacks         # MCP stacks only
rudi list binaries       # CLI tools only
rudi list runtimes       # Language runtimes
rudi list agents         # AI agent CLIs
```

### Searching the Registry

```bash
rudi search pdf          # Search for packages
rudi search --all        # List all available packages
rudi search --stacks     # Filter to MCP stacks
rudi search --binaries   # Filter to CLI tools
```

### Managing Secrets

```bash
rudi secrets list                      # Show configured secrets (masked)
rudi secrets set SLACK_BOT_TOKEN       # Set a secret (prompts for value)
rudi secrets set OPENAI_API_KEY "sk-..." # Set with value
rudi secrets get OPENAI_API_KEY        # Print raw value for scripts only
rudi secrets remove SLACK_BOT_TOKEN    # Remove a secret
```

### Discovering CRM Contacts from Gmail

Sweep a bounded window from one explicitly selected authenticated account. The
default preview writes a private JSON artifact and does not change CRM state:

```bash
rudi crm sweep-gmail \
  --account operator@example.com \
  --after 2026-01-01 \
  --before 2026-08-05
```

After reviewing the preview, `--record` stores idempotent header observations in
CRM discovery and runs its validators. Neither mode creates, merges, or attaches
CRM people. The sweep reads address headers only and excludes spam and trash.

### Integrating with AI Agents

See [Frontier Agent Hosts](docs/frontier-agent-hosts.md) for the complete
Claude, Codex, Antigravity, and Gemini headless command matrix, current model
aliases, resume/workspace/JSON controls, and the Google authentication split.

```bash
rudi shims rebuild     # Create rudi-router and rudi-mcp shims (opt-in)
rudi integrate claude      # Add the RUDI router to Claude config
rudi integrate codex       # Add the RUDI router to Codex config
rudi integrate gemini      # Add the RUDI router to Gemini config
rudi integrate antigravity # Add the RUDI router to Antigravity config
rudi integrate all         # Add the router to all detected agents
```

This modifies the agent's MCP configuration to include one managed RUDI router;
stack discovery and secret injection stay inside RUDI.

Every registry stack declares a primary operator skill. A normal stack install
installs that skill automatically and creates a native wrapper for detected
Codex and Claude hosts without overwriting an existing wrapper. Additional
companion workflows remain optional:

```bash
rudi install stack:video-editor                 # operator skill included
rudi install stack:video-editor --with-related-skills # include companions
rudi install stack:video-editor --no-related-skills   # operator only
```

In Claude Code, invoke the operator as `/skill-name`. In Codex, use `/skills`
to select it or mention it as `$skill-name`. The operator guides the host
through the stack's MCP tools; users do not need to know the individual tool
names.

Each native host has its own skill directory. After installing RUDI skills,
sync editable native wrappers when you want them to appear in the host's
skill/slash UI:

```bash
rudi skills sync codex
rudi skills sync claude
rudi skills sync gemini
rudi skills sync antigravity
rudi skills sync codex --force   # overwrite existing generated wrappers
rudi skills sync claude --force  # overwrite existing generated wrappers
```

### Running Headless Agent Hosts

`rudi agent` is the supported headless execution surface. Foreground launches
run directly through the shared CLI core and require no daemon. Native
providers continue to own their complete transcripts; RUDI stores only a
bounded launch/workspace projection and durable launch artifacts.

```bash
# Inspect native installations, auth, RUDI router wiring, skills, and versions
rudi agent hosts
rudi agent models claude
rudi agent models codex
rudi agent models google
rudi agent models gemini

# Writable Git projects automatically receive a dedicated worktree
rudi agent launch codex \
  --workspace . \
  --prompt "Fix the failing tests"

# Read-only work uses the project directly
rudi agent launch claude \
  --workspace . \
  --read-only \
  --prompt-file task.md

# stdin and provider-specific argv are supported
printf '%s' "Explain this repository" | \
  rudi agent launch google --workspace . --read-only --json

rudi agent launch codex \
  --workspace . \
  --prompt "Review the installer" \
  -- --strict-config

# Resume the same provider-owned native session
rudi agent resume <launch-id> --prompt "Continue with the next failure"

# Inspect minimal persisted launch projections
rudi agent list --json
rudi agent status <launch-id> --json
```

Workspace defaults fail closed:

| Project | Access | Execution workspace |
| --- | --- | --- |
| Git repository | Writable | New Git worktree |
| Git repository | Read-only | Project root directly |
| Non-Git directory | Writable | Isolated copied workspace |
| Non-Git directory | Read-only | Directory directly |

RUDI never initializes Git, never falls back to `$HOME`, and never degrades a
failed isolated write launch into shared write access. Detached launches,
reconnect, stop, diff, promote/discard, and provider-neutral groups use the
local background service and dedicated workers:

```bash
rudi agent launch codex --workspace . --prompt-file task.md --detach
rudi agent attach <launch-id>
rudi agent diff <launch-id>
rudi agent promote <launch-id>   # or: rudi agent discard <launch-id>

rudi agent group launch \
  --workspace . \
  --task claude:security.md \
  --task codex:implementation.md \
  --task google:ux.md \
  --detach
```

These dedicated workers survive terminal closure and daemon restarts. The
versioned Agent Host service is a control plane, not the owner or source of
truth for provider sessions or transcripts.

### Inspecting Packages

```bash
rudi pkg slack           # Show package details
rudi pkg npm:typescript  # Show shims and paths

rudi shims list          # List all shims
rudi shims check         # Validate shim targets exist
```

### Maintenance

```bash
rudi update              # Update all packages
rudi update stack:slack  # Reinstall a specific stack and rebuild its tool index
rudi update stack:slack --preserve-state  # Opt in to preserving install-local state paths
rudi remove slack        # Uninstall a package
rudi doctor              # Check system health
```

### Retired Commands

Names from the removed imported-session and RUDI-owned execution architecture
remain visible only as migration notices. They exit nonzero and never load
legacy runtime code:

```bash
rudi help db          # Existing rudi.db is preserved but not opened
rudi help session     # Use the provider-native transcript
rudi help parallel    # Use native orchestration or rudi agent group
rudi help run-group   # Use rudi agent group
```

Removed `/agent/*` and `/sessions/*` endpoints have no compatibility adapter.
Core CLI and daemon paths do not initialize, open, repair, or require
`rudi.db`.

## Directory Structure

```
~/.rudi/
├── stacks/               # Installed MCP stack package code
├── skills/               # Installed reusable skill definitions
├── workflows/            # Installed workflow definitions
├── runtimes/             # Managed language runtimes
├── binaries/             # Managed third-party CLI tools
├── agents/               # Managed AI agent CLI installations
│
├── bins/                 # Current command shims and router entrypoints
├── shims/                # Legacy shim directory for older integrations
├── router/               # Local MCP router and permission-hook runtime files
│
├── state/                # Persistent per-stack runtime state
│   ├── agent-hosts.db    # Minimal Agent Host lifecycle projection
│   └── stacks/
│       └── google-workspace/
│           └── accounts/ # OAuth tokens and selected account state
├── secrets/              # Stack-specific secret/env files
├── secrets.json          # Primary secret store (mode 0600)
│
├── rudi.json             # Installed package and stack configuration
├── settings.json         # Local settings
├── shim-registry.json    # Shim ownership tracking
│
├── cache/                # Rebuildable registry/package/tool-index cache
├── locks/                # Package install lock files
├── logs/                 # Daemon and runtime logs
├── artifacts/
│   └── agent-launches/   # Per-launch worktrees or isolated copied workspaces
├── notes/                # Local user artifacts from RUDI workflows
├── archive/              # Manual cleanup archives
├── prompts/              # Legacy prompt directory; new assets map to skills/
│
├── rudi.db               # Retired session data; preserved and never opened by CLI
├── rudi.db-wal           # Retired SQLite journal, if already present
├── rudi.db-shm           # Retired SQLite shared memory, if already present
├── daemon.port           # Active loopback daemon port (mode 0600)
└── daemon.token          # Active loopback daemon token (mode 0600)
```

Use `rudi home` for a lifecycle-oriented view of this tree. It labels each path
as installed code, persistent state, secret material, generated cache,
operational logs, or retired preserved data. Use `rudi home --json` for
machine-readable output. Core commands do not create or open `rudi.db`.

## How MCP Integration Works

When you run `rudi integrate claude`, RUDI:

1. Reads the target host's MCP configuration.
2. Writes one `rudi` server entry pointing to `~/.rudi/bins/rudi-router`.
3. Removes obsolete direct RUDI stack entries that the managed router replaces.

When Claude invokes the MCP server:

1. `rudi-router` loads the generated tool index from
   `~/.rudi/cache/tool-index.json`.
2. It maps the requested tool to its installed stack.
3. It loads only that stack's declared secrets and injects them as environment
   variables.
4. It launches the stack MCP server and proxies the request/response.

This architecture means secrets stay local and are never written to agent config files.

## Security Model

### npm Package Installation

By default, npm packages install with `--ignore-scripts` to prevent arbitrary code execution during install. If a package requires lifecycle scripts (e.g., native compilation), use:

```bash
rudi install npm:puppeteer --allow-scripts
```

### Secret Storage

Secrets are stored in `~/.rudi/secrets.json` with file permissions `0600` (owner read/write only). This matches the security model used by SSH, AWS CLI, and other credential stores.

### Shim Isolation

Each package installs to its own directory. Shims are thin wrappers that set up the environment and delegate to the real binary. This prevents packages from interfering with each other.

## Available Stacks

The registry inventory changes independently of the CLI. Discover the current
catalog instead of relying on a checked-in list:

```bash
rudi search --all --stacks
```

When a registry package declares lifecycle metadata, package search, listings,
and `rudi info` show its maturity, support posture, and any deprecation,
replacement, or removal guidance. Packages without lifecycle metadata are
unclassified; the CLI does not infer support from version numbers.

## Available Binaries

| Binary | Description | Source |
|--------|-------------|--------|
| ffmpeg | Video/audio processing | Upstream |
| ripgrep | Fast text search | Upstream |
| supabase | Supabase CLI | npm |
| vercel | Vercel CLI | npm |
| uv | Python package manager | Upstream |

## Troubleshooting

### Command not found after install

Ensure `~/.rudi/bins` is in your PATH:

```bash
echo $PATH | grep -q '.rudi/bins' && echo "OK" || echo "Add ~/.rudi/bins to PATH"
```

### Shim points to missing target

Run `rudi shims check` to validate all shims. If a target is missing, reinstall the package:

```bash
rudi remove npm:typescript
rudi install npm:typescript
```

### MCP stack not appearing in agent

1. Check the stack is installed: `rudi list stacks`
2. Run integration: `rudi integrate claude`
3. Restart the AI agent application

### Permission denied on secrets

Ensure correct permissions:

```bash
chmod 600 ~/.rudi/secrets.json
```

## Links

- Documentation: https://learnrudi.github.io/cli/
- Repository: https://github.com/learnrudi/cli
- Registry: https://github.com/learnrudi/registry
- npm: https://www.npmjs.com/package/@learnrudi/cli
- Issues: https://github.com/learnrudi/cli/issues

## License

MIT
