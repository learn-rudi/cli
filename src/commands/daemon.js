/**
 * Terminal adapter for the local daemon lifecycle.
 *
 * Start/stop/install orchestration lives in daemon/runtime/lifecycle.js. This
 * module owns only command dispatch and human-readable presentation.
 */

import { getDaemonStatus } from '../daemon/client.js';
import { getLaunchAgentStatus } from '../daemon/runtime/launch-agent.js';
import {
  buildServeArgs,
  installDaemon,
  restartDaemonLifecycle,
  startDaemonLifecycle,
  stopDaemonLifecycle,
  uninstallDaemon,
} from '../daemon/runtime/lifecycle.js';

export {
  buildServeArgs,
  getDaemonEntrypoint,
  installDaemon,
  removeDaemonConnectionFiles,
  restartDaemonLifecycle,
  spawnDaemonProcess,
  startDaemon,
  startDaemonLifecycle,
  stopDaemon,
  stopDaemonLifecycle,
  uninstallDaemon,
  waitForDaemonReady,
  waitForDaemonStopped,
} from '../daemon/runtime/lifecycle.js';

export function formatDaemonState(status) {
  if (status?.ready) return 'ready';
  if (status?.reachable) return 'not ready';
  if (status?.reason === 'not_running') return 'not running';
  if (status?.reason === 'invalid_connection_files') return 'invalid connection files';
  if (status?.reason === 'unreachable') return 'unreachable';
  return 'unknown';
}

export function formatLaunchAgentState(status) {
  if (status?.supported === false) return 'unsupported';
  if (status?.loaded && status?.pid) return `loaded (pid ${status.pid})`;
  if (status?.loaded) return 'loaded';
  if (status?.installed) return 'installed, not loaded';
  return 'not installed';
}

function buildStatusJson(status, launchAgent) {
  return {
    launchAgent,
    state: formatDaemonState(status),
    ...status,
  };
}

function printStatus(status, launchAgent) {
  console.log('RUDI Daemon');
  console.log('═'.repeat(50));
  if (launchAgent) {
    console.log(`  LaunchAgent: ${formatLaunchAgentState(launchAgent)}`);
    if (launchAgent.plistPath) console.log(`  Plist: ${launchAgent.plistPath}`);
  }
  console.log(`  State: ${formatDaemonState(status)}`);
  if (status.port) console.log(`  Port: ${status.port}`);
  if (status.version) console.log(`  Version: ${status.version}`);
  if (status.status?.pid) console.log(`  PID: ${status.status.pid}`);
  if (status.status?.uptimeMs !== undefined) {
    console.log(`  Uptime: ${Math.round(status.status.uptimeMs / 1000)}s`);
  }
  if (status.toolIndexStatus) {
    const toolCount = Number.isInteger(status.toolIndexStatus.toolCount)
      ? ` (${status.toolIndexStatus.toolCount} tools)`
      : '';
    console.log(`  Tool index: ${status.toolIndexStatus.status || 'unknown'}${toolCount}`);
  }
  if (status.error) console.log(`  Detail: ${status.error}`);
}

function printLifecycleResult(result) {
  if (result.action === 'started') {
    console.log(`Daemon started on port ${result.status.port}`);
  } else if (result.action === 'launch_agent_started') {
    console.log(`LaunchAgent started daemon on port ${result.status.port}`);
  } else if (result.action === 'launch_agent_kickstarted') {
    console.log(`LaunchAgent daemon is running on port ${result.status.port}`);
  } else if (result.action === 'launch_agent_restarted') {
    console.log(`LaunchAgent restarted daemon on port ${result.status.port}`);
  } else if (result.action === 'installed') {
    console.log(`LaunchAgent installed and daemon ready on port ${result.status.port}`);
  } else if (result.action === 'uninstalled') {
    console.log('LaunchAgent uninstalled');
  } else if (result.action === 'dry_run') {
    console.log('LaunchAgent dry run');
    if (result.plan?.config?.plistPath) console.log(`  Plist: ${result.plan.config.plistPath}`);
    if (result.plan?.commands?.bootstrap) {
      console.log(`  Install: launchctl ${result.plan.commands.bootstrap.join(' ')}`);
    }
    if (result.plan?.commands?.kickstart) {
      console.log(`  Restart: launchctl ${result.plan.commands.kickstart.join(' ')}`);
    }
  } else if (result.action === 'already_running') {
    const port = result.status.port ? `, port ${result.status.port}` : '';
    console.log(`Daemon already running (${formatDaemonState(result.status)}${port})`);
  } else if (result.action === 'stopped') {
    console.log(`Daemon stopped (pid ${result.pid})`);
  } else if (result.action === 'launch_agent_stopped') {
    console.log('LaunchAgent stopped');
  } else if (result.action === 'not_running') {
    console.log('Daemon is not running');
  } else if (result.action === 'cleaned_stale_files') {
    console.log('Removed stale daemon connection files');
  }
}

function printResult(result, flags) {
  if (flags.json) console.log(JSON.stringify(result, null, 2));
  else printLifecycleResult(result);
}

export async function cmdDaemon(args = [], flags = {}) {
  const subcommand = args[0] || 'status';
  const launchAgentOptions = {
    flags,
    serveArgs: buildServeArgs(flags),
  };

  if (subcommand === 'status') {
    const status = await getDaemonStatus();
    const launchAgent = getLaunchAgentStatus();
    if (flags.json) console.log(JSON.stringify(buildStatusJson(status, launchAgent), null, 2));
    else printStatus(status, launchAgent);
    return;
  }

  if (subcommand === 'start') {
    printResult(await startDaemonLifecycle(launchAgentOptions), flags);
    return;
  }

  if (subcommand === 'stop') {
    printResult(await stopDaemonLifecycle(launchAgentOptions), flags);
    return;
  }

  if (subcommand === 'restart') {
    const result = await restartDaemonLifecycle(launchAgentOptions);
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else if (result.action === 'restarted') {
      printLifecycleResult(result.stop);
      printLifecycleResult(result.start);
    } else printLifecycleResult(result);
    return;
  }

  if (subcommand === 'install') {
    printResult(await installDaemon(launchAgentOptions), flags);
    return;
  }

  if (subcommand === 'uninstall' || subcommand === 'remove') {
    printResult(await uninstallDaemon(launchAgentOptions), flags);
    return;
  }

  throw new Error(`Unknown daemon command: ${subcommand}`);
}
