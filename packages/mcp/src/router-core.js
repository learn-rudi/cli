import { buildPortableToolNameMap } from './tool-names.js';

export const ROUTER_CORE_VERSION = '1.1.0';

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function canonicalToolName(stackId, toolName) {
  const stack = nonEmptyString(stackId, 'stackId');
  const tool = nonEmptyString(toolName, 'toolName');
  if (stack.includes('.')) throw new Error('stackId cannot contain a dot');
  return `${stack}.${tool}`;
}

export function parseCanonicalToolName(value) {
  const name = nonEmptyString(value, 'tool name');
  const dotIndex = name.indexOf('.');
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    throw new Error(`Invalid tool name format: ${name} (expected: stack.tool_name)`);
  }
  return {
    stackId: name.slice(0, dotIndex),
    toolName: name.slice(dotIndex + 1),
  };
}

function namespaceTools(discovered) {
  if (!Array.isArray(discovered)) {
    throw new Error('discoverStackTools must return an array');
  }
  const names = new Set();
  const tools = [];
  for (const entry of discovered) {
    const stackId = nonEmptyString(entry?.stackId, 'stackId');
    if (!Array.isArray(entry?.tools)) {
      throw new Error(`tools for ${stackId} must be an array`);
    }
    for (const tool of entry.tools) {
      const name = canonicalToolName(stackId, tool?.name);
      if (names.has(name)) throw new Error(`Duplicate tool name: ${name}`);
      names.add(name);
      tools.push({
        name,
        description: `[${stackId}] ${tool.description || tool.name}`,
        inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      });
    }
  }
  return tools;
}

export function createRouterDispatcher(options) {
  if (typeof options?.discoverStackTools !== 'function') {
    throw new Error('discoverStackTools adapter is required');
  }
  if (typeof options?.executeStackTool !== 'function') {
    throw new Error('executeStackTool adapter is required');
  }
  const protocolVersion = options.protocolVersion || '2024-11-05';
  const serverInfo = options.serverInfo || { name: 'rudi-router', version: '1.0.0' };
  const toolNameStyle = options.toolNameStyle === 'portable' ? 'portable' : 'canonical';
  const callPolicy = options.callPolicy === 'adapter-authoritative'
    ? 'adapter-authoritative'
    : 'discovered-only';
  let canonicalNames = new Set();
  let portableToCanonical = new Map();

  async function listTools() {
    const tools = namespaceTools(await options.discoverStackTools());
    canonicalNames = new Set(tools.map((tool) => tool.name));
    if (toolNameStyle !== 'portable') return tools;
    const mapping = buildPortableToolNameMap(tools.map((tool) => tool.name));
    portableToCanonical = mapping.portableToCanonical;
    return tools.map((tool) => ({
      ...tool,
      name: mapping.canonicalToPortable.get(tool.name),
    }));
  }

  async function callTool(requestedName, arguments_ = {}) {
    let name = requestedName;
    let parsed;
    if (toolNameStyle === 'portable') {
      if (portableToCanonical.size === 0) await listTools();
      name = portableToCanonical.get(requestedName);
      if (!name) throw new Error(`Unknown portable tool name: ${requestedName}`);
    } else if (callPolicy === 'discovered-only') {
      parsed = parseCanonicalToolName(requestedName);
      if (canonicalNames.size === 0) await listTools();
      if (!canonicalNames.has(requestedName)) {
        throw new Error(`Unknown canonical tool name: ${requestedName}`);
      }
    }
    parsed ||= parseCanonicalToolName(name);
    return options.executeStackTool({
      stackId: parsed.stackId,
      toolName: parsed.toolName,
      arguments: arguments_,
    });
  }

  async function handleRequest(request) {
    const response = { jsonrpc: '2.0', id: request.id ?? null };
    try {
      switch (request.method) {
        case 'initialize':
          response.result = {
            protocolVersion,
            capabilities: { tools: {} },
            serverInfo,
          };
          break;
        case 'notifications/initialized':
          return null;
        case 'tools/list':
          response.result = { tools: await listTools() };
          break;
        case 'tools/call':
          response.result = await callTool(
            request.params.name,
            request.params.arguments || {}
          );
          break;
        case 'ping':
          response.result = {};
          break;
        default:
          if (request.id === null || request.id === undefined) return null;
          response.error = {
            code: -32601,
            message: `Method not found: ${request.method}`,
          };
      }
    } catch (error) {
      response.error = {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      };
    }
    return response;
  }

  return Object.freeze({ listTools, callTool, handleRequest });
}
