function usageFromStats(stats) {
  const raw = stats?.usage || stats;
  if (!raw || typeof raw !== 'object') return undefined;
  const inputTokens = raw.input_tokens ?? raw.inputTokens;
  const outputTokens = raw.output_tokens ?? raw.outputTokens;
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') return undefined;
  const usage = { inputTokens, outputTokens };
  const cacheReadTokens = raw.cache_read_tokens ?? raw.cacheReadTokens;
  if (typeof cacheReadTokens === 'number') usage.cacheReadTokens = cacheReadTokens;
  return usage;
}

export function normalizeGeminiEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return { message: 'Invalid Gemini event', type: 'error' };
  }

  if (rawEvent.type === 'init') {
    return {
      message: 'Gemini session initialized',
      subtype: 'init',
      type: 'system',
    };
  }

  if (rawEvent.type === 'message') {
    if (rawEvent.role === 'assistant' && typeof rawEvent.content === 'string') {
      return {
        content: [{ text: rawEvent.content, type: 'text' }],
        type: 'assistant',
      };
    }
    return {
      message: `Gemini ${rawEvent.role || 'unknown'} message`,
      subtype: 'message',
      type: 'system',
    };
  }

  if (rawEvent.type === 'tool_use') {
    return {
      content: [{
        id: rawEvent.tool_id || '',
        input: rawEvent.parameters && typeof rawEvent.parameters === 'object' ? rawEvent.parameters : {},
        name: rawEvent.tool_name || 'unknown',
        type: 'tool_use',
      }],
      type: 'assistant',
    };
  }

  if (rawEvent.type === 'tool_result') {
    return {
      content: [{
        content: rawEvent.output || rawEvent.error?.message || '',
        isError: rawEvent.status === 'error',
        toolUseId: rawEvent.tool_id || '',
        type: 'tool_result',
      }],
      type: 'assistant',
    };
  }

  if (rawEvent.type === 'error') {
    return {
      message: rawEvent.message || 'Gemini error',
      type: 'error',
    };
  }

  if (rawEvent.type === 'result') {
    const normalized = { type: 'result' };
    const durationMs = rawEvent.stats?.duration_ms ?? rawEvent.stats?.durationMs;
    if (typeof durationMs === 'number') normalized.durationMs = durationMs;
    const normalizedUsage = usageFromStats(rawEvent.stats);
    if (normalizedUsage) normalized.usage = normalizedUsage;
    if (rawEvent.status && rawEvent.status !== 'success') normalized.isError = true;
    return normalized;
  }

  return {
    message: `Unrecognized Gemini event: ${rawEvent.type || 'unknown'}`,
    subtype: 'unknown',
    type: 'system',
  };
}
