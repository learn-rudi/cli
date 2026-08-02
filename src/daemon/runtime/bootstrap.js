/**
 * Startup helpers for the local daemon process.
 */

import fs from 'fs';
import path from 'path';
import { PATHS } from '@learnrudi/env';

export const PORT_FILE = path.join(PATHS.home, 'daemon.port');
export const TOKEN_FILE = path.join(PATHS.home, 'daemon.token');

export function parseRequestedPort(flags = {}) {
  return Number.parseInt(flags.port, 10) || 0;
}

export function writeConnectionFiles({ port, token, portFile = PORT_FILE, tokenFile = TOKEN_FILE }) {
  fs.mkdirSync(PATHS.home, { recursive: true });
  fs.writeFileSync(portFile, String(port), { mode: 0o600 });
  fs.writeFileSync(tokenFile, token, { mode: 0o600 });
}

export function removeConnectionFiles({ portFile = PORT_FILE, tokenFile = TOKEN_FILE } = {}) {
  try { fs.unlinkSync(portFile); } catch {}
  try { fs.unlinkSync(tokenFile); } catch {}
}

export function startDaemonHttpServer(server, {
  port,
  host = '127.0.0.1',
  onListening,
} = {}) {
  server.listen(port || 0, host, () => {
    const address = server.address();
    const actualPort = typeof address === 'object' && address ? address.port : port;
    onListening?.(actualPort);
  });
}

export function printStartupBanner({
  port,
  pid = process.pid,
  portFile = PORT_FILE,
  tokenFile = TOKEN_FILE,
  writeLine = console.log,
}) {
  writeLine('');
  writeLine('═'.repeat(50));
  writeLine('  RUDI Local Daemon');
  writeLine('═'.repeat(50));
  writeLine(`  Port:  ${port}`);
  writeLine(`  PID:   ${pid}`);
  writeLine('');
  writeLine(`  Port file:  ${portFile}`);
  writeLine(`  Token file: ${tokenFile}`);
  writeLine('═'.repeat(50));
  writeLine('');
}
