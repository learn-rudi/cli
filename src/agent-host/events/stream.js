import { spawn } from 'node:child_process';

import {
  createAgentEventNormalizer,
  extractNativeSessionId,
  renderAgentEvent,
} from './normalize.js';

function boundedAppend(current, value, maxLength = 4096) {
  const combined = `${current}${value}`;
  return combined.length <= maxLength ? combined : combined.slice(-maxLength);
}

function writeLine(stream, value) {
  stream.write(value.endsWith('\n') ? value : `${value}\n`);
}

export function executeForegroundLaunch({
  eventSink = null,
  jsonOutput = false,
  launchId,
  onSpawn = null,
  plan,
  spawnImpl = spawn,
  stderr = process.stderr,
  stdout = process.stdout,
  store,
  timeoutMs = plan.timeouts.runtimeMs,
  signalEmitter = process,
}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 24 * 60 * 60 * 1000) {
    throw new Error('timeoutMs must be an integer between 1 and 86400000');
  }

  return new Promise((resolve, reject) => {
    const normalizer = createAgentEventNormalizer(plan.provider);
    let child;
    let finalized = false;
    let stdoutBuffer = '';
    let stderrTail = '';
    let sawAssistantText = false;
    let timedOut = false;
    let forceTimer = null;
    let requestedSignal = null;
    let sinkFailure = null;

    function recordSinkFailure(kind, error) {
      if (sinkFailure) return;
      sinkFailure = `${kind} persistence failed: ${error.message}`;
      try { writeLine(stderr, sinkFailure); } catch {}
      try { child?.kill('SIGTERM'); } catch {}
    }

    function publishEvent(payload, persistedPayload = payload) {
      try {
        eventSink?.(persistedPayload);
      } catch (error) {
        recordSinkFailure('Agent event', error);
      }
      return payload;
    }

    const onSigint = () => {
      requestedSignal = 'SIGINT';
      child?.kill('SIGINT');
    };
    const onSigterm = () => {
      requestedSignal = 'SIGTERM';
      child?.kill('SIGTERM');
    };

    function persistNativeSession(rawEvent, normalized) {
      const nativeSessionId = extractNativeSessionId(rawEvent)
        || normalized?.providerSessionId
        || null;
      if (!nativeSessionId) return;
      const current = store.get(launchId);
      if (current?.nativeSessionId !== nativeSessionId) {
        store.setNativeSessionId(launchId, nativeSessionId);
      }
    }

    function emitEvent(normalized, rawEvent) {
      persistNativeSession(rawEvent, normalized);
      const isDelta = (
        rawEvent?.type === 'message' && rawEvent.delta === true
      ) || (
        rawEvent?.event === 'step_update' && rawEvent.step_update?.step_type === 'agent_response'
      );
      const persistedPayload = {
        delta: isDelta,
        event: normalized,
        launchId,
        provider: plan.provider,
        type: 'agent.event',
      };
      const payload = publishEvent({
        event: normalized,
        launchId,
        provider: plan.provider,
        rawEvent,
        type: 'agent.event',
      }, persistedPayload);
      if (jsonOutput) {
        writeLine(stdout, JSON.stringify(payload));
        return;
      }

      const rendered = renderAgentEvent(normalized);
      if (normalized?.type === 'assistant' && rendered.length > 0) sawAssistantText = true;
      if (normalized?.type === 'result' && sawAssistantText) return;
      for (const text of rendered) {
        if (isDelta) stdout.write(text);
        else writeLine(stdout, text);
      }
      if (normalized?.type === 'error' && normalized.message) writeLine(stderr, normalized.message);
    }

    function consumeLine(line) {
      if (!line.trim()) return;
      try {
        const rawEvent = JSON.parse(line);
        for (const result of normalizer.normalize(rawEvent)) {
          if (result?.normalized) emitEvent(result.normalized, result.raw || rawEvent);
        }
      } catch {
        const payload = publishEvent({
          event: { message: line, subtype: 'provider_stdout', type: 'system' },
          launchId,
          provider: plan.provider,
          type: 'agent.event',
        });
        if (jsonOutput) {
          writeLine(stdout, JSON.stringify(payload));
        } else {
          writeLine(stdout, line);
        }
      }
    }

    function flushStdout() {
      if (stdoutBuffer.trim()) consumeLine(stdoutBuffer);
      stdoutBuffer = '';
      for (const result of normalizer.flush()) {
        if (result?.normalized) emitEvent(result.normalized, result.raw || {});
      }
    }

    function complete(status, exitCode, lastError = null) {
      if (finalized) return;
      finalized = true;
      clearTimeout(runtimeTimer);
      if (forceTimer) clearTimeout(forceTimer);
      signalEmitter.removeListener('SIGINT', onSigint);
      signalEmitter.removeListener('SIGTERM', onSigterm);
      flushStdout();

      if (sinkFailure) {
        status = 'failed';
        lastError = sinkFailure;
      }

      const current = store.get(launchId);
      if (current?.status === 'starting' && status !== 'failed') {
        store.transition(launchId, 'running', { pid: child?.pid || 0 });
      }
      const updated = store.transition(launchId, status, {
        exitCode,
        lastError,
      });
      const terminalEvent = publishEvent({ launch: updated, type: `launch.${status}` });
      if (jsonOutput) {
        writeLine(stdout, JSON.stringify(terminalEvent));
      }
      resolve(updated);
    }

    const runtimeTimer = setTimeout(() => {
      timedOut = true;
      child?.kill('SIGTERM');
      forceTimer = setTimeout(() => child?.kill('SIGKILL'), plan.timeouts.shutdownGraceMs || 5000);
    }, timeoutMs);

    try {
      child = spawnImpl(plan.spawn.command, plan.args, {
        cwd: plan.spawn.cwd,
        env: { ...process.env, ...plan.environment },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      clearTimeout(runtimeTimer);
      reject(error);
      return;
    }

    child.once('spawn', () => {
      const current = store.get(launchId);
      if (current?.status === 'starting') {
        const running = store.transition(launchId, 'running', { pid: child.pid || 0 });
        onSpawn?.(running);
      } else if (current) {
        onSpawn?.(current);
      }
    });
    signalEmitter.once('SIGINT', onSigint);
    signalEmitter.once('SIGTERM', onSigterm);

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || '';
      for (const line of lines) consumeLine(line);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrTail = boundedAppend(stderrTail, text);
      try {
        stderr.write(text);
      } catch (error) {
        recordSinkFailure('Provider stderr', error);
      }
    });

    child.once('error', (error) => {
      complete('failed', null, `Provider process error: ${error.message}`);
    });

    child.once('close', (exitCode, signal) => {
      if (sinkFailure) {
        complete('failed', exitCode, sinkFailure);
        return;
      }
      if (timedOut) {
        complete('failed', exitCode, `Provider process timed out after ${timeoutMs}ms`);
        return;
      }
      if (requestedSignal) {
        complete('stopped', exitCode, `Provider process stopped by ${requestedSignal}`);
        return;
      }
      if (exitCode === 0) {
        complete('completed', 0);
        return;
      }
      const detail = stderrTail.trim() || `Provider process exited with code ${exitCode}${signal ? ` (${signal})` : ''}`;
      complete('failed', exitCode, detail);
    });
  });
}
