# RUDI CLI

Universal tool manager for MCP stacks, CLI tools, runtimes, and AI agents.

## Install

```bash
npm i -g @learnrudi/cli
```

Requires Node.js 18+. The postinstall step bootstraps `~/.rudi` and creates shims.

## Quick Start

```bash
# Install any npm CLI tool
rudi install npm:typescript
rudi install npm:@stripe/cli
rudi install npm:vercel

# Install curated stacks and tools
rudi install slack
rudi install binary:ffmpeg
rudi install binary:supabase

# All tools available via ~/.rudi/bins/
tsc --version
ffmpeg -version
supabase --version

# Configure secrets for stacks
rudi secrets set SLACK_BOT_TOKEN "xoxb-your-token"

# Wire up your AI agents
rudi integrate all
```

## Features

### Universal Tool Installation

RUDI supports multiple installation paths:

```bash
# Dynamic npm packages (any npm CLI)
rudi install npm:cowsay
rudi install npm:typescript
rudi install npm:@railway/cli

# Curated registry (stacks and binaries with docs)
rudi install slack              # MCP stack
rudi install binary:ffmpeg      # Upstream binary
rudi install binary:supabase    # npm-based CLI

# All tools resolve through ~/.rudi/bins/
```

### Shim-First Architecture

Every installed tool gets a shim in `~/.rudi/bins/`:

```bash
# Add to your shell profile (.bashrc, .zshrc)
export PATH="$HOME/.rudi/bins:$PATH"

# Then use tools directly
tsc --version      # → ~/.rudi/bins/tsc
ffmpeg -version    # → ~/.rudi/bins/ffmpeg
supabase --help    # → ~/.rudi/bins/supabase
```

### Security by Default

npm packages run with `--ignore-scripts` by default:

```bash
# Safe install (scripts skipped)
rudi install npm:some-package

# If CLI fails, opt-in to scripts
rudi install npm:some-package --allow-scripts
```

## Commands

```bash
# Search and install
rudi search <query>         # Search for packages
rudi search --all           # List all packages
rudi install <pkg>          # Install a package
rudi install npm:<pkg>      # Install any npm CLI
rudi remove <pkg>           # Remove a package

# List and inspect
rudi list [kind]            # List installed (stacks, binaries, agents)
rudi pkg <id>               # Show package details and shim status
rudi shims list             # List all shims
rudi shims check            # Validate shim targets

# Secrets and integration
rudi secrets list           # Show configured secrets
rudi secrets set <key>      # Set a secret
rudi integrate <agent>      # Wire stack to agent config

# Maintenance
rudi update [pkg]           # Update packages
rudi doctor                 # Check system health
```

## How It Works

### Installing a Package

```bash
rudi install npm:typescript
```

1. Resolves package from npm registry
2. Creates install directory at `~/.rudi/binaries/npm/typescript/`
3. Runs `npm install typescript --ignore-scripts`
4. Discovers binaries from package.json (`tsc`, `tsserver`)
5. Creates wrapper shims in `~/.rudi/bins/`
6. Records ownership in shim registry

### Installing an MCP Stack

```bash
rudi install slack
```

1. Downloads stack tarball from registry
2. Extracts to `~/.rudi/stacks/slack/`
3. Runs `npm install` for dependencies
4. Shows which secrets need configuration
5. Ready for `rudi integrate` to wire to agents

### Running MCP Stacks

When an AI agent runs a stack:

1. Agent config points to `~/.rudi/bins/rudi-mcp`
2. RUDI loads secrets from `~/.rudi/secrets.json`
3. Injects secrets as environment variables
4. Runs the MCP server with bundled runtime

## Directory Structure

```
~/.rudi/
├── bins/             # Shims for all tools (add to PATH)
├── stacks/           # Installed MCP stacks
├── binaries/         # Installed CLI tools
│   ├── ffmpeg/       # Upstream binary
│   ├── supabase/     # npm-based CLI
│   └── npm/          # Dynamic npm packages
│       ├── typescript/
│       └── cowsay/
├── runtimes/         # Bundled Node.js, Python
├── agents/           # AI agent CLIs
├── secrets.json      # Encrypted secrets
├── shim-registry.json # Shim ownership tracking
└── rudi.db           # Local database
```

## Available Packages

### MCP Stacks

| Stack | Description |
|-------|-------------|
| slack | Send messages, search channels, manage reactions |
| google-workspace | Gmail, Sheets, Docs, Drive, Calendar |
| notion-workspace | Pages, databases, search |
| google-ai | Gemini, Imagen, Veo |
| openai | DALL-E, Whisper, TTS, Sora |
| postgres | PostgreSQL database queries |
| video-editor | ffmpeg-based video editing |
| github | Issues, PRs, repos, actions |
| stripe | Payments, subscriptions, invoices |

### Binaries

| Binary | Description |
|--------|-------------|
| ffmpeg | Video/audio processing |
| ripgrep | Fast search |
| supabase | Supabase CLI |
| vercel | Vercel CLI |
| uv | Fast Python package manager |

### Dynamic npm

Any npm package with a `bin` field works:

```bash
rudi install npm:typescript    # tsc, tsserver
rudi install npm:cowsay        # cowsay, cowthink
rudi install npm:@stripe/cli   # stripe
rudi install npm:netlify-cli   # netlify
```

## Links

- Website: https://learnrudi.com
- Registry: https://github.com/learn-rudi/registry
- Issues: https://github.com/learn-rudi/cli/issues
