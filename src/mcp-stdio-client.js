import { spawn } from 'node:child_process';
import readline from 'node:readline';

const MCP_PROTOCOL_VERSION = '2024-11-05';

function toolErrorText(result) {
  if (!Array.isArray(result?.content)) return null;
  return result.content
    .filter((item) => item?.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join('\n');
}

export function parseJsonToolResult(result, toolName) {
  const text = toolErrorText(result);
  if (result?.isError === true) {
    throw new Error(`${toolName} failed${text ? `: ${text}` : ''}`);
  }
  if (!text) throw new Error(`${toolName} returned no text result`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${toolName} returned non-JSON text`);
  }
}

export function createMcpStdioClient({
  command,
  args = [],
  cwd,
  env = process.env,
  timeoutMs = 35_000,
  onStderr = () => {},
}) {
  if (typeof command !== 'string' || command.trim() === '') {
    throw new Error('MCP client command is required');
  }
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const lines = readline.createInterface({ input: child.stdout, terminal: false });
  const pending = new Map();
  let requestId = 0;
  let terminalError = null;
  let closed = false;

  const rejectPending = (error) => {
    terminalError = error;
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
  };

  lines.on('line', (line) => {
    let response;
    try {
      response = JSON.parse(line);
    } catch {
      return;
    }
    if (response.id == null) return;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    clearTimeout(request.timeout);
    if (response.error) {
      request.reject(new Error(response.error.message || 'MCP request failed'));
    } else {
      request.resolve(response.result);
    }
  });
  child.stderr.on('data', (chunk) => onStderr(String(chunk)));
  child.on('error', (error) => rejectPending(new Error(`Unable to start MCP router: ${error.message}`)));
  child.on('exit', (code, signal) => {
    if (!closed) {
      rejectPending(new Error(`MCP router exited before completion (${signal || code})`));
    }
  });

  const request = (method, params = {}) => new Promise((resolve, reject) => {
    if (terminalError) {
      reject(terminalError);
      return;
    }
    if (closed || !child.stdin.writable) {
      reject(new Error('MCP router is not writable'));
      return;
    }
    const id = ++requestId;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`MCP ${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timeout });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, (error) => {
      if (!error) return;
      const active = pending.get(id);
      if (!active) return;
      pending.delete(id);
      clearTimeout(active.timeout);
      active.reject(error);
    });
  });

  const initialized = request('initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'rudi-cli', version: '1.0.0' },
  }).then(() => {
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    })}\n`);
  });

  return {
    async callJsonTool(toolName, input = {}) {
      await initialized;
      const result = await request('tools/call', {
        name: toolName,
        arguments: input,
      });
      return parseJsonToolResult(result, toolName);
    },
    async close() {
      if (closed) return;
      closed = true;
      lines.close();
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise((resolve) => child.once('exit', () => resolve('exited')));
      child.kill('SIGTERM');
      let timerId;
      const timer = new Promise((resolve) => {
        timerId = setTimeout(resolve, 1_000, 'timeout');
      });
      const closeResult = await Promise.race([exited, timer]);
      clearTimeout(timerId);
      if (closeResult === 'timeout'
        && child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
        await exited;
      }
    },
  };
}
