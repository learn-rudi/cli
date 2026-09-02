export interface RouterToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export const ROUTER_CORE_VERSION: '1.1.0';

export interface StackToolDiscovery {
  stackId: string;
  tools: RouterToolDefinition[];
}

export interface StackToolCall {
  stackId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface RouterDispatcherOptions {
  protocolVersion?: string;
  serverInfo?: { name: string; version: string };
  toolNameStyle?: 'canonical' | 'portable';
  callPolicy?: 'discovered-only' | 'adapter-authoritative';
  discoverStackTools(): Promise<StackToolDiscovery[]>;
  executeStackTool(call: StackToolCall): Promise<unknown>;
}

export interface RouterDispatcher {
  listTools(): Promise<Array<Required<RouterToolDefinition>>>;
  callTool(name: string, arguments_?: Record<string, unknown>): Promise<unknown>;
  handleRequest(request: Record<string, unknown>): Promise<Record<string, unknown> | null>;
}

export function canonicalToolName(stackId: string, toolName: string): string;
export function parseCanonicalToolName(value: string): {
  stackId: string;
  toolName: string;
};
export function createRouterDispatcher(options: RouterDispatcherOptions): RouterDispatcher;
