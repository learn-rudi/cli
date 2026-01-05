# pstack

Package manager for MCP stacks. Install tools that work with Claude, Codex, and Gemini.

## Install

```bash
npm i -g @prompt-stack/cli
```

## Quick Start

```bash
# See what's available
pstack search --all

# Install a stack
pstack install stack:slack

# Add your API key
nano ~/.prompt-stack/stacks/slack/.env

# Done - Claude/Codex/Gemini can now use Slack tools
```

## Commands

```bash
pstack search <query>      # Search for packages
pstack search --all        # List all packages
pstack install <pkg>       # Install a package
pstack remove <pkg>        # Remove a package
pstack list [kind]         # List installed (stacks, runtimes, tools, agents)
pstack update [pkg]        # Update packages
pstack doctor              # Check system health
```

## Available Stacks

| Stack | Description | Auth |
|-------|-------------|------|
| `stack:postgres` | Query PostgreSQL databases | DATABASE_URL |
| `stack:slack` | Send messages, search channels | SLACK_BOT_TOKEN |
| `stack:notion-workspace` | Pages, databases, search | NOTION_API_KEY |
| `stack:google-workspace` | Gmail, Sheets, Docs, Drive, Calendar | OAuth |
| `stack:google-ai` | Gemini, Imagen, Veo | GOOGLE_AI_API_KEY |
| `stack:openai` | DALL-E, Whisper, TTS, Sora | OPENAI_API_KEY |
| `stack:zoho-mail` | Email via Zoho | OAuth |
| `stack:content-extractor` | YouTube, Reddit, TikTok transcripts | - |
| `stack:video-editor` | Trim, speed, compress videos | - |
| `stack:ms-office` | Read Word/Excel files | - |
| `stack:whisper` | Local audio transcription | - |

## Secrets

Each stack has its own `.env` file:

```
~/.prompt-stack/stacks/<stack>/.env
```

When you install a stack, a `.env` is created with placeholders. Add your keys:

```bash
# ~/.prompt-stack/stacks/postgres/.env
DATABASE_URL=postgresql://user:pass@host:5432/db
```

Secrets are automatically injected into Claude, Codex, and Gemini configs.

## How It Works

1. `pstack install stack:slack` downloads the MCP server
2. Creates `.env` with required secrets as placeholders
3. Registers the MCP server in `~/.claude/settings.json`, `~/.codex/config.toml`, `~/.gemini/settings.json`
4. You fill in the API key in `.env`
5. Claude/Codex/Gemini can now use the tools

## Data Location

```
~/.prompt-stack/
├── stacks/           # MCP servers (each with .env)
├── runtimes/         # Node, Python, Deno
├── tools/            # ffmpeg, ripgrep, etc.
├── agents/           # Claude, Codex, Gemini CLIs
└── prompt-stack.db   # Local database
```

## License

MIT
