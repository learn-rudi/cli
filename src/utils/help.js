/**
 * Help and version display
 */

export function printVersion(version) {
  console.log(`pstack v${version}`);
}

export function printHelp(topic) {
  if (topic) {
    printCommandHelp(topic);
    return;
  }

  console.log(`
pstack - Prompt Stack CLI

USAGE
  pstack <command> [options]

COMMANDS
  search <query>        Search for stacks, prompts, and runtimes
  search --all          List all available packages in registry
  install <pkg>         Install a package (stack, prompt, or runtime)
  remove <pkg>          Remove an installed package
  update [pkg]          Update packages (or all if no pkg specified)
  run <stack> [args]    Run a stack with optional arguments
  list [kind]           List installed packages (stacks, prompts, runtimes)

  secrets set <name>    Set a secret
  secrets list          List configured secrets (masked)
  secrets remove <name> Remove a secret

  db stats              Show database statistics
  db search <query>     Search conversation history

  doctor                Check system health and configuration

OPTIONS
  -h, --help           Show help
  -v, --version        Show version
  --verbose            Verbose output
  --json               Output as JSON
  --force              Force operation (skip confirmations)

EXAMPLES
  pstack search pdf              Search for PDF-related stacks
  pstack install pdf-creator     Install the pdf-creator stack
  pstack run pdf-creator         Run the pdf-creator stack
  pstack list stacks             List installed stacks
  pstack secrets set VERCEL_KEY  Set a secret

PACKAGE NAMESPACES
  stack:name           A stack (executable workflow)
  prompt:name          A prompt template
  runtime:name         A runtime environment

  If no namespace is given, 'stack:' is assumed.
`);
}

function printCommandHelp(command) {
  const help = {
    search: `
pstack search - Search the registry

USAGE
  pstack search <query> [options]

OPTIONS
  --kind <type>    Filter by kind: stack, prompt, runtime
  --json           Output as JSON

EXAMPLES
  pstack search pdf
  pstack search deploy --kind stack
  pstack search brainstorm --kind prompt
`,
    install: `
pstack install - Install a package

USAGE
  pstack install <package> [options]

OPTIONS
  --force          Force reinstall
  --json           Output as JSON

EXAMPLES
  pstack install pdf-creator
  pstack install stack:youtube-extractor
  pstack install runtime:python
`,
    run: `
pstack run - Execute a stack

USAGE
  pstack run <stack> [options]

OPTIONS
  --input <json>   Input parameters as JSON
  --cwd <path>     Working directory
  --verbose        Show detailed output

EXAMPLES
  pstack run pdf-creator
  pstack run pdf-creator --input '{"file": "doc.html"}'
`,
    list: `
pstack list - List installed packages

USAGE
  pstack list [kind]

ARGUMENTS
  kind             Filter: stacks, prompts, runtimes (or: stack, prompt, runtime)

OPTIONS
  --json           Output as JSON

EXAMPLES
  pstack list
  pstack list stacks
  pstack list runtimes
`,
    secrets: `
pstack secrets - Manage secrets

USAGE
  pstack secrets <command> [args]

COMMANDS
  set <name>       Set a secret (prompts for value)
  list             List configured secrets (values masked)
  remove <name>    Remove a secret
  export           Export secrets as environment variables

EXAMPLES
  pstack secrets set VERCEL_TOKEN
  pstack secrets list
  pstack secrets remove GITHUB_TOKEN
`,
    db: `
pstack db - Database operations

USAGE
  pstack db <command> [args]

COMMANDS
  stats            Show usage statistics
  search <query>   Search conversation history
  init             Initialize or migrate database

EXAMPLES
  pstack db stats
  pstack db search "authentication bug"
`,
    doctor: `
pstack doctor - System health check

USAGE
  pstack doctor [options]

OPTIONS
  --fix            Attempt to fix issues

CHECKS
  - Directory structure
  - Database integrity
  - Installed packages
  - Required runtimes
  - Secrets configuration
`
  };

  if (help[command]) {
    console.log(help[command]);
  } else {
    console.log(`No help available for '${command}'`);
    console.log(`Run 'pstack help' for available commands`);
  }
}
