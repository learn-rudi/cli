import { spawn } from 'node:child_process';

import {
  createAgentEventNormalizer,
  extractNativeSessionId,
  renderAgentEvent,
} from './normalize.js';
import {
  assertPrivateAutomationRawEvent,
  projectPrivateAutomationEventMetadata,
} from '../private-automation-profile.js';

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
    const privateAutomation = plan.privateAutomationProfile != null;
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
    let privateFailure = null;
    let privateFinalOutput = null;
    let privateObservedModel = null;
    let privateRawOutputBytes = 0;
    let privateUsage = null;

    function terminateProvider(signal) {
      if (privateAutomation && Number.isSafeInteger(child?.pid) && child.pid > 0) {
        try {
          process.kill(-child.pid, signal);
          return true;
        } catch {}
      }
      try {
        return child?.kill(signal) === true;
      } catch {
        return false;
      }
    }

    function privateProviderGroupAlive() {
      if (!privateAutomation || !Number.isSafeInteger(child?.pid) || child.pid < 1) {
        return false;
      }
      try {
        process.kill(-child.pid, 0);
        return true;
      } catch {
        return false;
      }
    }

    function recordSinkFailure(kind, error) {
      if (sinkFailure) return;
      sinkFailure = `${kind} persistence failed: ${error.message}`;
      try { writeLine(stderr, sinkFailure); } catch {}
      terminateProvider('SIGTERM');
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
      terminateProvider('SIGINT');
    };
    const onSigterm = () => {
      requestedSignal = 'SIGTERM';
      terminateProvider('SIGTERM');
    };

    function persistNativeSession(rawEvent, normalized) {
      if (privateAutomation) return;
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
      let persistedEvent = normalized;
      if (privateAutomation) {
        try {
          assertPrivateAutomationRawEvent(plan.provider, rawEvent);
          persistedEvent = projectPrivateAutomationEventMetadata(normalized);
        } catch {
          privateFailure = 'private_tool_event';
          terminateProvider('SIGTERM');
          return;
        }
        if (normalized.model) {
          if (normalized.model !== plan.model) {
            privateFailure = 'private_model_mismatch';
            terminateProvider('SIGTERM');
            return;
          }
          privateObservedModel = normalized.model;
        }
        if (normalized.usage) privateUsage = persistedEvent.usage || privateUsage;
        const structuredOutput = rawEvent?.structured_output ?? rawEvent?.structuredOutput;
        if (structuredOutput && typeof structuredOutput === 'object' && !Array.isArray(structuredOutput)) {
          privateFinalOutput = structuredOutput;
        } else if (normalized.type === 'assistant' && Array.isArray(normalized.content)) {
          const text = normalized.content
            .filter(block => block?.type === 'text' && typeof block.text === 'string')
            .map(block => block.text)
            .join('');
          if (text) privateFinalOutput = text;
        } else if (normalized.type === 'result' && typeof normalized.result === 'string') {
          privateFinalOutput = normalized.result;
        }
      }
      const persistedPayload = {
        delta: isDelta,
        event: persistedEvent,
        launchId,
        provider: plan.provider,
        type: 'agent.event',
      };
      const payload = privateAutomation
        ? publishEvent(persistedPayload)
        : publishEvent({
          event: normalized,
          launchId,
          provider: plan.provider,
          rawEvent,
          type: 'agent.event',
        }, persistedPayload);
      if (privateAutomation) return;
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
        if (privateAutomation) {
          privateFailure = 'private_output_malformed';
          terminateProvider('SIGTERM');
          return;
        }
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
      clearTimeout(runtimeTimer);
      if (forceTimer) clearTimeout(forceTimer);
      signalEmitter.removeListener('SIGINT', onSigint);
      signalEmitter.removeListener('SIGTERM', onSigterm);
      flushStdout();
      finalized = true;

      if (sinkFailure) {
        status = 'failed';
        lastError = sinkFailure;
      }

      if (privateAutomation) {
        if (privateFailure) {
          status = 'failed';
          lastError = `Private automation failed: ${privateFailure}`;
        } else if (status === 'completed' && privateObservedModel === null) {
          status = 'failed';
          lastError = 'Private automation failed: private_model_unobserved';
        } else if (status === 'completed') {
          try {
            const parsed = typeof privateFinalOutput === 'string'
              ? JSON.parse(privateFinalOutput)
              : privateFinalOutput;
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('not_object');
            }
            const serialized = JSON.stringify(parsed);
            if (Buffer.byteLength(serialized, 'utf8') > plan.maxFinalOutputBytes) {
              throw new Error('too_large');
            }
            privateFinalOutput = parsed;
          } catch (error) {
            status = 'failed';
            lastError = `Private automation failed: ${error.message === 'too_large' ? 'private_final_output_overflow' : 'private_final_output_invalid'}`;
          }
        } else {
          lastError = timedOut
            ? 'Private automation failed: private_timeout'
            : requestedSignal
              ? 'Private automation failed: private_stopped'
              : 'Private automation failed: private_provider_error';
        }
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
      if (privateAutomation && status === 'completed') {
        const privateResult = {
          model: privateObservedModel,
          output: privateFinalOutput,
          provider: plan.provider,
          type: 'private-automation.result',
          ...(privateUsage ? { usage: privateUsage } : {}),
        };
        writeLine(stdout, jsonOutput ? JSON.stringify(privateResult) : JSON.stringify(privateFinalOutput));
      }
      if (jsonOutput) {
        if (!privateAutomation) writeLine(stdout, JSON.stringify(terminalEvent));
      }
      resolve(updated);
    }

    const runtimeTimer = setTimeout(() => {
      timedOut = true;
      terminateProvider('SIGTERM');
      forceTimer = setTimeout(
        () => terminateProvider('SIGKILL'),
        plan.timeouts.shutdownGraceMs || 5000,
      );
    }, timeoutMs);

    try {
      child = spawnImpl(plan.spawn.command, plan.args, {
        cwd: plan.spawn.cwd,
        detached: privateAutomation,
        env: privateAutomation ? plan.environment : { ...process.env, ...plan.environment },
        stdio: [privateAutomation ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      clearTimeout(runtimeTimer);
      reject(error);
      return;
    }

    if (privateAutomation) {
      child.stdin.on('error', () => {
        privateFailure = 'private_stdin_error';
        terminateProvider('SIGTERM');
      });
      child.stdin.end(plan.stdin);
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
      if (privateAutomation) {
        privateRawOutputBytes += Buffer.byteLength(chunk);
        if (privateRawOutputBytes > plan.maxRawOutputBytes) {
          privateFailure = 'private_raw_output_overflow';
          stdoutBuffer = '';
          terminateProvider('SIGTERM');
          return;
        }
      }
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || '';
      for (const line of lines) consumeLine(line);
    });

    child.stderr.on('data', (chunk) => {
      if (privateAutomation) return;
      const text = chunk.toString();
      stderrTail = boundedAppend(stderrTail, text);
      try {
        stderr.write(text);
      } catch (error) {
        recordSinkFailure('Provider stderr', error);
      }
    });

    child.once('error', (error) => {
      complete(
        'failed',
        null,
        privateAutomation ? 'Private automation failed: private_spawn_error' : `Provider process error: ${error.message}`,
      );
    });

    child.once('close', (exitCode, signal) => {
      if (privateProviderGroupAlive()) {
        terminateProvider('SIGKILL');
        privateFailure = 'private_termination_unconfirmed';
      }
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
