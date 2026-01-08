/**
 * Check command - check if a specific package is installed and ready
 *
 * Usage:
 *   rudi check agent:claude     Check if Claude is installed + authenticated
 *   rudi check runtime:python   Check if Python is installed
 *   rudi check binary:ffmpeg    Check if ffmpeg is installed
 *   rudi check stack:slack      Check if Slack stack is installed
 *
 * Exit codes:
 *   0 = ready (installed and authenticated if applicable)
 *   1 = not installed
 *   2 = installed but not authenticated (agents only)
 */

import { PATHS, isPackageInstalled, getPackagePath } from '@learnrudi/core';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Agent credential checks
const AGENT_CREDENTIALS = {
  claude: { type: 'keychain', service: 'Claude Code-credentials' },
  codex: { type: 'file', path: '~/.codex/auth.json' },
  gemini: { type: 'file', path: '~/.gemini/google_accounts.json' },
  copilot: { type: 'file', path: '~/.config/github-copilot/hosts.json' },
};

function fileExists(filePath) {
  const resolved = filePath.replace('~', os.homedir());
  return fs.existsSync(resolved);
}

function checkKeychain(service) {
  if (process.platform !== 'darwin') return false;
  try {
    execSync(`security find-generic-password -s "${service}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function getVersion(binaryPath, versionFlag = '--version') {
  try {
    const output = execSync(`"${binaryPath}" ${versionFlag} 2>&1`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    const match = output.match(/(\d+\.\d+\.?\d*)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function cmdCheck(args, flags) {
  const packageId = args[0];

  if (!packageId) {
    console.error('Usage: rudi check <package-id>');
    console.error('Examples:');
    console.error('  rudi check agent:claude');
    console.error('  rudi check runtime:python');
    console.error('  rudi check binary:ffmpeg');
    console.error('  rudi check stack:slack');
    process.exit(1);
  }

  // Parse package ID
  let kind, name;
  if (packageId.includes(':')) {
    [kind, name] = packageId.split(':');
  } else {
    // Guess kind based on name
    const KNOWN_AGENTS = ['claude', 'codex', 'gemini', 'copilot', 'ollama'];
    const KNOWN_RUNTIMES = ['node', 'python', 'deno', 'bun'];
    const KNOWN_BINARIES = [
      'ffmpeg', 'ripgrep', 'rg', 'git', 'pandoc', 'jq', 'yq',
      'sqlite', 'sqlite3', 'imagemagick', 'convert', 'whisper',
      'docker', 'kubectl', 'terraform', 'vercel', 'netlify',
      'supabase', 'wrangler', 'railway', 'flyctl', 'gh',
      'ytdlp', 'yt-dlp', 'rclone', 'chromium', 'playwright'
    ];

    if (KNOWN_AGENTS.includes(packageId)) {
      kind = 'agent';
      name = packageId;
    } else if (KNOWN_RUNTIMES.includes(packageId)) {
      kind = 'runtime';
      name = packageId;
    } else if (KNOWN_BINARIES.includes(packageId)) {
      kind = 'binary';
      name = packageId;
    } else {
      // Default to stack for unknown names
      kind = 'stack';
      name = packageId;
    }
  }

  const result = {
    id: `${kind}:${name}`,
    kind,
    name,
    installed: false,
    source: null, // 'rudi' | 'global' | null
    authenticated: null, // Only for agents
    ready: false,
    path: null,
    version: null,
  };

  // Check installation based on kind
  switch (kind) {
    case 'agent': {
      // Check RUDI location first (preferred)
      const rudiPath = path.join(PATHS.agents, name, 'node_modules', '.bin', name);
      const rudiInstalled = fs.existsSync(rudiPath);

      // Check global PATH as fallback
      let globalPath = null;
      let globalInstalled = false;
      if (!rudiInstalled) {
        try {
          const which = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
          // Make sure it's not a RUDI shim
          if (which && !which.includes('.rudi/bins') && !which.includes('.rudi/shims')) {
            globalPath = which;
            globalInstalled = true;
          }
        } catch {
          // Not in PATH
        }
      }

      result.installed = rudiInstalled || globalInstalled;
      result.path = rudiInstalled ? rudiPath : globalPath;
      result.source = rudiInstalled ? 'rudi' : (globalInstalled ? 'global' : null);

      if (result.installed && result.path) {
        result.version = getVersion(result.path);
      }

      // Check credentials
      const cred = AGENT_CREDENTIALS[name];
      if (cred) {
        if (cred.type === 'keychain') {
          result.authenticated = checkKeychain(cred.service);
        } else if (cred.type === 'file') {
          result.authenticated = fileExists(cred.path);
        }
      }

      result.ready = result.installed && result.authenticated;
      break;
    }

    case 'runtime': {
      // Check RUDI location first
      const rudiPath = path.join(PATHS.runtimes, name, 'bin', name);
      if (fs.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
        result.version = getVersion(rudiPath);
      } else {
        // Check global
        try {
          const globalPath = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
            result.version = getVersion(globalPath);
          }
        } catch {
          // Not found
        }
      }
      result.ready = result.installed;
      break;
    }

    case 'binary': {
      // Check RUDI location first
      const rudiPath = path.join(PATHS.binaries, name, name);
      if (fs.existsSync(rudiPath)) {
        result.installed = true;
        result.path = rudiPath;
      } else {
        // Check global
        try {
          const globalPath = execSync(`which ${name} 2>/dev/null`, { encoding: 'utf-8' }).trim();
          if (globalPath) {
            result.installed = true;
            result.path = globalPath;
          }
        } catch {
          // Not found
        }
      }
      result.ready = result.installed;
      break;
    }

    case 'stack': {
      result.installed = isPackageInstalled(`stack:${name}`);
      if (result.installed) {
        result.path = getPackagePath(`stack:${name}`);
      }
      result.ready = result.installed;
      break;
    }

    default:
      console.error(`Unknown package kind: ${kind}`);
      process.exit(1);
  }

  // Output
  if (flags.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const installIcon = result.installed ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const source = result.source ? `(${result.source})` : '';
    console.log(`${installIcon} ${result.id} ${source}`);
    console.log(`  Installed: ${result.installed}`);
    if (result.source) console.log(`  Source: ${result.source}`);
    if (result.path) console.log(`  Path: ${result.path}`);
    if (result.version) console.log(`  Version: ${result.version}`);
    if (result.authenticated !== null) {
      console.log(`  Authenticated: ${result.authenticated}`);
    }
    console.log(`  Ready: ${result.ready}`);
  }

  // Exit code
  if (!result.installed) {
    process.exit(1);
  } else if (result.authenticated === false) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}
