import crypto from 'node:crypto';
import { URL } from 'node:url';

import {
  DAEMON_ERROR_CODES,
  resolveDaemonErrorDefinition,
} from './errors.js';

const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;
const DEFAULT_BODY_TIMEOUT_MS = 30_000;
export const REQUEST_ID_HEADER = 'x-rudi-request-id';

export function createDaemonHttpContext() {
  let token = '';

  function log(source, level, message, data) {
    const tag = `[${new Date().toISOString()}] [${source}]`;
    const suffix = data === undefined ? '' : ` ${JSON.stringify(data)}`;
    if (level === 'error') console.error(`${tag} ERROR: ${message}${suffix}`);
    else if (level === 'warn') console.warn(`${tag} WARN: ${message}${suffix}`);
    else console.log(`${tag} ${message}${suffix}`);
  }

  function createRequestContext(req) {
    let pathname = '/';
    try {
      pathname = new URL(req?.url || '/', 'http://localhost').pathname;
    } catch {}
    return {
      requestId: crypto.randomUUID(),
      method: req?.method || null,
      path: pathname,
      startedAt: Date.now(),
      auth: { required: true, result: 'unknown' },
      response: null,
    };
  }

  function attachRequestContext(res, requestContext) {
    res._rudiRequestContext = requestContext;
    res.setHeader?.(REQUEST_ID_HEADER, requestContext.requestId);
    return requestContext;
  }

  function getRequestContext(res) {
    return res?._rudiRequestContext || null;
  }

  function updateRequestAuth(res, patch) {
    const requestContext = getRequestContext(res);
    if (!requestContext) return null;
    requestContext.auth = { ...requestContext.auth, ...patch };
    return requestContext.auth;
  }

  function markResponse(res, patch) {
    const requestContext = getRequestContext(res);
    if (!requestContext) return null;
    requestContext.response = { ...(requestContext.response || {}), ...patch };
    return requestContext.response;
  }

  function json(res, data, status = 200, options = {}) {
    const requestContext = getRequestContext(res);
    markResponse(res, { status });
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...(requestContext?.requestId ? { [REQUEST_ID_HEADER]: requestContext.requestId } : {}),
      ...(options.headers || {}),
    });
    res.end(JSON.stringify(data));
    return true;
  }

  function error(res, message, status = 400, options = {}) {
    const definition = resolveDaemonErrorDefinition(options.code, status);
    const finalStatus = definition?.status ?? status;
    const requestContext = getRequestContext(res);
    const payload = {
      error: message || definition?.defaultMessage || 'Error',
      code: definition?.code || 'ERROR',
    };
    if (options.details !== undefined) payload.details = options.details;
    if (requestContext?.requestId) payload.requestId = requestContext.requestId;
    markResponse(res, { status: finalStatus, errorCode: payload.code });
    return json(res, payload, finalStatus, options);
  }

  function requiredField(res, field, options = {}) {
    return error(res, options.message || `${field} required`, options.status || 400, {
      ...options,
      code: options.code || DAEMON_ERROR_CODES.MISSING_REQUIRED_FIELD,
      details: {
        field,
        location: options.location || 'body',
        ...(options.details || {}),
      },
    });
  }

  function requiredFields(res, fields, options = {}) {
    const normalized = (Array.isArray(fields) ? fields : [fields]).filter(Boolean);
    return error(res, options.message || `${normalized.join(' and ')} required`, options.status || 400, {
      ...options,
      code: options.code || DAEMON_ERROR_CODES.MISSING_REQUIRED_FIELD,
      details: {
        fields: normalized,
        location: options.location || 'body',
        ...(options.details || {}),
      },
    });
  }

  function invalidField(res, field, message, options = {}) {
    return error(res, message, options.status || 400, {
      ...options,
      code: options.code || DAEMON_ERROR_CODES.INVALID_FIELD,
      details: {
        field,
        location: options.location || 'body',
        ...(options.reason ? { reason: options.reason } : {}),
        ...(options.details || {}),
      },
    });
  }

  function readBody(req, options = {}) {
    const maxBodySize = Number.isFinite(options.maxBodySize) && options.maxBodySize > 0
      ? options.maxBodySize
      : DEFAULT_MAX_BODY_BYTES;
    const timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
      ? options.timeoutMs
      : DEFAULT_BODY_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      const timer = setTimeout(() => {
        const failure = new Error('Request body read timed out');
        failure.statusCode = 408;
        try { req.destroy(); } catch {}
        finish(reject, failure);
      }, timeoutMs);

      req.on('data', chunk => {
        size += chunk.length;
        if (size > maxBodySize) {
          const failure = new Error('Request body too large');
          failure.statusCode = 413;
          try { req.destroy(); } catch {}
          finish(reject, failure);
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (settled) return;
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw) return finish(resolve, {});
        try {
          finish(resolve, JSON.parse(raw));
        } catch {
          const failure = new Error('Invalid JSON in request body');
          failure.statusCode = 400;
          finish(reject, failure);
        }
      });
      req.on('error', failure => finish(reject, failure));
    });
  }

  function setToken(value) {
    token = value;
  }

  function checkAuth(req) {
    const raw = req?.headers?.['x-rudi-token'];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!token || typeof candidate !== 'string') return false;
    const expected = Buffer.from(token);
    const actual = Buffer.from(candidate);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  return {
    REQUEST_ID_HEADER,
    attachRequestContext,
    broadcast() {},
    checkAuth,
    createRequestContext,
    error,
    generateToken: () => crypto.randomBytes(32).toString('hex'),
    getRequestContext,
    invalidField,
    json,
    log,
    readBody,
    requiredField,
    requiredFields,
    setToken,
    updateRequestAuth,
  };
}
