# RUDI CLI

Package manager for RUDI - install stacks, manage secrets, run workflows.

## Commands

```bash
rudi search <query>     # Search registry
rudi search --all       # List all available packages
rudi install <pkg>      # Install a stack/runtime/tool
rudi remove <pkg>       # Uninstall a package
rudi list [kind]        # List installed (stacks, runtimes, tools, agents)
rudi run <stack>        # Run a stack
rudi secrets            # Manage secrets
rudi update [pkg]       # Update packages
rudi import sessions    # Import sessions from Claude, Codex, Gemini
rudi doctor             # Check system health
```

## Architecture

```
src/index.js → commands/*.js
      ↓
@learnrudi/env         # PATHS, platform detection
@learnrudi/core        # db, installer, resolver
@learnrudi/registry-client  # fetch from GitHub
      ↓
~/.rudi/
├── stacks/               # Installed MCP stacks
├── runtimes/             # Node, Python, Deno
├── binaries/             # ffmpeg, ripgrep, etc.
├── agents/               # Claude, Codex, Gemini CLIs
└── rudi.db               # Shared with Studio
```

## Registry

- Index: `https://raw.githubusercontent.com/learn-rudi/registry/main/index.json`
- Binaries: `https://github.com/learn-rudi/registry/releases/download/v1.0.0/`
- Local dev fallback: `/Users/hoff/dev/rudi/registry/index.json`

## Development

```bash
cd /Users/hoff/dev/rudi/cli
npm link                  # Add rudi to PATH
rudi search --all         # Test
```
