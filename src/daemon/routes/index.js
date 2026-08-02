import {
  buildDaemonHealthRoutes,
  createHealthResponse,
} from './health.js';
import { buildEnvRoutes } from './env.js';
import { buildLocalLlmRoutes } from './local-llm.js';
import { buildAgentHostRoutes } from './agent-host.js';
import { buildPackageRoutes } from './packages.js';

export {
  buildAgentHostRoutes,
  buildDaemonHealthRoutes,
  buildEnvRoutes,
  buildLocalLlmRoutes,
  buildPackageRoutes,
  createHealthResponse,
};
