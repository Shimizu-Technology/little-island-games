import { utf8Bytes } from '../state/saveBits';
import { BANK_CAPS, locate, packAsset, parsePack, validFamily, type FamilyManifest, type PackRow, type RootIndex } from './bank';
import { decodeRow, withRef } from './descriptor';
import { sha256Hex, sha256Sliced } from './sha256';
import type { PuzzleAdapter, PuzzleDescriptor } from './types';

export type BankTransport = { read(asset: string): Promise<string> };
export type BankErrorKind = 'unknown' | 'read-failed' | 'too-large' | 'hash-mismatch' | 'malformed' | 'cancelled';
export class BankError extends Error {
  kind: BankErrorKind;
  constructor(kind: BankErrorKind, message: string) { super(message); this.kind = kind; this.name = 'BankError'; }
}
export type CancelToken = { cancelled: boolean };
export type OpenTiming = { kind: 'cold' | 'warm'; ms: number; slot: number };
export type LoadedPack = { row: PackRow; rows: readonly string[]; band: string; family: string };
export type LoaderOptions = {
  root: RootIndex;
  transport: BankTransport;
  now?: () => number;
  pause?: () => Promise<void>;
  budgetMs?: number;
  packCapacity?: number;
};
const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const defaultPause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const FAMILY_CACHE = 4, TIMING_RING = 256;

/**
 * Reads one family manifest on entry, then one pack at a time, and holds at most two packs. A pack
 * is verified against its manifest hash in short slices. Rows stay as text until they are opened.
 */
export function createBankLoader(options: LoaderOptions) {
  const { root, transport, now = defaultNow, pause = defaultPause, budgetMs = 8 } = options;
  const capacity = options.packCapacity ?? BANK_CAPS.decodedPacks;
  const families = new Map<string, FamilyManifest>();
  const packs = new Map<number, LoadedPack>();
  const inFlight = new Map<number, Promise<LoadedPack>>();
  const timings: OpenTiming[] = [];
  let generation = 0, queue: Promise<unknown> = Promise.resolve();
  const slicing = (gen: number) => ({ budgetMs, now, pause, cancelled: () => gen !== generation });
  const record = (timing: OpenTiming) => { timings.push(timing); if (timings.length > TIMING_RING) timings.shift(); };
  const read = async (asset: string) => {
    try { return await transport.read(asset); }
    catch { throw new BankError('read-failed', `Could not read puzzle asset ${asset}.`); }
  };
  const checkToken = (token?: CancelToken) => { if (token?.cancelled) throw new BankError('cancelled', 'Puzzle load was cancelled.'); };

  async function family(id: string, token?: CancelToken): Promise<FamilyManifest> {
    const memo = families.get(id);
    if (memo) { families.delete(id); families.set(id, memo); return memo; }
    const entry = root.families.find(f => f[0] === id);
    if (!entry) throw new BankError('unknown', `Unknown puzzle family ${id}.`);
    const gen = generation;
    const text = await read(entry[1]);
    checkToken(token);
    if (utf8Bytes(text) > BANK_CAPS.familyBytes) throw new BankError('too-large', `Manifest for ${id} is over its limit.`);
    const checked = await sha256Sliced(text, slicing(gen));
    if (!checked) throw new BankError('cancelled', 'Puzzle load was cancelled.');
    if (checked.hex !== entry[2]) throw new BankError('hash-mismatch', `Manifest for ${id} failed its hash.`);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { throw new BankError('malformed', `Manifest for ${id} is not JSON.`); }
    if (!validFamily(parsed) || parsed.family !== id) throw new BankError('malformed', `Manifest for ${id} is invalid.`);
    families.set(id, parsed);
    if (families.size > FAMILY_CACHE) families.delete(families.keys().next().value as string);
    return parsed;
  }

  async function load(manifest: FamilyManifest, row: PackRow, gen: number): Promise<LoadedPack> {
    const slot = row[0], started = now();
    // Evict before reading, so the peak is two packs plus the one being checked.
    while (packs.size >= capacity) packs.delete(packs.keys().next().value as number);
    const text = await read(packAsset(slot));
    if (gen !== generation) throw new BankError('cancelled', 'Puzzle load was cancelled.');
    if (text.length > BANK_CAPS.packBytes) throw new BankError('too-large', `Pack ${slot} is over its limit.`);
    const checked = await sha256Sliced(text, slicing(gen));
    if (!checked) throw new BankError('cancelled', 'Puzzle load was cancelled.');
    if (checked.bytes !== row[3] || checked.hex !== row[4]) throw new BankError('hash-mismatch', `Pack ${slot} failed its hash.`);
    const parsed = parsePack(text, row, manifest);
    if (!parsed) throw new BankError('malformed', `Pack ${slot} is malformed.`);
    const loaded: LoadedPack = { row, rows: parsed.rows, band: parsed.header.band, family: manifest.family };
    packs.set(slot, loaded);
    record({ kind: 'cold', ms: now() - started, slot });
    return loaded;
  }

  async function pack(manifest: FamilyManifest, row: PackRow, token?: CancelToken): Promise<LoadedPack> {
    checkToken(token);
    const slot = row[0], started = now(), warm = packs.get(slot);
    if (warm) {
      packs.delete(slot);
      packs.set(slot, warm);
      record({ kind: 'warm', ms: now() - started, slot });
      return warm;
    }
    let pending = inFlight.get(slot);
    if (!pending) {
      const gen = generation;
      // One read at a time keeps the memory peak predictable.
      pending = queue.then(() => load(manifest, row, gen)).finally(() => inFlight.delete(slot));
      queue = pending.catch(() => undefined);
      inFlight.set(slot, pending);
    }
    const loaded = await pending;
    checkToken(token);
    return loaded;
  }

  /** Decodes one row. The caller's adapter validates it, and the ref carries the row's own hash. */
  async function entry<P, S, A>(adapter: PuzzleAdapter<P, S, A>, familyId: string, ordinal: number, token?: CancelToken): Promise<PuzzleDescriptor<P>> {
    const manifest = await family(familyId, token);
    const place = locate(manifest, ordinal);
    if (!place) throw new BankError('unknown', `Ordinal ${ordinal} is not in ${familyId}.`);
    if (manifest.engine !== adapter.engine || place.row[6] !== adapter.rules) throw new BankError('malformed', `Pack ${place.row[0]} needs a different engine revision.`);
    const loaded = await pack(manifest, place.row, token);
    const line = loaded.rows[place.index];
    const core = decodeRow<P>(line, loaded.band, adapter);
    if (!core) throw new BankError('malformed', `Row ${place.index} of pack ${place.row[0]} is invalid.`);
    return withRef(core, { bank: place.row[0], puzzle: place.index, engine: adapter.engine, rules: adapter.rules, hash: sha256Hex(line) });
  }

  return {
    family, pack, entry,
    /** Drops every decoded pack and abandons work in progress. Call on navigation away or memory pressure. */
    release() { generation++; packs.clear(); families.clear(); },
    decodedPacks: () => [...packs.keys()],
    timings: () => [...timings],
  };
}
export type BankLoader = ReturnType<typeof createBankLoader>;
