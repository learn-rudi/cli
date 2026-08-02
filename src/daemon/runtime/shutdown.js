/**
 * Graceful daemon shutdown.
 *
 * Stops accepting new work, runs owned-resource cleanup, and exits after
 * cleanup or a bounded timeout.
 */

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5000;

export async function closeHttpServer(server) {
  if (!server || typeof server.close !== 'function') return;

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (!err || err.code === 'ERR_SERVER_NOT_RUNNING') {
        resolve();
        return;
      }
      reject(err);
    });
  });
}

export function createGracefulShutdown({
  cleanupResources,
  exit = process.exit,
  log,
  processRef = process,
  server,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT_MS,
} = {}) {
  let shutdownStarted = false;

  async function shutdown(exitCode = 0, reason = 'shutdown') {
    if (shutdownStarted) return;
    shutdownStarted = true;

    let finalExitCode = exitCode;
    const timeout = setTimeout(() => {
      log?.('serve', 'error', `Shutdown timed out after ${timeoutMs}ms`, { reason });
      exit(finalExitCode || 1);
    }, timeoutMs);
    timeout.unref?.();

    try {
      log?.('serve', 'info', 'shutdown_started', { reason, exitCode });
      await closeHttpServer(server);
      await cleanupResources?.();
      log?.('serve', 'info', 'shutdown_complete', { reason, exitCode: finalExitCode });
    } catch (err) {
      finalExitCode = finalExitCode || 1;
      log?.('serve', 'error', `Shutdown cleanup failed: ${err.message}`, { reason, stack: err.stack });
    } finally {
      clearTimeout(timeout);
      exit(finalExitCode);
    }
  }

  function registerProcessHandlers({ onUncaughtException, onUnhandledRejection } = {}) {
    processRef.on('SIGINT', () => { void shutdown(0, 'SIGINT'); });
    processRef.on('SIGTERM', () => { void shutdown(0, 'SIGTERM'); });
    processRef.on('uncaughtException', (err) => {
      onUncaughtException?.(err);
      void shutdown(1, 'uncaughtException');
    });
    processRef.on('unhandledRejection', (err) => {
      onUnhandledRejection?.(err);
      void shutdown(1, 'unhandledRejection');
    });
  }

  return {
    isShutdownStarted: () => shutdownStarted,
    registerProcessHandlers,
    shutdown,
  };
}
