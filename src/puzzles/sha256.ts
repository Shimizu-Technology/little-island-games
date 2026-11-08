/** SHA-256 over the UTF-8 bytes of a JS string. Hermes has no crypto global and packs must verify offline. */
const K = new Int32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export type Sha256 = { update(text: string, start?: number, end?: number): void; hex(): string; bytes(): number };

export function createSha256(): Sha256 {
  const h = new Int32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Int32Array(64), block = new Uint8Array(64);
  let used = 0, total = 0, pendingHigh = 0;
  const compress = () => {
    for (let i = 0; i < 16; i++) w[i] = (block[i * 4] << 24) | (block[i * 4 + 1] << 16) | (block[i * 4 + 2] << 8) | block[i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], j = h[7];
    for (let i = 0; i < 64; i++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (j + s1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      j = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += j;
  };
  const push = (byte: number) => {
    block[used++] = byte;
    total++;
    if (used === 64) { compress(); used = 0; }
  };
  const point = (code: number) => {
    if (code < 0x80) push(code);
    else if (code < 0x800) { push(0xc0 | (code >> 6)); push(0x80 | (code & 63)); }
    else if (code < 0x10000) { push(0xe0 | (code >> 12)); push(0x80 | ((code >> 6) & 63)); push(0x80 | (code & 63)); }
    else { push(0xf0 | (code >> 18)); push(0x80 | ((code >> 12) & 63)); push(0x80 | ((code >> 6) & 63)); push(0x80 | (code & 63)); }
  };
  return {
    // A surrogate pair split across two slices is held until its second half arrives.
    update(text, start = 0, end = text.length) {
      for (let i = start; i < end; i++) {
        const code = text.charCodeAt(i);
        if (pendingHigh) {
          const high = pendingHigh;
          pendingHigh = 0;
          if (code >= 0xdc00 && code <= 0xdfff) { point(0x10000 + ((high - 0xd800) << 10) + (code - 0xdc00)); continue; }
          point(0xfffd);
        }
        if (code >= 0xd800 && code <= 0xdbff) pendingHigh = code;
        else if (code >= 0xdc00 && code <= 0xdfff) point(0xfffd);
        else point(code);
      }
    },
    bytes: () => total,
    hex() {
      if (pendingHigh) { point(0xfffd); pendingHigh = 0; }
      const bits = total * 8, length = total;
      push(0x80);
      while (used !== 56) push(0);
      const high = Math.floor(bits / 0x100000000), low = bits >>> 0;
      for (const n of [high, low]) { push(n >>> 24); push((n >>> 16) & 255); push((n >>> 8) & 255); push(n & 255); }
      total = length;
      return Array.from(h, n => (n >>> 0).toString(16).padStart(8, '0')).join('');
    },
  };
}
export function sha256Hex(text: string): string {
  const sha = createSha256();
  sha.update(text);
  return sha.hex();
}
export type Slicing = { budgetMs: number; now: () => number; pause: () => Promise<void>; cancelled?: () => boolean };
/** Hashes in slices so a pack check never holds one long main-thread chunk. Returns null when cancelled. */
export async function sha256Sliced(text: string, slicing: Slicing): Promise<{ hex: string; bytes: number } | null> {
  const sha = createSha256(), step = 2048;
  let at = 0, started = slicing.now();
  if (slicing.cancelled?.()) return null;
  while (at < text.length) {
    const end = Math.min(text.length, at + step);
    sha.update(text, at, end);
    at = end;
    if (at < text.length && slicing.now() - started >= slicing.budgetMs) {
      await slicing.pause();
      if (slicing.cancelled?.()) return null;
      started = slicing.now();
    }
  }
  if (slicing.cancelled?.()) return null;
  const bytes = sha.bytes(), hex = sha.hex();
  return { hex, bytes };
}
