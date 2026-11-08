import { exactKeys, plain, asciiId, uint, hashId, jsonBytes } from '../state/saveBits';
import type { PuzzleRef } from '../state/challenge';
import { readers, type Reader } from './catalog';
export type Mistakes = 'Friendly' | 'Plain' | 'Rewind';
export type Preferences = { band: number; reader: Reader; mistakes: Mistakes; fillNotes: boolean };
export type Pin = { from: string; ref: PuzzleRef };
export type CoveLocal = { version: 1; lastPerson?: string; people: Record<string, Preferences>; favorites: string[]; hidden: string[]; pins: Record<string, Pin[]> };
export const defaults = (): Preferences => ({ band: 1, reader: 'Growing', mistakes: 'Friendly', fillNotes: false });
export const emptyLocal = (): CoveLocal => ({ version: 1, people: {}, favorites: [], hidden: [], pins: {} });
const owner = (v: unknown): v is string => asciiId(v, 40) && /^[a-z0-9-]+$/.test(v);
const ref = (v: unknown): v is PuzzleRef => plain(v) && exactKeys(v, ['bank', 'puzzle', 'engine', 'rules', 'hash']) && uint(v.bank, 511) && uint(v.puzzle, 1023) && asciiId(v.engine) && uint(v.rules, 65535) && v.rules > 0 && hashId(v.hash);
export function validLocal(v: unknown): v is CoveLocal {
  return plain(v) && (exactKeys(v, ['version', 'people', 'favorites', 'hidden', 'pins']) || exactKeys(v, ['version', 'people', 'favorites', 'hidden', 'pins', 'lastPerson']) && owner(v.lastPerson)) && v.version === 1 && jsonBytes(v) <= 32_000 && plain(v.people) && Object.keys(v.people).length <= 9 && Object.entries(v.people).every(([id, p]) => owner(id) && plain(p) && exactKeys(p, ['band', 'reader', 'mistakes', 'fillNotes']) && uint(p.band, 6) && p.band > 0 && readers.includes(p.reader as Reader) && ['Friendly', 'Plain', 'Rewind'].includes(p.mistakes as string) && typeof p.fillNotes === 'boolean' && (!p.fillNotes || p.reader === 'Grown-up')) && Array.isArray(v.favorites) && v.favorites.length <= 128 && new Set(v.favorites).size === v.favorites.length && v.favorites.every(id => asciiId(id)) && Array.isArray(v.hidden) && v.hidden.length <= 128 && new Set(v.hidden).size === v.hidden.length && v.hidden.every(hashId) && plain(v.pins) && Object.keys(v.pins).length <= 9 && Object.entries(v.pins).every(([id, pins]) => owner(id) && Array.isArray(pins) && pins.length <= 8 && pins.every(p => plain(p) && exactKeys(p, ['from', 'ref']) && owner(p.from) && ref(p.ref)) && new Set(pins.map(p => p.ref.hash)).size === pins.length);
}
export type LocalAction = { type: 'remember-person'; owner: string } | { type: 'prune'; owners: string[] } | { type: 'preferences'; owner: string; value: Partial<Preferences> } | { type: 'favorite'; game: string } | { type: 'hide'; hash: string } | { type: 'unhide' } | { type: 'pin'; to: string; pin: Pin } | { type: 'unpin'; owner: string; hash: string };
export function localAction(before: CoveLocal, action: LocalAction): CoveLocal {
  let next = before;
  if (action.type === 'prune') {
    const people = Object.fromEntries(Object.entries(before.people).filter(([id]) => action.owners.includes(id)));
    const pins = Object.fromEntries(Object.entries(before.pins).filter(([id]) => action.owners.includes(id)).map(([id, pins]) => [id, pins.filter(p => action.owners.includes(p.from))]));
    if (JSON.stringify(people) !== JSON.stringify(before.people) || JSON.stringify(pins) !== JSON.stringify(before.pins)) next = { ...before, people, pins };
  }
  if (action.type === 'remember-person') next = before.lastPerson === action.owner ? before : { ...before, lastPerson: action.owner };
  if (action.type === 'preferences') next = { ...before, people: { ...before.people, [action.owner]: { ...defaults(), ...before.people[action.owner], ...action.value } } };
  if (action.type === 'favorite') next = { ...before, favorites: before.favorites.includes(action.game) ? before.favorites.filter(g => g !== action.game) : [...before.favorites, action.game] };
  if (action.type === 'hide') next = { ...before, hidden: [...new Set([...before.hidden, action.hash])] };
  if (action.type === 'unhide') next = { ...before, hidden: [] };
  if (action.type === 'pin') {
    if ((before.pins[action.to]?.length ?? 0) >= 8 && !before.pins[action.to]?.some(p => p.ref.hash === action.pin.ref.hash)) return before;
    next = { ...before, pins: { ...before.pins, [action.to]: [...(before.pins[action.to] ?? []).filter(p => p.ref.hash !== action.pin.ref.hash), action.pin] } };
  }
  if (action.type === 'unpin') next = { ...before, pins: { ...before.pins, [action.owner]: (before.pins[action.owner] ?? []).filter(p => p.ref.hash !== action.hash) } };
  return validLocal(next) ? next : before;
}
export type LocalStorage = { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> };
/** Serialize whole preference writes, preserve malformed originals, publish only after durability. */
export function localRepository(storage: LocalStorage) {
  let queue: Promise<unknown> = Promise.resolve(), value = emptyLocal(), loaded = false, preserved: string | null = null;
  const subscribers = new Set<() => void>();
  const publish = () => { for (const listener of subscribers) listener(); };
  const preserve = async (raw: string) => { if (preserved === raw) return; await storage.set(`cove-preserved-${Date.now()}-${Math.random().toString(36).slice(2)}`, raw); preserved = raw; };
  const run = <T,>(f: () => Promise<T>) => { const next = queue.then(f); queue = next.catch(() => {}); return next; };
  return {
    subscribe: (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
    read: () => run(async () => {
      if (loaded) return value;
      const raw = await storage.get('cove-device-v1');
      if (raw !== null) {
        let parsed: unknown; try { parsed = JSON.parse(raw); } catch { parsed = null; }
        if (!validLocal(parsed)) {
          // Do not overwrite a future format, corrupt original, or an earlier preserved copy.
          await preserve(raw);
          throw new Error('Cove preferences could not load. The original has been kept. Your puzzle saves are unchanged.');
        }
        value = parsed;
      }
      loaded = true; return value;
    }),
    reset: () => run(async () => {
      const raw = await storage.get('cove-device-v1');
      if (raw !== null) await preserve(raw);
      const next = emptyLocal(); await storage.set('cove-device-v1', JSON.stringify(next)); value = next; loaded = true; publish(); return value;
    }),
    write: (action: LocalAction) => run(async () => {
      if (!loaded) throw new Error('Cove preferences have not loaded.');
      const next = localAction(value, action);
      if (next === value && (action.type === 'prune' || action.type === 'remember-person')) return value;
      if (next === value) throw new Error('This change could not be saved. Existing choices are kept.');
      await storage.set('cove-device-v1', JSON.stringify(next)); value = next; publish(); return value;
    }),
  };
}
