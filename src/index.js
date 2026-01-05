#!/usr/bin/env node
/**
 * PSTACK CLI v2.0.0 - Prompt Stack Command Line Interface
 *
 * Commands:
 *   pstack                     Dashboard / interactive mode
 *   pstack search <query>      Search registry for stacks/prompts
 *   pstack install <pkg>       Install a package
 *   pstack run <stack>         Run a stack
 *   pstack list [kind]         List installed packages
 *   pstack remove <pkg>        Remove a package
 *   pstack update [pkg]        Update packages
 *   pstack secrets <cmd>       Manage secrets
 *   pstack runtimes <cmd>      Manage runtimes
 *   pstack db <cmd>            Database operations
 *   pstack logs [options]      Query observability logs
 *   pstack doctor              Health check
 */

import { parseArgs } from './utils/args.js';
import { printHelp, printVersion } from './utils/help.js';

// Commands
import { cmdSearch } from './commands/search.js';
import { cmdInstall } from './commands/install.js';
import { cmdRun } from './commands/run.js';
import { cmdList } from './commands/list.js';
import { cmdRemove } from './commands/remove.js';
import { cmdSecrets } from './commands/secrets.js';
import { cmdDb } from './commands/db.js';
import { cmdDoctor } from './commands/doctor.js';
import { cmdUpdate } from './commands/update.js';
import { cmdLogs } from './commands/logs.js';

const VERSION = '2.0.0';

async function main() {
  const { command, args, flags } = parseArgs(process.argv.slice(2));

  // Global flags
  if (flags.version || flags.v) {
    printVersion(VERSION);
    process.exit(0);
  }

  if (flags.help || flags.h) {
    printHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'search':
        await cmdSearch(args, flags);
        break;

      case 'install':
      case 'i':
      case 'add':
        await cmdInstall(args, flags);
        break;

      case 'run':
      case 'exec':
        await cmdRun(args, flags);
        break;

      case 'list':
      case 'ls':
        await cmdList(args, flags);
        break;

      case 'remove':
      case 'rm':
      case 'uninstall':
        await cmdRemove(args, flags);
        break;

      case 'secrets':
      case 'secret':
        await cmdSecrets(args, flags);
        break;

      case 'db':
      case 'database':
        await cmdDb(args, flags);
        break;

      case 'doctor':
      case 'check':
        await cmdDoctor(args, flags);
        break;

      case 'update':
      case 'upgrade':
        await cmdUpdate(args, flags);
        break;

      case 'logs':
        await cmdLogs(args, flags);
        break;

      case 'help':
        printHelp(args[0]);
        break;

      case 'version':
        printVersion(VERSION);
        break;

      default:
        if (!command) {
          // No command - show dashboard or help
          printHelp();
        } else {
          console.error(`Unknown command: ${command}`);
          console.error(`Run 'pstack help' for usage`);
          process.exit(1);
        }
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
