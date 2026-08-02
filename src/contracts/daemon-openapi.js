const AUTH = [{ RudiToken: [] }];
const JSON_RESPONSE = {
  description: 'Successful JSON response',
  content: {
    'application/json': {
      schema: { type: 'object', additionalProperties: true },
    },
  },
};
const ERROR_RESPONSES = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  404: { $ref: '#/components/responses/NotFound' },
  500: { $ref: '#/components/responses/InternalError' },
};

function jsonOperation(summary, options = {}) {
  const operation = {
    summary,
    tags: options.tags || ['Daemon'],
    responses: {
      200: JSON_RESPONSE,
      ...(options.errors === false ? {} : ERROR_RESPONSES),
    },
  };
  if (options.auth !== false) operation.security = AUTH;
  if (options.parameters) operation.parameters = options.parameters;
  if (options.requestBody) operation.requestBody = options.requestBody;
  return operation;
}

function pathParameter(name, description = `${name} identifier`) {
  return {
    name,
    in: 'path',
    required: true,
    description,
    schema: { type: 'string', minLength: 1 },
  };
}

function queryParameter(name, options = {}) {
  return {
    name,
    in: 'query',
    required: options.required === true,
    schema: options.schema || { type: 'string' },
    ...(options.description ? { description: options.description } : {}),
  };
}

function jsonBody(schema) {
  return {
    required: true,
    content: {
      'application/json': { schema },
    },
  };
}

const launchProperties = {
  launchId: { type: 'string', minLength: 1 },
  originDirectory: { type: 'string', minLength: 1 },
  prompt: { type: 'string', minLength: 1, maxLength: 10485760 },
  provider: { type: 'string', enum: ['claude', 'codex', 'google'] },
  workspace: { type: 'string', minLength: 1 },
  workspaceMode: { type: 'string', enum: ['auto', 'read-only', 'worktree', 'isolated-copy'] },
  model: { type: 'string', minLength: 1 },
  permissionMode: { type: 'string', minLength: 1 },
  approvalMode: { type: 'string', minLength: 1 },
  timeoutMs: { type: 'integer', minimum: 1, maximum: 86400000 },
  extraArgs: { type: 'array', maxItems: 100, items: { type: 'string' } },
  images: { type: 'array', maxItems: 100, items: { type: 'string' } },
};

const launchBody = {
  type: 'object',
  additionalProperties: false,
  required: ['launchId', 'originDirectory', 'prompt', 'provider'],
  properties: launchProperties,
};

const resumeBody = {
  type: 'object',
  additionalProperties: false,
  required: ['launchId', 'prompt'],
  properties: {
    launchId: launchProperties.launchId,
    prompt: launchProperties.prompt,
    model: launchProperties.model,
    permissionMode: launchProperties.permissionMode,
    approvalMode: launchProperties.approvalMode,
    timeoutMs: launchProperties.timeoutMs,
    extraArgs: launchProperties.extraArgs,
    images: launchProperties.images,
  },
};

const groupBody = {
  type: 'object',
  additionalProperties: false,
  required: ['groupId', 'originDirectory', 'tasks', 'workspace'],
  properties: {
    groupId: { type: 'string', minLength: 1 },
    originDirectory: launchProperties.originDirectory,
    workspace: launchProperties.workspace,
    workspaceMode: launchProperties.workspaceMode,
    tasks: {
      type: 'array',
      minItems: 2,
      maxItems: 10,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['launchId', 'prompt', 'provider'],
        properties: {
          launchId: launchProperties.launchId,
          prompt: launchProperties.prompt,
          provider: launchProperties.provider,
          model: launchProperties.model,
          permissionMode: launchProperties.permissionMode,
          approvalMode: launchProperties.approvalMode,
          timeoutMs: launchProperties.timeoutMs,
          extraArgs: launchProperties.extraArgs,
          images: launchProperties.images,
        },
      },
    },
  },
};

export const DAEMON_OPENAPI = Object.freeze({
  openapi: '3.1.0',
  info: {
    title: 'RUDI Local Daemon API',
    version: '1.0.0',
    description: 'Local authenticated capability API. Native agent providers own normal execution and authoritative transcripts; Agent Host stores bounded launch pointers and reconnect events.',
  },
  servers: [{
    url: 'http://127.0.0.1:{port}',
    variables: {
      port: {
        default: '8100',
        description: 'Dynamic daemon port written to ~/.rudi/daemon.port',
      },
    },
  }],
  tags: [
    { name: 'Daemon', description: 'Lifecycle and readiness' },
    { name: 'Capabilities', description: 'Local package, secret, runtime, and environment capabilities' },
    { name: 'Agent Host', description: 'Thin provider-native launch control and reconnect pointers' },
  ],
  paths: {
    '/health': {
      get: jsonOperation('Daemon liveness', { auth: false, errors: false }),
    },
    '/ready': {
      get: jsonOperation('Daemon readiness'),
    },
    '/version': {
      get: jsonOperation('Daemon API version'),
    },
    '/daemon/status': {
      get: jsonOperation('Daemon runtime status'),
    },
    '/env': {
      get: jsonOperation('Local host environment summary', { tags: ['Capabilities'] }),
    },
    '/local-llm/status': {
      get: jsonOperation('Local LLM runtime status', {
        tags: ['Capabilities'],
        parameters: [
          queryParameter('runtime'),
          queryParameter('target'),
          queryParameter('consumer'),
          queryParameter('timeoutMs', { schema: { type: 'integer', minimum: 1 } }),
        ],
      }),
    },
    '/local-llm/models': {
      get: jsonOperation('Available local LLM models', { tags: ['Capabilities'] }),
    },
    '/local-llm/env/{consumer}': {
      get: jsonOperation('Consumer-specific local LLM environment', {
        tags: ['Capabilities'],
        parameters: [pathParameter('consumer')],
      }),
    },
    '/runtimes/{runtime}/status': {
      get: jsonOperation('Named runtime status', {
        tags: ['Capabilities'],
        parameters: [pathParameter('runtime')],
      }),
    },
    '/packages/search': {
      get: jsonOperation('Search the package registry', {
        tags: ['Capabilities'],
        parameters: [
          queryParameter('q', { required: true }),
          queryParameter('kind'),
        ],
      }),
    },
    '/packages/list': {
      get: jsonOperation('List registry packages by kind', {
        tags: ['Capabilities'],
        parameters: [queryParameter('kind', { required: true })],
      }),
    },
    '/packages/installed': {
      get: jsonOperation('List installed stacks', { tags: ['Capabilities'] }),
    },
    '/packages/install': {
      post: jsonOperation('Start an idempotent package installation job', {
        tags: ['Capabilities'],
        requestBody: jsonBody({
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string', minLength: 1 },
            force: { type: 'boolean' },
          },
        }),
      }),
    },
    '/packages/jobs/{jobId}': {
      get: jsonOperation('Inspect a package installation job', {
        tags: ['Capabilities'],
        parameters: [pathParameter('jobId')],
      }),
    },
    '/packages/secrets': {
      get: jsonOperation('List masked secret metadata', { tags: ['Capabilities'] }),
      post: jsonOperation('Set a local secret', {
        tags: ['Capabilities'],
        requestBody: jsonBody({
          type: 'object',
          additionalProperties: false,
          required: ['name', 'value'],
          properties: {
            name: { type: 'string', pattern: '^[A-Z][A-Z0-9_]*$' },
            value: { type: 'string' },
          },
        }),
      }),
    },
    '/packages/secrets/{name}': {
      delete: jsonOperation('Remove a local secret', {
        tags: ['Capabilities'],
        parameters: [pathParameter('name')],
      }),
    },
    '/agent-host/v1/hosts': {
      get: jsonOperation('Inspect native agent host readiness', { tags: ['Agent Host'] }),
    },
    '/agent-host/v1/models/{provider}': {
      get: jsonOperation('List declared models for a native host', {
        tags: ['Agent Host'],
        parameters: [pathParameter('provider')],
      }),
    },
    '/agent-host/v1/launches': {
      get: jsonOperation('List launch pointers', {
        tags: ['Agent Host'],
        parameters: [
          queryParameter('status'),
          queryParameter('limit', { schema: { type: 'integer', minimum: 1, maximum: 1000 } }),
        ],
      }),
      post: jsonOperation('Dispatch an idempotent detached native-host launch', {
        tags: ['Agent Host'],
        requestBody: jsonBody(launchBody),
      }),
    },
    '/agent-host/v1/launches/{launchId}': {
      get: jsonOperation('Inspect a launch pointer', {
        tags: ['Agent Host'],
        parameters: [pathParameter('launchId')],
      }),
    },
    '/agent-host/v1/launches/{launchId}/events': {
      get: jsonOperation('Read bounded normalized reconnect events', {
        tags: ['Agent Host'],
        parameters: [
          pathParameter('launchId'),
          queryParameter('offset', { schema: { type: 'integer', minimum: 0 } }),
          queryParameter('limitBytes', { schema: { type: 'integer', minimum: 1, maximum: 10485760 } }),
        ],
      }),
    },
    '/agent-host/v1/launches/{launchId}/resume': {
      post: jsonOperation('Resume the provider-owned native session', {
        tags: ['Agent Host'],
        parameters: [pathParameter('launchId')],
        requestBody: jsonBody(resumeBody),
      }),
    },
    '/agent-host/v1/launches/{launchId}/{operation}': {
      get: jsonOperation('Read the current launch diff', {
        tags: ['Agent Host'],
        parameters: [
          pathParameter('launchId'),
          {
            ...pathParameter('operation'),
            schema: { type: 'string', enum: ['diff'] },
          },
        ],
      }),
      post: jsonOperation('Apply a bounded launch lifecycle operation', {
        tags: ['Agent Host'],
        parameters: [
          pathParameter('launchId'),
          {
            ...pathParameter('operation'),
            schema: { type: 'string', enum: ['stop', 'promote', 'discard'] },
          },
        ],
      }),
    },
    '/agent-host/v1/groups': {
      get: jsonOperation('List Agent Host group pointers', {
        tags: ['Agent Host'],
        parameters: [
          queryParameter('limit', { schema: { type: 'integer', minimum: 1, maximum: 1000 } }),
        ],
      }),
      post: jsonOperation('Dispatch an idempotent provider-neutral group', {
        tags: ['Agent Host'],
        requestBody: jsonBody(groupBody),
      }),
    },
    '/agent-host/v1/groups/{groupId}': {
      get: jsonOperation('Inspect an Agent Host group pointer', {
        tags: ['Agent Host'],
        parameters: [pathParameter('groupId')],
      }),
    },
    '/agent-host/v1/groups/{groupId}/stop': {
      post: jsonOperation('Stop non-terminal launches in a group', {
        tags: ['Agent Host'],
        parameters: [pathParameter('groupId')],
      }),
    },
  },
  components: {
    securitySchemes: {
      RudiToken: {
        type: 'apiKey',
        in: 'header',
        name: 'x-rudi-token',
        description: 'Local daemon token read from ~/.rudi/daemon.token',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        additionalProperties: false,
        required: ['error', 'code'],
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string' },
          details: { type: 'object', additionalProperties: true },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Missing or invalid local daemon token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      InternalError: {
        description: 'Internal daemon error',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
});
