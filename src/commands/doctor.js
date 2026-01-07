/**
 * Doctor command - system health check
 */

import {
  PATHS,
  ensureDirectories,
  getInstalledPackages
} from '@prompt-stack/core';
import { isDatabaseInitialized, initSchema } from '@prompt-stack/runner/db';
import { listSecretNames } from '@prompt-stack/runner';
import fs from 'fs';

export async function cmdDoctor(args, flags) {
  console.log('Prompt Stack Health Check');
  console.log('═'.repeat(50));

  const issues = [];
  const fixes = [];

  // Check directories
  console.log('\n📁 Directories');
  const dirs = [
    { path: PATHS.home, name: 'Home' },
    { path: PATHS.stacks, name: 'Stacks' },
    { path: PATHS.prompts, name: 'Prompts' },
    { path: PATHS.runtimes, name: 'Runtimes' },
    { path: PATHS.tools, name: 'Tools' },
    { path: PATHS.agents, name: 'Agents' },
    { path: PATHS.db, name: 'Database' },
    { path: PATHS.cache, name: 'Cache' }
  ];

  for (const dir of dirs) {
    const exists = fs.existsSync(dir.path);
    const status = exists ? '✓' : '✗';
    console.log(`  ${status} ${dir.name}: ${dir.path}`);

    if (!exists) {
      issues.push(`Missing directory: ${dir.name}`);
      fixes.push(() => fs.mkdirSync(dir.path, { recursive: true }));
    }
  }

  // Check database
  console.log('\n💾 Database');
  const dbInitialized = isDatabaseInitialized();
  console.log(`  ${dbInitialized ? '✓' : '✗'} Initialized: ${dbInitialized}`);

  if (!dbInitialized) {
    issues.push('Database not initialized');
    fixes.push(() => initSchema());
  }

  // Check installed packages
  console.log('\n📦 Packages');
  try {
    const stacks = getInstalledPackages('stack');
    const prompts = getInstalledPackages('prompt');
    const runtimes = getInstalledPackages('runtime');

    console.log(`  ✓ Stacks: ${stacks.length}`);
    console.log(`  ✓ Prompts: ${prompts.length}`);
    console.log(`  ✓ Runtimes: ${runtimes.length}`);
  } catch (error) {
    console.log(`  ✗ Error reading packages: ${error.message}`);
    issues.push('Cannot read packages');
  }

  // Check secrets
  console.log('\n🔐 Secrets');
  try {
    const secrets = listSecretNames();
    console.log(`  ✓ Configured: ${secrets.length}`);

    if (secrets.length > 0) {
      for (const name of secrets.slice(0, 5)) {
        console.log(`    - ${name}`);
      }
      if (secrets.length > 5) {
        console.log(`    ... and ${secrets.length - 5} more`);
      }
    }
  } catch (error) {
    console.log(`  ✗ Error reading secrets: ${error.message}`);
  }

  // Check Node.js version
  console.log('\n⚙️  Environment');
  const nodeVersion = process.version;
  const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
  console.log(`  ${nodeOk ? '✓' : '✗'} Node.js: ${nodeVersion} ${nodeOk ? '' : '(requires >=18)'}`);

  if (!nodeOk) {
    issues.push('Node.js version too old (requires >=18)');
  }

  // Summary
  console.log('\n' + '─'.repeat(50));

  if (issues.length === 0) {
    console.log('✓ All checks passed!');
  } else {
    console.log(`Found ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      console.log(`  • ${issue}`);
    }

    if (flags.fix && fixes.length > 0) {
      console.log('\nAttempting fixes...');
      for (const fix of fixes) {
        try {
          fix();
        } catch (error) {
          console.error(`  Fix failed: ${error.message}`);
        }
      }
      console.log('Done. Run doctor again to verify.');
    } else if (fixes.length > 0) {
      console.log('\nRun with --fix to attempt automatic fixes.');
    }
  }
}
