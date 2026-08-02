import fs from 'node:fs';
import path from 'node:path';

import { DAEMON_OPENAPI } from '../src/contracts/daemon-openapi.js';

const outputPath = path.resolve('docs/daemon/openapi.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(DAEMON_OPENAPI, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
