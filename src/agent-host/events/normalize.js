import {
  createNormalizer,
  normalizeEvent,
} from './providers/index.js';
import { normalizeAntigravityEvent } from './antigravity.js';
import { normalizeGeminiEvent } from './gemini.js';

const SESSION_ID_KEYS = [
  'session_id',
  'sessionId',
  'thread_id',
  'threadId',
  'conversation_id',
  'conversationId',
];

export function extractNativeSessionId(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') return null;
  for (const key of SESSION_ID_KEYS) {
    if (typeof rawEvent[key] === 'string' && rawEvent[key].trim()) return rawEvent[key];
  }
  for (const containerKey of ['session', 'thread', 'conversation', 'init', 'step_update', 'result']) {
    const container = rawEvent[containerKey];
    if (container && typeof container === 'object') {
      const value = container.id || container.session_id || container.thread_id || container.conversation_id;
      if (typeof value === 'string' && value.trim()) return value;
    }
  }
  return null;
}

export function createAgentEventNormalizer(provider) {
  const directNormalizer = provider === 'antigravity'
    ? normalizeAntigravityEvent
    : provider === 'gemini'
      ? normalizeGeminiEvent
      : null;
  const stateful = createNormalizer(provider);
  return {
    flush() {
      return typeof stateful?.flush === 'function' ? stateful.flush() : [];
    },
    normalize(rawEvent) {
      if (directNormalizer) {
        return [{ normalized: directNormalizer(rawEvent), raw: rawEvent }];
      }
      return normalizeEvent(provider, rawEvent, stateful);
    },
  };
}

export function renderAgentEvent(event) {
  if (!event || typeof event !== 'object') return [];
  if (event.type === 'assistant' && Array.isArray(event.content)) {
    return event.content.flatMap((block) => {
      if (block?.type === 'text' && typeof block.text === 'string' && block.text) return [block.text];
      return [];
    });
  }
  if (event.type === 'result' && typeof event.result === 'string' && event.result) {
    return [event.result];
  }
  return [];
}
