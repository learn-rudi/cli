/**
 * Argument parsing utilities
 */

/**
 * Parse command line arguments
 * @param {string[]} argv - Arguments from process.argv.slice(2)
 * @returns {{ command: string, args: string[], flags: Object, passthrough: string[] }}
 */
export function parseArgs(argv) {
  const flags = {};
  const args = [];
  const passthrough = [];
  let command = null;

  function setLongFlag(key, value) {
    if (!Object.hasOwn(flags, key)) {
      flags[key] = value;
      return;
    }
    flags[key] = Array.isArray(flags[key])
      ? [...flags[key], value]
      : [flags[key], value];
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--') {
      passthrough.push(...argv.slice(i + 1));
      break;
    } else if (arg.startsWith('--')) {
      // Long flag: --key=value or --key value
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        // --key=value format
        const key = arg.slice(2, eqIndex);
        const value = arg.slice(eqIndex + 1);
        setLongFlag(key, value);
      } else {
        // --key value format (check if next arg is a value)
        const key = arg.slice(2);
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          setLongFlag(key, nextArg);
          i++; // Skip the value
        } else {
          setLongFlag(key, true);
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag(s)
      const chars = arg.slice(1);
      for (const char of chars) {
        flags[char] = true;
      }
    } else if (!command) {
      // First non-flag is the command
      command = arg;
    } else {
      // Rest are arguments
      args.push(arg);
    }
  }

  return { command, args, flags, passthrough };
}

/**
 * Format a value for display
 */
export function formatValue(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'yes' : 'no';
  }
  return String(value);
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}
