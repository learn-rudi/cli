function defineError(code, status, defaultMessage) {
  return Object.freeze({ code, status, defaultMessage });
}

export const DAEMON_ERROR_CODES = Object.freeze({
  BAD_REQUEST: defineError('BAD_REQUEST', 400, 'Bad request'),
  UNAUTHORIZED: defineError('UNAUTHORIZED', 401, 'Unauthorized'),
  FORBIDDEN: defineError('FORBIDDEN', 403, 'Forbidden'),
  NOT_FOUND: defineError('NOT_FOUND', 404, 'Not found'),
  REQUEST_TIMEOUT: defineError('REQUEST_TIMEOUT', 408, 'Request timed out'),
  CONFLICT: defineError('CONFLICT', 409, 'Conflict'),
  GONE: defineError('GONE', 410, 'Resource no longer available'),
  REQUEST_TOO_LARGE: defineError('REQUEST_TOO_LARGE', 413, 'Request body too large'),
  RATE_LIMITED: defineError('RATE_LIMITED', 429, 'Rate limited'),
  INTERNAL_ERROR: defineError('INTERNAL_ERROR', 500, 'Internal server error'),
  SERVICE_UNAVAILABLE: defineError('SERVICE_UNAVAILABLE', 503, 'Service unavailable'),

  MISSING_REQUIRED_FIELD: defineError('MISSING_REQUIRED_FIELD', 400, 'Required field missing'),
  INVALID_FIELD: defineError('INVALID_FIELD', 400, 'Invalid field value'),

});

const DEFAULT_ERROR_CODE_BY_STATUS = Object.freeze({
  400: DAEMON_ERROR_CODES.BAD_REQUEST,
  401: DAEMON_ERROR_CODES.UNAUTHORIZED,
  403: DAEMON_ERROR_CODES.FORBIDDEN,
  404: DAEMON_ERROR_CODES.NOT_FOUND,
  408: DAEMON_ERROR_CODES.REQUEST_TIMEOUT,
  409: DAEMON_ERROR_CODES.CONFLICT,
  410: DAEMON_ERROR_CODES.GONE,
  413: DAEMON_ERROR_CODES.REQUEST_TOO_LARGE,
  429: DAEMON_ERROR_CODES.RATE_LIMITED,
  500: DAEMON_ERROR_CODES.INTERNAL_ERROR,
  503: DAEMON_ERROR_CODES.SERVICE_UNAVAILABLE,
});

export function resolveDaemonErrorDefinition(input, fallbackStatus = 500) {
  if (!input) {
    return DEFAULT_ERROR_CODE_BY_STATUS[fallbackStatus] || null;
  }

  if (typeof input === 'string') {
    return DAEMON_ERROR_CODES[input]
      || defineError(input, fallbackStatus, null);
  }

  if (typeof input === 'object' && typeof input.code === 'string') {
    return defineError(
      input.code,
      Number.isFinite(input.status) ? input.status : fallbackStatus,
      input.defaultMessage ?? null,
    );
  }

  return null;
}
