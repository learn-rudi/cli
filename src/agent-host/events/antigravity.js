function usage(raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  if (typeof raw.input_tokens !== 'number' || typeof raw.output_tokens !== 'number') return undefined;
  const normalized = {
    inputTokens: raw.input_tokens,
    outputTokens: raw.output_tokens,
  };
  if (typeof raw.cache_read_tokens === 'number') normalized.cacheReadTokens = raw.cache_read_tokens;
  return normalized;
}

export function normalizeAntigravityEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== 'object') {
    return { message: 'Invalid Antigravity event', type: 'error' };
  }

  if (rawEvent.event === 'init') {
    return {
      message: 'Antigravity conversation initialized',
      subtype: 'init',
      type: 'system',
    };
  }

  if (rawEvent.event === 'step_update') {
    const step = rawEvent.step_update || {};
    if (step.step_type === 'agent_response' && typeof step.text_delta === 'string') {
      const normalized = {
        content: [{ text: step.text_delta, type: 'text' }],
        type: 'assistant',
      };
      const normalizedUsage = usage(step.usage);
      if (normalizedUsage) normalized.usage = normalizedUsage;
      return normalized;
    }
    return {
      message: `Antigravity step ${step.step_type || 'unknown'}: ${step.state || 'unknown'}`,
      subtype: 'step_update',
      type: 'system',
    };
  }

  if (rawEvent.event === 'result') {
    const result = rawEvent.result || {};
    const normalized = {
      providerSessionId: result.conversation_id,
      result: typeof result.response === 'string' ? result.response : undefined,
      type: 'result',
    };
    if (typeof result.duration_seconds === 'number') normalized.durationMs = Math.round(result.duration_seconds * 1000);
    if (typeof result.num_turns === 'number') normalized.numTurns = result.num_turns;
    const normalizedUsage = usage(result.usage);
    if (normalizedUsage) normalized.usage = normalizedUsage;
    if (result.status && result.status !== 'SUCCESS') normalized.isError = true;
    return normalized;
  }

  if (rawEvent.event === 'error') {
    return {
      message: rawEvent.error?.message || rawEvent.message || 'Antigravity error',
      type: 'error',
    };
  }

  return {
    message: `Unrecognized Antigravity event: ${rawEvent.event || 'unknown'}`,
    subtype: 'unknown',
    type: 'system',
  };
}
