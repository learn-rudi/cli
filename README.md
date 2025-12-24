# pstack CLI

Package manager for Prompt Stack workflows. Search, install, and execute stacks from the command line.

## Installation

```bash
npm install -g @prompt-stack/cli
```

Verify installation:

```bash
pstack --version
```

## Quick Start

Search for stacks:

```bash
pstack search youtube
```

Install a stack:

```bash
pstack install youtube-summarizer
```

Run a stack:

```bash
pstack run youtube-summarizer --url "https://youtube.com/watch?v=dQw4w9WgXcQ"
```

## Commands

### Search and Discovery

```bash
pstack search <query>          # Search registry for stacks, prompts, runtimes
pstack search --all            # List all available packages
pstack info <package>          # Show package manifest, inputs, outputs
```

### Installation

```bash
pstack install <package>       # Install a package (stack, prompt, or runtime)
pstack list                    # Show installed packages
pstack remove <package>        # Uninstall a package
pstack update [package]        # Update all or a specific package
```

### Execution

```bash
pstack run <stack>             # Execute a stack with defaults
pstack run <stack> --input '{...}'  # Execute with JSON inputs
pstack run <stack> --cwd /path # Execute in specific directory
```

### Database

```bash
pstack db init                 # Initialize local database
pstack db search <query>       # Search execution history
pstack db sessions             # List all sessions
pstack db stats                # Show usage statistics and costs
```

### Secrets Management

```bash
pstack secrets set <name>      # Add a secret
pstack secrets list            # Show configured secrets (masked)
pstack secrets remove <name>   # Remove a secret
```

### System

```bash
pstack doctor                  # Check installation health
pstack which <runtime>         # Show path to installed runtime
pstack --help                  # Show help
pstack --version               # Show version
```

## Environment

Create a `.pstackrc` in your home directory for defaults:

```bash
# ~/.pstackrc
export PSTACK_AGENT="claude"           # Default AI agent
export PSTACK_REGISTRY="https://..."   # Custom registry URL
export PSTACK_CACHE_TTL=86400          # Registry cache duration (seconds)
```

Secrets are stored in:

```
~/.prompt-stack/secrets.json           # Encrypted or plaintext (power user managed)
```

## Examples

### Example 1: Summarize a YouTube Video

```bash
pstack install youtube-summarizer
pstack run youtube-summarizer --url "https://youtube.com/watch?v=..."
```

Output is saved to `~/.prompt-stack/artifacts/`.

### Example 2: Review Code with Multiple Models

```bash
pstack install code-reviewer
pstack run code-reviewer --file "./src/main.ts" --compare-models
```

Results show Claude vs Codex vs Gemini analysis side-by-side.

### Example 3: Search Execution History

```bash
pstack db search "processed yesterday"
```

Returns all runs from the past day with metadata.

## Architecture

The CLI is a thin wrapper around `@prompt-stack/core`:

- **@prompt-stack/core**: Resolver, installer, registry client
- **@prompt-stack/runner**: Execution engine
- **@prompt-stack/manifest**: Stack/prompt manifest parsing

All logic is shared with Prompt Stack Studio, ensuring consistency.

## Configuration

Default paths:

```
~/.prompt-stack/
├── packages/          # Installed stacks, prompts, runtimes
├── db/                # SQLite databases
├── cache/             # Registry cache
├── secrets.json       # Encrypted secrets
└── locks/             # Version lockfiles
```

## Exit Codes

- `0`: Success
- `1`: General error (invalid input, missing package, execution failure)
- `2`: Configuration error (missing secrets, invalid manifest)
- `127`: Runtime not found

## Troubleshooting

### Command Not Found

If `pstack` is not in PATH:

```bash
# Manually add to shell config
echo 'export PATH="$HOME/.prompt-stack/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Missing Secrets

Before running, ensure required secrets are set:

```bash
pstack secrets set OPENAI_API_KEY
pstack secrets set ANTHROPIC_API_KEY
```

### Check System Health

```bash
pstack doctor

# Output:
# ✓ CLI installed: ~/.prompt-stack/bin/pstack
# ✓ PATH configured: ~/.zshrc
# ✓ Database: ~/.prompt-stack/db/pstack.db
# ✗ Missing secret: OPENAI_API_KEY
```

## Contributing

To contribute:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for details.

## License

MIT
