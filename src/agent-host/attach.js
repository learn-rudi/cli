import {
  assertLaunchId,
  assertOwnedLaunchDirectory,
  getLaunchArtifactFiles,
  readLaunchEvents,
} from './artifacts.js';
import { createLaunchStore } from './launch-store.js';
import { renderAgentEvent } from './events/normalize.js';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'stopped']);

function writeLine(stream, value) {
  stream.write(value.endsWith('\n') ? value : `${value}\n`);
}

export async function attachAgentLaunch(launchId, dependencies = {}) {
  assertLaunchId(launchId);
  const pollIntervalMs = dependencies.pollIntervalMs || 250;
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 10 || pollIntervalMs > 5000) {
    throw new Error('attach pollIntervalMs must be between 10 and 5000');
  }
  const ownsStore = !dependencies.store;
  const store = dependencies.store || createLaunchStore();
  const stdout = dependencies.stdout || process.stdout;
  const signalEmitter = dependencies.signalEmitter || process;
  const follow = dependencies.follow !== false;
  const jsonOutput = dependencies.jsonOutput === true;
  let interrupted = false;
  let offset = 0;
  let buffered = '';
  let sawAssistantText = false;
  const onInterrupt = () => { interrupted = true; };
  signalEmitter.once('SIGINT', onInterrupt);
  signalEmitter.once('SIGTERM', onInterrupt);

  function renderLine(line) {
    if (!line.trim()) return;
    if (jsonOutput) {
      writeLine(stdout, line);
      return;
    }
    let payload;
    try { payload = JSON.parse(line); } catch {
      writeLine(stdout, line);
      return;
    }
    if (payload.type !== 'agent.event' || !payload.event) return;
    const rendered = renderAgentEvent(payload.event);
    if (payload.event.type === 'assistant' && rendered.length > 0) sawAssistantText = true;
    if (payload.event.type === 'result' && sawAssistantText) return;
    const isDelta = (
      payload.rawEvent?.type === 'message' && payload.rawEvent.delta === true
    ) || (
      payload.rawEvent?.event === 'step_update'
      && payload.rawEvent.step_update?.step_type === 'agent_response'
    );
    for (const value of rendered) {
      if (isDelta) stdout.write(value);
      else writeLine(stdout, value);
    }
  }

  try {
    let launch = store.get(launchId);
    if (!launch) throw new Error(`Launch not found: ${launchId}`);
    assertOwnedLaunchDirectory({ launchDirectory: launch.outputDestination, launchId });
    const eventFile = getLaunchArtifactFiles(launch.outputDestination).events;

    while (!interrupted) {
      const page = readLaunchEvents({ eventFile, offset });
      offset = page.nextOffset;
      buffered += page.data;
      const lines = buffered.split('\n');
      buffered = lines.pop() || '';
      for (const line of lines) renderLine(line);

      launch = store.get(launchId);
      if (!launch) throw new Error(`Launch disappeared while attaching: ${launchId}`);
      if ((TERMINAL_STATUSES.has(launch.status) && page.eof) || !follow) {
        if (buffered.trim()) renderLine(buffered);
        return launch;
      }
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    return store.get(launchId);
  } finally {
    signalEmitter.removeListener('SIGINT', onInterrupt);
    signalEmitter.removeListener('SIGTERM', onInterrupt);
    if (ownsStore) store.close();
  }
}
