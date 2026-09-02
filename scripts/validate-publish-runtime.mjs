#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MINIMUM_TRUSTED_PUBLISHING_NPM = [11, 5, 1];

export function supportsTrustedPublishingNpm(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(version);
  if (!match) return false;

  const actual = match.slice(1, 4).map(Number);
  for (let index = 0; index < MINIMUM_TRUSTED_PUBLISHING_NPM.length; index += 1) {
    if (actual[index] > MINIMUM_TRUSTED_PUBLISHING_NPM[index]) return true;
    if (actual[index] < MINIMUM_TRUSTED_PUBLISHING_NPM[index]) return false;
  }
  return true;
}

export function assertTrustedPublishingNpm(version) {
  if (!supportsTrustedPublishingNpm(version)) {
    throw new Error(`npm ${version || '<missing>'} does not support trusted publishing; require >=11.5.1`);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  assertTrustedPublishingNpm(process.argv[2] || '');
}
