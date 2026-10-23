import { randomUUID } from 'node:crypto';

// jsdom does not expose crypto.randomUUID
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID },
  });
}
