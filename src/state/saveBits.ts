/** Portable canonical RFC4648. No Buffer/browser globals on Hermes. */
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).every(k => !['__proto__','constructor','prototype'].includes(k));
export const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
export const uint = (v: unknown, max = 0xffffffff): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
export const asciiId = (v: unknown, max = 80): v is string => typeof v === 'string' && new RegExp(`^[a-z0-9][a-z0-9:._-]{0,${max - 1}}$`).test(v) && !['constructor','prototype','__proto__'].includes(v);
export const hashId = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export function utf8Bytes(raw: string): number {
  let bytes = 0;
  for (const c of raw) { const point = c.codePointAt(0)!; bytes += point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4; }
  return bytes;
}
export const jsonBytes = (value: unknown) => utf8Bytes(JSON.stringify(value));
export function base64(bytes: readonly number[]): string {
  let text = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = bytes[i] * 65536 + (bytes[i + 1] ?? 0) * 256 + (bytes[i + 2] ?? 0);
    text += alphabet[n >>> 18] + alphabet[(n >>> 12) & 63] + (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[n & 63] : '=');
  }
  return text;
}
export function unbase64(text: unknown, byteLength: number): number[] | null {
  if (typeof text !== 'string' || text.length !== Math.ceil(byteLength / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 4) {
    const n = alphabet.indexOf(text[i]) * 262144 + alphabet.indexOf(text[i + 1]) * 4096 + Math.max(0, alphabet.indexOf(text[i + 2])) * 64 + Math.max(0, alphabet.indexOf(text[i + 3]));
    bytes.push((n >>> 16) & 255);
    if (text[i + 2] !== '=') bytes.push((n >>> 8) & 255);
    if (text[i + 3] !== '=') bytes.push(n & 255);
  }
  return bytes.length === byteLength && base64(bytes) === text ? bytes : null;
}
export function pack(values: readonly number[], width: number): string {
  if (!uint(width, 16) || width === 0 || values.some(n => !uint(n, 2 ** width - 1))) throw new Error('Invalid packed values.');
  const bytes = Array<number>(Math.ceil(values.length * width / 8)).fill(0);
  values.forEach((n, i) => { for (let bit = 0; bit < width; bit++) if (n & (1 << bit)) { const at = i * width + bit; bytes[at >>> 3] |= 1 << (at & 7); } });
  return base64(bytes);
}
export function unpack(text: unknown, count: number, width: number): number[] | null {
  const bytes = unbase64(text, Math.ceil(count * width / 8)); if (!bytes) return null;
  const used = count * width % 8;
  if (used && bytes[bytes.length - 1] >>> used) return null;
  return Array.from({ length: count }, (_, i) => { let n = 0; for (let bit = 0; bit < width; bit++) { const at = i * width + bit; n |= ((bytes[at >>> 3] >>> (at & 7)) & 1) << bit; } return n; });
}
/** Fixed-width adapter deltas: retain newest entries, never truncate the canonical draft. */
export function appendUndo(ring: readonly number[], delta: number, capacity: number): number[] {
  if (!uint(delta) || !uint(capacity, 1024) || !capacity) throw new Error('Invalid undo delta.');
  return [...ring, delta].slice(-capacity);
}
