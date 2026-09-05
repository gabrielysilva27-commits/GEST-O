import LZString from './vendor/lz-string.js';

const KEY = 'lead-gestao-db-v2';
const PREFIX = 'lead-lz-v1:';
let lastStored, lastValue;

// Keep the complete database locally, compressed; server persistence is unchanged.
// Plain JSON from existing sessions is accepted and migrated on the next write.
export const databaseStorage = {
  getItem(key) {
    const stored = globalThis.localStorage.getItem(key);
    if (key !== KEY || stored === null || !stored.startsWith(PREFIX)) return stored;
    if (stored === lastStored) return lastValue;
    const value = LZString.decompressFromUTF16(stored.slice(PREFIX.length));
    if (!value) throw new Error('Não foi possível ler a base local.');
    lastStored = stored;
    lastValue = value;
    return value;
  },
  setItem(key, value) {
    if (key !== KEY) return globalThis.localStorage.setItem(key, value);
    const text = String(value);
    if (text === lastValue && globalThis.localStorage.getItem(key) === lastStored) return;
    const stored = PREFIX + LZString.compressToUTF16(text);
    globalThis.localStorage.setItem(key, stored);
    lastStored = stored;
    lastValue = text;
  },
  removeItem(key) {
    globalThis.localStorage.removeItem(key);
    if (key === KEY) { lastStored = undefined; lastValue = undefined; }
  }
};
