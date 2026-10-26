import { randomUUID } from 'node:crypto';

// jsdom does not expose crypto.randomUUID
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { ...globalThis.crypto, randomUUID },
  });
}

// jsdom lacks the streams API used to read streaming responses
import { ReadableStream, TextDecoderStream } from 'node:stream/web';
import { TextEncoder } from 'node:util';

Object.assign(globalThis, { ReadableStream, TextDecoderStream, TextEncoder });
