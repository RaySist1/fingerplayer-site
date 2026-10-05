/** Movy / api.wecollege.net miami payload decrypt (seed + enc=2). */

const MAGIC = [109, 118, 109, 49]; // mvm1
const TABLE = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
  0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174,
];

function isEvenTriangle(n) {
  return ((n * (n + 1)) & 1) === 0;
}

function mix(value) {
  let e = value >>> 0;
  e ^= e >>> 16;
  e = Math.imul(e, 0x85ebca6b) >>> 0;
  e ^= e >>> 13;
  e = Math.imul(e, 0xc2b2ae35) >>> 0;
  return (e ^= e >>> 16) >>> 0;
}

function rotl(value, bits) {
  const e = value >>> 0;
  const a = bits & 31;
  return a === 0 ? e >>> 0 : ((e << a) | (e >>> (32 - a))) >>> 0;
}

function fnv1a(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x1000193) >>> 0;
  }
  return mix(hash);
}

function makeState(seed, mediaId) {
  const S = Array(61);
  let n = mix(fnv1a(seed) ^ mix((Number(mediaId) >>> 0) ^ 0x9e3779b9)) >>> 0;

  for (let i = 0; i < 8; i += 1) {
    if (isEvenTriangle(i)) {
      const slot = n % 61;
      n = rotl((n + 0x9e3779b9) >>> 0, 7 + (7 & i));
      S[slot] = (n ^ mix(n)) >>> 0;
      n = mix((n + slot) >>> 0);
    } else {
      S[i] = TABLE[15 & i];
    }
  }

  return { S, acc: mix(0xa5a5a5a5 ^ n) >>> 0 };
}

function nextWord(state, index) {
  const table = state.S;
  let acc = state.acc;
  const slot = acc % 61;
  const present = 0 - Number(slot in table);
  const cell = table[slot] >>> 0;
  const counter = Math.imul(0x9e3779b9, index + 1) >>> 0;
  const mixed = (cell ^ counter) >>> 0;
  let word = (((acc ^ mixed) >>> 0) | ((acc & mixed & present) >>> 0)) >>> 0;
  word = (rotl((word + acc) >>> 0, 31 & slot) ^ rotl(acc, 31 & Math.imul(slot, 7))) >>> 0;
  acc = mix((word + 0x9e3779b9) >>> 0);
  table[slot] = acc >>> 0;
  state.acc = acc;
  return acc >>> 0;
}

function keystream(seed, mediaId, length) {
  const state = makeState(seed, mediaId);
  const out = new Uint8Array(length);
  let offset = 0;
  let wordIndex = 0;

  while (offset < length) {
    const word = nextWord(state, wordIndex);
    wordIndex += 1;
    out[offset++] = word & 255;
    if (offset < length) out[offset++] = (word >>> 8) & 255;
    if (offset < length) out[offset++] = (word >>> 16) & 255;
    if (offset < length) out[offset++] = (word >>> 24) & 255;
  }

  return out;
}

/**
 * @param {string} ciphertext Base64url payload from /miami/sources
 * @param {string} seed From /seed?mediaId=
 * @param {string | number} mediaId TMDB id
 */
export function decryptMovySources(ciphertext, seed, mediaId) {
  const padded = String(ciphertext || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(4 * Math.ceil(String(ciphertext || '').length / 4), '=');
  const bytes = Uint8Array.from(Buffer.from(padded, 'base64'));
  const stream = keystream(String(seed || ''), Number(mediaId), bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] ^= stream[i];
  }

  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error('Movy decrypt failed: bad seed or tampered payload');
    }
  }

  return Buffer.from(bytes.subarray(MAGIC.length)).toString('utf8');
}
